"""Async-friendly serial client for SQM devices.

Provides:
  - connect / disconnect (with a thread-pool executor for blocking I/O)
  - send_command (raw write/read)
  - high-level get_info / get_reading / get_calibration
  - reading loop generator for continuous streaming
  - mock implementation when SQM_MOCK=1
"""
from __future__ import annotations

import asyncio
import logging
import os
import random
import time
from dataclasses import dataclass
from typing import AsyncIterator, Optional

from .constants import (
    CMD_CAL_INFO,
    CMD_INFO,
    CMD_READING,
    CMD_UNAVG_READING,
    DEFAULT_BAUDRATE,
    DEFAULT_BYTESIZE,
    DEFAULT_PARITY,
    DEFAULT_STOPBITS,
    DEFAULT_TIMEOUT,
)
from .protocol import (
    CalibrationInfo,
    DeviceInfo,
    Reading,
    parse_calibration,
    parse_info,
    parse_reading,
)

logger = logging.getLogger(__name__)

try:
    import serial as pyserial  # type: ignore
except Exception:  # pragma: no cover
    pyserial = None  # type: ignore


def is_mock_mode() -> bool:
    return os.environ.get("SQM_MOCK", "0") in {"1", "true", "yes"}


# Internal alias retained for backward-compat
_is_mock_mode = is_mock_mode

# Backwards-compat constant (re-evaluated lazily where needed via is_mock_mode())
MOCK_MODE = is_mock_mode()


@dataclass
class ConnectionParams:
    port: str
    baudrate: int = DEFAULT_BAUDRATE
    bytesize: int = DEFAULT_BYTESIZE
    parity: str = DEFAULT_PARITY
    stopbits: int = DEFAULT_STOPBITS
    timeout: float = DEFAULT_TIMEOUT


class MockSerial:
    """Deterministic + slightly noisy mock for demo/testing without hardware."""

    def __init__(self, port: str):
        self.port = port
        self.is_open = True
        self._buf = b""
        self._t0 = time.time()
        # Choose model based on port name to mimic FTDI vs CH340
        self._is_diy = "CH340" in port.upper() or "DIY" in port.upper()

    def close(self):
        self.is_open = False

    def write(self, data: bytes) -> int:
        if not self.is_open:
            raise RuntimeError("port not open")
        # Generate a response immediately
        if data.startswith(b"ix"):
            if self._is_diy:
                resp = b"i,00000004,00000099,00000023,00009999\r\n"
            else:
                resp = b"i,00000004,00000003,00000023,00000413\r\n"
        elif data.startswith(b"rx") or data.startswith(b"ux"):
            # produce a realistic dark-sky mpsas with slow oscillation
            t = time.time() - self._t0
            mpsas = 19.20 + 0.6 * (0.5 + 0.5 * (1 if int(t) % 2 == 0 else -1)) \
                + 0.05 * random.uniform(-1, 1)
            freq = max(1.0, 22000.0 - (mpsas - 18.0) * 6000.0) + random.uniform(-50, 50)
            counts = int(freq * 1.04)
            period = 1.0 / max(0.001, freq)
            temp = 18.0 + 4.0 * random.uniform(-1, 1)
            resp = (
                f"r,{mpsas:6.2f}m,{int(freq):010d}Hz,{counts:010d}c,{period:11.3f}s,{temp:6.1f}C\r\n"
            ).encode("ascii")
        elif data.startswith(b"cx"):
            resp = (
                b"c,00000019.60m,0000000.000s, 039.4C,00000008.71m, 039.4C\r\n"
            )
        elif data.startswith(b"Ix"):
            resp = b"I,00000060\r\n"  # 60s interval
        elif data.startswith(b"L"):
            resp = b"L,OK\r\n"
        elif data.startswith(b"zcal"):
            resp = b"z,OK\r\n"
        else:
            resp = b"?,UNKNOWN\r\n"
        self._buf += resp
        return len(data)

    def read_until(self, terminator: bytes = b"\n", size: Optional[int] = None) -> bytes:
        idx = self._buf.find(terminator)
        if idx < 0:
            data, self._buf = self._buf, b""
            return data
        end = idx + len(terminator)
        data, self._buf = self._buf[:end], self._buf[end:]
        return data

    def reset_input_buffer(self):
        self._buf = b""

    def reset_output_buffer(self):
        pass


class SQMSerialClient:
    def __init__(self) -> None:
        self._serial = None
        self._params: Optional[ConnectionParams] = None
        self._lock = asyncio.Lock()

    @property
    def connected(self) -> bool:
        return self._serial is not None and getattr(self._serial, "is_open", False)

    @property
    def params(self) -> Optional[ConnectionParams]:
        return self._params

    async def connect(self, params: ConnectionParams) -> None:
        async with self._lock:
            await self._connect_sync(params)

    async def _connect_sync(self, params: ConnectionParams) -> None:
        def _open():
            if MOCK_MODE or "MOCK" in params.port.upper():
                return MockSerial(params.port)
            if pyserial is None:
                raise RuntimeError("pyserial is not installed on the server")
            return pyserial.Serial(
                port=params.port,
                baudrate=params.baudrate,
                bytesize=params.bytesize,
                parity=params.parity,
                stopbits=params.stopbits,
                timeout=params.timeout,
            )

        if self.connected:
            await self._disconnect_sync()
        loop = asyncio.get_running_loop()
        self._serial = await loop.run_in_executor(None, _open)
        self._params = params
        logger.info("Opened serial port %s @ %d", params.port, params.baudrate)

    async def disconnect(self) -> None:
        async with self._lock:
            await self._disconnect_sync()

    async def _disconnect_sync(self) -> None:
        ser = self._serial
        self._serial = None
        self._params = None
        if ser is None:
            return
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, ser.close)
        logger.info("Serial port closed")

    async def send_raw(self, command: bytes, read_terminator: bytes = b"\n", read_timeout: float = 2.0) -> str:
        if not self.connected:
            raise RuntimeError("Not connected")

        def _io():
            ser = self._serial
            ser.reset_input_buffer()
            ser.write(command)
            try:
                ser.flush()
            except Exception:
                pass
            data = ser.read_until(read_terminator)
            return data.decode("ascii", errors="replace")

        loop = asyncio.get_running_loop()
        async with self._lock:
            return await loop.run_in_executor(None, _io)

    async def get_info(self) -> DeviceInfo:
        resp = await self.send_raw(CMD_INFO + b"")
        return parse_info(resp)

    async def get_reading(self, averaged: bool = True) -> Reading:
        cmd = CMD_READING if averaged else CMD_UNAVG_READING
        resp = await self.send_raw(cmd)
        return parse_reading(resp)

    async def get_calibration(self) -> CalibrationInfo:
        resp = await self.send_raw(CMD_CAL_INFO)
        return parse_calibration(resp)

    async def stream_readings(self, interval_seconds: float = 1.0) -> AsyncIterator[Reading]:
        """Continuously yield readings every `interval_seconds`. Stops when disconnected."""
        while self.connected:
            try:
                r = await self.get_reading(averaged=True)
                r.timestamp = _utcnow_iso()
                yield r
            except Exception as e:
                logger.warning("reading error: %s", e)
            await asyncio.sleep(interval_seconds)


def _utcnow_iso() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()

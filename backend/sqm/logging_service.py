"""Continuous logging of SQM readings to CSV or DAT files.

Writes a Unihedron-compatible header by default. Files are written under
the configured log directory and a session can be started/stopped via the API.
"""
from __future__ import annotations

import asyncio
import csv
import logging
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from .protocol import Reading
from .serial_client import SQMSerialClient

logger = logging.getLogger(__name__)

LOG_DIR_DEFAULT = Path(os.environ.get("SQM_LOG_DIR", "/tmp/udm_fork_logs"))
LOG_DIR_DEFAULT.mkdir(parents=True, exist_ok=True)


@dataclass
class LoggingSession:
    file_path: str
    format: str  # 'csv' | 'dat'
    interval_seconds: int
    started_at: str
    samples: int = 0
    last_sample: Optional[dict] = None
    active: bool = True

    def to_dict(self) -> dict:
        return {
            "file_path": self.file_path,
            "format": self.format,
            "interval_seconds": self.interval_seconds,
            "started_at": self.started_at,
            "samples": self.samples,
            "last_sample": self.last_sample,
            "active": self.active,
        }


@dataclass
class LogMetadata:
    """User-supplied metadata written into the canonical Unihedron DAT header.

    See darksky.org Light Pollution Monitoring Data Format 1.0.
    """
    instrument_id: str = ""
    data_supplier: str = ""
    location_name: str = ""
    position: str = ""  # "lat, lon, elev(m)"
    local_timezone: str = ""
    time_sync: str = ""
    moving_stationary_position: str = "STATIONARY"
    moving_fixed_direction: str = "FIXED"
    number_of_channels: int = 1
    filters_per_channel: str = "HOYA CM-500"
    measurement_direction_per_channel: str = "0z, 0az"
    field_of_view_degrees: float = 20.0
    cover_offset_value: float = 0.0
    comments: list = field(default_factory=list)


class LoggingService:
    def __init__(self, client: SQMSerialClient):
        self._client = client
        self._task: Optional[asyncio.Task] = None
        self._session: Optional[LoggingSession] = None
        self._stop_event: Optional[asyncio.Event] = None
        self._listeners: list[asyncio.Queue] = []
        self._metadata: LogMetadata = LogMetadata()

    @property
    def session(self) -> Optional[LoggingSession]:
        return self._session

    @property
    def metadata(self) -> LogMetadata:
        return self._metadata

    def update_metadata(self, **kwargs) -> LogMetadata:
        for k, v in kwargs.items():
            if hasattr(self._metadata, k) and v is not None:
                setattr(self._metadata, k, v)
        return self._metadata

    def add_listener(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=512)
        self._listeners.append(q)
        return q

    def remove_listener(self, q: asyncio.Queue) -> None:
        try:
            self._listeners.remove(q)
        except ValueError:
            pass

    async def _broadcast(self, event: dict) -> None:
        dead = []
        for q in list(self._listeners):
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                dead.append(q)
        for q in dead:
            self.remove_listener(q)

    async def _write_canonical_dat_header(self, f, interval_seconds: int) -> None:
        """Write the standard Unihedron DAT header (Light Pollution Monitoring Data Format 1.0)."""
        m = self._metadata
        # Try to fetch device info for instrument-specific fields
        ix_resp = rx_resp = cx_resp = Ix_resp = ""
        try:
            from .protocol import parse_info
            ix_resp = await self._client.send_raw(b"ix")
            rx_resp = await self._client.send_raw(b"rx")
            cx_resp = await self._client.send_raw(b"cx")
            Ix_resp = await self._client.send_raw(b"Ix")
        except Exception:
            pass

        def w(line: str) -> None:
            f.write(line + "\r\n")

        w("# Light Pollution Monitoring Data Format 1.0")
        w("# URL: https://darksky.org/app/uploads/bsk-pdf-manager/47_SKYGLOW_DEFINITIONS.PDF")
        w("# This data is released under the following license: ODbL 1.0 http://opendatacommons.org/licenses/odbl/summary/")
        w(f"# Device type: SQM (UDM Fork)")
        w(f"# Instrument ID: {m.instrument_id}")
        w(f"# Data supplier: {m.data_supplier}")
        w(f"# Location name: {m.location_name}")
        w(f"# Position (lat, lon, elev(m)): {m.position}")
        w(f"# Local timezone: {m.local_timezone}")
        w(f"# Time Synchronization: {m.time_sync}")
        w(f"# Moving / Stationary position: {m.moving_stationary_position}")
        w(f"# Moving / Fixed look direction: {m.moving_fixed_direction}")
        w(f"# Number of channels: {m.number_of_channels}")
        w(f"# Filters per channel: {m.filters_per_channel}")
        w(f"# Measurement direction per channel: {m.measurement_direction_per_channel}")
        w(f"# Field of view (degrees): {m.field_of_view_degrees}")
        w("# Number of fields per line: 6")
        w(f"# SQM cover offset value: {m.cover_offset_value}")
        w(f"# SQM readout test ix (Information): {ix_resp.strip()}")
        w(f"# SQM readout test rx (Reading): {rx_resp.strip()}")
        w(f"# SQM readout test cx (Calibration): {cx_resp.strip()}")
        w(f"# SQM readout test Ix (Report Interval): {Ix_resp.strip()}")
        w(f"# Logging interval (seconds): {interval_seconds}")
        for c in (m.comments or [""] * 5)[:5]:
            w(f"# Comment: {c}")
        w("# UDM version: UDM Fork 1.0.0")
        w("# blank line")
        w("# UTC Date & Time, Local Date & Time, Temperature, Counts, Frequency, MSAS")
        w("# YYYY-MM-DDTHH:mm:ss.fff;YYYY-MM-DDTHH:mm:ss.fff;Celsius;number;Hz;mag/arcsec^2")
        f.flush()

    async def start(self, interval_seconds: int = 1, fmt: str = "csv", base_name: Optional[str] = None) -> LoggingSession:
        if self._task and not self._task.done():
            raise RuntimeError("Logging already running")
        if not self._client.connected:
            raise RuntimeError("Not connected to a device")
        ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        ext = "dat" if fmt == "dat" else "csv"
        name = base_name or f"sqm_{ts}.{ext}"
        path = LOG_DIR_DEFAULT / name
        f = open(path, "w", newline="", encoding="utf-8")

        if ext == "dat":
            # Canonical Unihedron DAT header + semicolon-separated records
            await self._write_canonical_dat_header(f, interval_seconds)
            writer = None  # we'll write records manually for DAT
        else:
            writer = csv.writer(f, delimiter=",")
            writer.writerow([
                "timestamp_utc",
                "mpsas",
                "frequency_hz",
                "counts",
                "period_s",
                "temperature_c",
                "raw",
            ])
            f.flush()

        self._session = LoggingSession(
            file_path=str(path),
            format=ext,
            interval_seconds=interval_seconds,
            started_at=datetime.now(timezone.utc).isoformat(),
        )
        self._stop_event = asyncio.Event()

        async def _run():
            try:
                while not self._stop_event.is_set() and self._client.connected:
                    try:
                        r: Reading = await self._client.get_reading(averaged=True)
                        r.timestamp = datetime.now(timezone.utc).isoformat()
                        if writer is None:
                            # DAT canonical record: UTC;Local;Temperature;Counts;Frequency;MSAS
                            from datetime import datetime as _dt
                            utc = _dt.now(timezone.utc)
                            local = utc.astimezone()
                            utc_s = utc.strftime("%Y-%m-%dT%H:%M:%S.") + f"{utc.microsecond//1000:03d}"
                            local_s = local.strftime("%Y-%m-%dT%H:%M:%S.") + f"{local.microsecond//1000:03d}"
                            line = ";".join([
                                utc_s,
                                local_s,
                                f"{r.temperature_c:.1f}" if r.temperature_c is not None else "",
                                str(r.counts) if r.counts is not None else "",
                                f"{r.frequency_hz:.3f}" if r.frequency_hz is not None else "",
                                f"{r.mpsas:.2f}" if r.mpsas is not None else "",
                            ])
                            f.write(line + "\r\n")
                        else:
                            writer.writerow([
                                r.timestamp,
                                r.mpsas,
                                r.frequency_hz,
                                r.counts,
                                r.period_s,
                                r.temperature_c,
                                (r.raw or "").strip(),
                            ])
                        f.flush()
                        self._session.samples += 1
                        self._session.last_sample = r.to_dict()
                        await self._broadcast({
                            "type": "reading",
                            "reading": r.to_dict(),
                            "session": self._session.to_dict(),
                        })
                    except Exception as e:
                        logger.warning("logging tick error: %s", e)
                        await self._broadcast({"type": "error", "message": str(e)})
                    try:
                        await asyncio.wait_for(self._stop_event.wait(), timeout=interval_seconds)
                    except asyncio.TimeoutError:
                        pass
            finally:
                try:
                    f.close()
                except Exception:
                    pass
                if self._session is not None:
                    self._session.active = False
                    await self._broadcast({"type": "stopped", "session": self._session.to_dict()})

        self._task = asyncio.create_task(_run())
        await self._broadcast({"type": "started", "session": self._session.to_dict()})
        return self._session

    async def stop(self) -> Optional[LoggingSession]:
        if self._stop_event:
            self._stop_event.set()
        if self._task:
            try:
                await asyncio.wait_for(self._task, timeout=5.0)
            except asyncio.TimeoutError:
                self._task.cancel()
        s = self._session
        if s:
            s.active = False
        return s

    def list_sessions(self) -> list[dict]:
        out = []
        for p in sorted(LOG_DIR_DEFAULT.glob("sqm_*.*"), reverse=True):
            try:
                stat = p.stat()
                out.append({
                    "name": p.name,
                    "path": str(p),
                    "size_bytes": stat.st_size,
                    "modified": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
                })
            except FileNotFoundError:
                continue
        return out

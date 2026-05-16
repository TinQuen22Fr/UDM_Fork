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


class LoggingService:
    def __init__(self, client: SQMSerialClient):
        self._client = client
        self._task: Optional[asyncio.Task] = None
        self._session: Optional[LoggingSession] = None
        self._stop_event: Optional[asyncio.Event] = None
        self._listeners: list[asyncio.Queue] = []

    @property
    def session(self) -> Optional[LoggingSession]:
        return self._session

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

    async def start(self, interval_seconds: int = 1, fmt: str = "csv", base_name: Optional[str] = None) -> LoggingSession:
        if self._task and not self._task.done():
            raise RuntimeError("Logging already running")
        if not self._client.connected:
            raise RuntimeError("Not connected to a device")
        ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        ext = "dat" if fmt == "dat" else "csv"
        name = base_name or f"sqm_{ts}.{ext}"
        path = LOG_DIR_DEFAULT / name
        # Open the file synchronously then write header
        f = open(path, "w", newline="", encoding="utf-8")
        writer = csv.writer(f, delimiter=";" if ext == "dat" else ",")
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

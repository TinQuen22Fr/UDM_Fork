"""UDM Fork - Sky Quality Meter — FastAPI backend.

Endpoints (all prefixed with /api):
  GET  /                       Health
  GET  /ports                  Enumerate serial ports (FTDI + CH340 detected)
  GET  /device/status          Current connection status
  POST /device/connect         Connect to a serial port
  POST /device/disconnect      Disconnect from current port
  GET  /device/info            Device info (ix)
  GET  /device/reading         Reading (rx or ux)
  GET  /device/calibration     Calibration info (cx)
  POST /device/command         Send raw command, returns response
  POST /device/interval        Set logging interval (Lxxxxxxxxx)
  POST /device/calibrate       Calibration action (arm/disarm)
  POST /logging/start          Start CSV/DAT logging
  POST /logging/stop           Stop logging
  GET  /logging/status         Current logging session
  GET  /logging/sessions       List previously written log files
  GET  /logging/download/{name} Download a log file
  POST /firmware/upload        Upload a firmware file (stages it for flashing)
  POST /firmware/flash         Start a flash job (uses esptool if available)
  GET  /firmware/status        Flash job status
  WS   /ws/telemetry           Real-time stream of readings + logging events
  GET  /system/info            System info (platform, mock mode, log dir)
"""
from __future__ import annotations

import asyncio
import logging
import os
import platform
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from fastapi import (
    APIRouter,
    FastAPI,
    File,
    HTTPException,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Optional MongoDB (kept for preferences/profile persistence)
from motor.motor_asyncio import AsyncIOMotorClient

from sqm.constants import (
    DEFAULT_BAUDRATE,
    DEFAULT_BYTESIZE,
    DEFAULT_PARITY,
    DEFAULT_STOPBITS,
    cmd_set_dark_cal_period,
    cmd_set_dark_cal_temperature,
    cmd_set_interval_seconds,
    cmd_set_light_cal_offset,
    cmd_set_light_cal_temperature,
)
from sqm.discovery import enumerate_serial_ports
from sqm.logging_service import LOG_DIR_DEFAULT, LoggingService
from sqm.serial_client import ConnectionParams, MOCK_MODE, SQMSerialClient, is_mock_mode

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("udm_fork")

# Mongo (preferences only — optional)
mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
db_name = os.environ.get("DB_NAME", "udm_fork")
mongo_client = AsyncIOMotorClient(mongo_url)
db = mongo_client[db_name]

app = FastAPI(title="UDM Fork — Sky Quality Meter", version="1.0.0")
api = APIRouter(prefix="/api")

# Single client instance shared across requests
client = SQMSerialClient()
logging_service = LoggingService(client)


# ---------- Models ----------

class ConnectRequest(BaseModel):
    port: str
    baudrate: int = DEFAULT_BAUDRATE
    bytesize: int = DEFAULT_BYTESIZE
    parity: str = DEFAULT_PARITY
    stopbits: int = DEFAULT_STOPBITS
    timeout: float = 2.0


class CommandRequest(BaseModel):
    command: str = Field(..., description="ASCII command, e.g. 'rx', 'ix', 'cx'")
    timeout: float = 2.0


class IntervalRequest(BaseModel):
    seconds: int = Field(..., ge=0, le=99999)


class CalibrateRequest(BaseModel):
    action: str = Field(..., description="'arm_light' | 'arm_dark' | 'disarm'")


class CalSetRequest(BaseModel):
    light_offset_mpsas: Optional[float] = None
    light_temperature_c: Optional[float] = None
    dark_period_s: Optional[float] = None
    dark_temperature_c: Optional[float] = None


class LogMetadataRequest(BaseModel):
    instrument_id: Optional[str] = None
    data_supplier: Optional[str] = None
    location_name: Optional[str] = None
    position: Optional[str] = None
    local_timezone: Optional[str] = None
    time_sync: Optional[str] = None
    moving_stationary_position: Optional[str] = None
    moving_fixed_direction: Optional[str] = None
    number_of_channels: Optional[int] = None
    filters_per_channel: Optional[str] = None
    measurement_direction_per_channel: Optional[str] = None
    field_of_view_degrees: Optional[float] = None
    cover_offset_value: Optional[float] = None
    comments: Optional[list] = None


class LoggingStartRequest(BaseModel):
    interval_seconds: int = Field(1, ge=1, le=3600)
    format: str = Field("csv", description="'csv' | 'dat'")
    base_name: Optional[str] = None


class FlashRequest(BaseModel):
    file_name: str
    baud: int = 460800
    target_port: Optional[str] = None  # if missing, use current connection port


# ---------- Helpers ----------

def _status_dict() -> dict:
    p = client.params
    return {
        "connected": client.connected,
        "mock_mode": is_mock_mode(),
        "port": p.port if p else None,
        "baudrate": p.baudrate if p else None,
        "bytesize": p.bytesize if p else None,
        "parity": p.parity if p else None,
        "stopbits": p.stopbits if p else None,
    }


# ---------- Routes ----------

@api.get("/")
async def root():
    return {
        "app": "UDM Fork — Sky Quality Meter",
        "version": app.version,
        "mock_mode": is_mock_mode(),
        "time": datetime.now(timezone.utc).isoformat(),
    }


@api.get("/system/info")
async def system_info():
    return {
        "app": app.title,
        "version": app.version,
        "python": sys.version.split()[0],
        "platform": platform.platform(),
        "node": platform.node(),
        "mock_mode": is_mock_mode(),
        "log_directory": str(LOG_DIR_DEFAULT),
        "has_pyudev": _has("pyudev"),
        "has_pyserial": _has("serial"),
        "has_esptool": _find_esptool()[0] is not None,
    }


def _has(mod: str) -> bool:
    try:
        __import__(mod)
        return True
    except Exception:
        return False


@api.get("/ports")
async def list_ports(only_sqm: bool = False):
    ports = enumerate_serial_ports(only_sqm=only_sqm)
    return {"ports": [p.to_dict() for p in ports], "count": len(ports), "mock_mode": is_mock_mode()}


@api.get("/device/status")
async def device_status():
    return _status_dict()


@api.post("/device/connect")
async def device_connect(req: ConnectRequest):
    try:
        params = ConnectionParams(
            port=req.port,
            baudrate=req.baudrate,
            bytesize=req.bytesize,
            parity=req.parity,
            stopbits=req.stopbits,
            timeout=req.timeout,
        )
        await client.connect(params)
        # try to fetch info on connection for convenience
        info = None
        try:
            d = await client.get_info()
            info = d.to_dict()
        except Exception as e:
            logger.warning("get_info on connect failed: %s", e)
        return {"ok": True, "status": _status_dict(), "info": info}
    except Exception as e:
        logger.exception("connect failed")
        raise HTTPException(status_code=400, detail=f"Connect failed: {e}")


@api.post("/device/disconnect")
async def device_disconnect():
    try:
        # If logging is running, stop it first
        if logging_service.session and logging_service.session.active:
            await logging_service.stop()
        await client.disconnect()
        return {"ok": True, "status": _status_dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Disconnect failed: {e}")


@api.get("/device/info")
async def device_info():
    _require_connected()
    info = await client.get_info()
    return info.to_dict()


@api.get("/device/reading")
async def device_reading(averaged: bool = True):
    _require_connected()
    r = await client.get_reading(averaged=averaged)
    return r.to_dict()


@api.get("/device/calibration")
async def device_calibration():
    _require_connected()
    c = await client.get_calibration()
    return c.to_dict()


@api.post("/device/command")
async def device_command(req: CommandRequest):
    _require_connected()
    try:
        resp = await client.send_raw(req.command.encode("ascii"), read_timeout=req.timeout)
        return {"command": req.command, "response": resp}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Command failed: {e}")


@api.post("/device/interval")
async def device_set_interval(req: IntervalRequest):
    _require_connected()
    cmd = cmd_set_interval_seconds(req.seconds)
    resp = await client.send_raw(cmd)
    return {"sent": cmd.decode("ascii"), "response": resp}


@api.post("/device/calibrate")
async def device_calibrate(req: CalibrateRequest):
    _require_connected()
    if req.action == "arm_light":
        resp = await client.send_raw(b"zcalAx")
    elif req.action == "arm_dark":
        resp = await client.send_raw(b"zcalBx")
    elif req.action == "disarm":
        resp = await client.send_raw(b"zcalDx")
    else:
        raise HTTPException(status_code=400, detail="action must be 'arm_light', 'arm_dark' or 'disarm'")
    return {"action": req.action, "response": resp}


@api.post("/device/calibration/set")
async def device_calibration_set(req: CalSetRequest):
    """Manually write calibration registers (zcal5/6/7/8)."""
    _require_connected()
    sent = []
    if req.light_offset_mpsas is not None:
        sent.append({"cmd": "zcal5", "response": await client.send_raw(cmd_set_light_cal_offset(req.light_offset_mpsas))})
    if req.light_temperature_c is not None:
        sent.append({"cmd": "zcal6", "response": await client.send_raw(cmd_set_light_cal_temperature(req.light_temperature_c))})
    if req.dark_period_s is not None:
        sent.append({"cmd": "zcal7", "response": await client.send_raw(cmd_set_dark_cal_period(req.dark_period_s))})
    if req.dark_temperature_c is not None:
        sent.append({"cmd": "zcal8", "response": await client.send_raw(cmd_set_dark_cal_temperature(req.dark_temperature_c))})
    return {"results": sent}


@api.get("/device/clock")
async def device_clock():
    """Read on-device RTC (DL models)."""
    _require_connected()
    resp = await client.send_raw(b"Lcx")
    return {"response": resp.strip()}


@api.get("/device/dl_settings")
async def device_dl_settings():
    """Read DL trigger mode + thresholds."""
    _require_connected()
    mode = await client.send_raw(b"Lmx")
    settings = await client.send_raw(b"LIx")
    return {"trigger_mode": mode.strip(), "trigger_settings": settings.strip()}


# --- Log metadata (DL Header form) ---

@api.get("/logging/metadata")
async def logging_get_metadata():
    m = logging_service.metadata
    return {
        k: getattr(m, k)
        for k in (
            "instrument_id", "data_supplier", "location_name", "position",
            "local_timezone", "time_sync", "moving_stationary_position",
            "moving_fixed_direction", "number_of_channels", "filters_per_channel",
            "measurement_direction_per_channel", "field_of_view_degrees",
            "cover_offset_value", "comments",
        )
    }


@api.post("/logging/metadata")
async def logging_set_metadata(req: LogMetadataRequest):
    logging_service.update_metadata(**req.model_dump(exclude_none=True))
    return await logging_get_metadata()


# ---------- Logging ----------

@api.post("/logging/start")
async def logging_start(req: LoggingStartRequest):
    _require_connected()
    try:
        sess = await logging_service.start(
            interval_seconds=req.interval_seconds,
            fmt=req.format,
            base_name=req.base_name,
        )
        return sess.to_dict()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@api.post("/logging/stop")
async def logging_stop():
    sess = await logging_service.stop()
    return sess.to_dict() if sess else {"active": False}


@api.get("/logging/status")
async def logging_status():
    s = logging_service.session
    return s.to_dict() if s else {"active": False}


@api.get("/logging/sessions")
async def logging_sessions():
    return {"sessions": logging_service.list_sessions()}


@api.get("/logging/download/{name}")
async def logging_download(name: str):
    safe = Path(name).name
    full = LOG_DIR_DEFAULT / safe
    if not full.exists():
        raise HTTPException(status_code=404, detail="not found")
    return FileResponse(str(full), filename=safe, media_type="text/csv")


# ---------- Firmware ----------

FIRMWARE_DIR = Path(os.environ.get("SQM_FIRMWARE_DIR", "/tmp/udm_fork_firmware"))
FIRMWARE_DIR.mkdir(parents=True, exist_ok=True)

_flash_state = {
    "running": False,
    "progress": 0,
    "stage": "idle",
    "log": "",
    "result": None,
    "started_at": None,
    "finished_at": None,
}


@api.post("/firmware/upload")
async def firmware_upload(file: UploadFile = File(...)):
    safe = Path(file.filename or "firmware.bin").name
    dst = FIRMWARE_DIR / safe
    with open(dst, "wb") as out:
        out.write(await file.read())
    return {"name": safe, "size_bytes": dst.stat().st_size, "path": str(dst)}


@api.get("/firmware/list")
async def firmware_list():
    items = []
    for f in sorted(FIRMWARE_DIR.glob("*")):
        if f.is_file():
            items.append({"name": f.name, "size_bytes": f.stat().st_size, "path": str(f)})
    return {"files": items}


@api.get("/firmware/status")
async def firmware_status():
    return _flash_state


def _find_esptool() -> tuple[list[str] | None, str]:
    """Locate an esptool we can invoke.

    Returns a tuple (argv_prefix, label):
      - argv_prefix is a list that prefixes esptool args, e.g.
        ['/path/to/esptool'] or [sys.executable, '-m', 'esptool'].
      - label is a human-readable identifier of which one was picked.
    """
    # 1) Prefer the esptool installed in the same venv as the backend
    venv_dir = os.path.dirname(sys.executable)
    for name in ("esptool", "esptool.py"):
        candidate = os.path.join(venv_dir, name)
        if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
            return [candidate], candidate
    # 2) Anywhere on PATH
    for name in ("esptool", "esptool.py"):
        found = shutil.which(name)
        if found:
            return [found], found
    # 3) Last resort: invoke as a Python module from this same interpreter
    try:
        import esptool  # noqa: F401
        return [sys.executable, "-m", "esptool"], f"{sys.executable} -m esptool"
    except Exception:
        return None, ""


@api.post("/firmware/flash")
async def firmware_flash(req: FlashRequest):
    """Flash a firmware file using esptool (auto-detected from venv or PATH)."""
    if _flash_state["running"]:
        raise HTTPException(status_code=409, detail="A flash job is already running")
    fw = FIRMWARE_DIR / Path(req.file_name).name
    if not fw.exists():
        raise HTTPException(status_code=404, detail="firmware file not found")

    target_port = req.target_port or (client.params.port if client.params else None)
    if not target_port:
        raise HTTPException(status_code=400, detail="No target port (connect first or provide target_port)")

    # If a port is currently in use, free it
    if client.connected and target_port == (client.params.port if client.params else None):
        await client.disconnect()

    esptool_argv, esptool_label = _find_esptool()
    if not esptool_argv:
        raise HTTPException(
            status_code=400,
            detail="esptool not installed. Run: ./udm-fork install  (or 'pip install esptool' in backend/.venv)",
        )

    _flash_state.update(
        {
            "running": True,
            "progress": 0,
            "stage": "starting",
            "log": "",
            "result": None,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "finished_at": None,
        }
    )

    async def _run():
        try:
            cmd = [
                *esptool_argv,
                "--chip",
                "auto",
                "--port",
                target_port,
                "--baud",
                str(req.baud),
                "write_flash",
                "0x0",
                str(fw),
            ]
            _flash_state["stage"] = f"flashing (via {esptool_label})"
            proc = await asyncio.create_subprocess_exec(
                *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT
            )
            assert proc.stdout is not None
            buf = []
            while True:
                line = await proc.stdout.readline()
                if not line:
                    break
                txt = line.decode("utf-8", errors="replace")
                buf.append(txt)
                _flash_state["log"] = "".join(buf[-200:])
                # Heuristic progress from esptool output
                if "Writing at" in txt and "%" in txt:
                    try:
                        pct = int(txt.split("(")[-1].split("%")[0].strip())
                        _flash_state["progress"] = pct
                    except Exception:
                        pass
            rc = await proc.wait()
            _flash_state["progress"] = 100 if rc == 0 else _flash_state["progress"]
            _flash_state["stage"] = "done" if rc == 0 else "error"
            _flash_state["result"] = {"return_code": rc}
        except Exception as e:
            _flash_state["stage"] = "error"
            _flash_state["log"] += f"\nEXCEPTION: {e}\n"
            _flash_state["result"] = {"error": str(e)}
        finally:
            _flash_state["running"] = False
            _flash_state["finished_at"] = datetime.now(timezone.utc).isoformat()

    asyncio.create_task(_run())
    return {"ok": True, "state": _flash_state}


# ---------- WebSocket ----------

@app.websocket("/api/ws/telemetry")
async def ws_telemetry(ws: WebSocket):
    await ws.accept()
    q = logging_service.add_listener()
    streamer_task: Optional[asyncio.Task] = None
    stop_event = asyncio.Event()

    async def _stream_readings():
        """If not actively logging, still stream readings 1Hz so the chart updates."""
        while not stop_event.is_set():
            try:
                if client.connected and not (logging_service.session and logging_service.session.active):
                    r = await client.get_reading(averaged=True)
                    r.timestamp = datetime.now(timezone.utc).isoformat()
                    await ws.send_json({"type": "reading", "reading": r.to_dict()})
            except Exception:
                pass
            try:
                await asyncio.wait_for(stop_event.wait(), timeout=1.0)
            except asyncio.TimeoutError:
                pass

    try:
        streamer_task = asyncio.create_task(_stream_readings())
        # Also forward logging events
        while True:
            event = await q.get()
            await ws.send_json(event)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.debug("ws closed with error: %s", e)
    finally:
        stop_event.set()
        if streamer_task:
            streamer_task.cancel()
        logging_service.remove_listener(q)


def _require_connected():
    if not client.connected:
        raise HTTPException(status_code=409, detail="Device not connected. Use /api/device/connect first.")


# ---------- App config ----------

app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_event():
    try:
        if logging_service.session and logging_service.session.active:
            await logging_service.stop()
        if client.connected:
            await client.disconnect()
    except Exception:
        pass
    mongo_client.close()

"""Parsers for the Unihedron SQM serial protocol responses.

The protocol is documented by Unihedron in the "SQM-LU Comms" and similar
PDFs. We parse the standard ASCII comma-separated responses returned by:
  - ix : info
  - rx : reading
  - cx : calibration info
  - ux : un-averaged reading
  - Ix : current logging interval

Response examples (Unihedron documentation):
  rx: 'r, 19.16m,0000022921Hz,0000000020c,0000000.000s, 022.4C'
  ix: 'i,00000004,00000003,00000023,00000413'   # protocol, model, feature, serial
  cx: 'c,00000019.60m,0000000.000s, 039.4C,00000008.71m, 039.4C'

We also accept reasonable variations from DIY firmwares that follow the same
format (mpsas + Hz + counts + period + temperature).
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field, asdict
from typing import Optional

logger = logging.getLogger(__name__)

_NUM = r"[-+]?[0-9]*\.?[0-9]+"


@dataclass
class DeviceInfo:
    protocol_number: Optional[int] = None
    model_number: Optional[int] = None
    feature_number: Optional[int] = None
    serial_number: Optional[int] = None
    mac_address: Optional[str] = None
    raw: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class Reading:
    mpsas: Optional[float] = None  # mag/arcsec^2 (sky brightness)
    frequency_hz: Optional[float] = None  # Hz
    counts: Optional[int] = None  # period counts
    period_s: Optional[float] = None  # period in seconds
    temperature_c: Optional[float] = None  # °C
    raw: Optional[str] = None
    timestamp: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class CalibrationInfo:
    light_calibration_mpsas: Optional[float] = None
    light_calibration_period_s: Optional[float] = None
    light_calibration_temperature_c: Optional[float] = None
    dark_calibration_mpsas: Optional[float] = None
    dark_calibration_temperature_c: Optional[float] = None
    offset_mpsas: Optional[float] = None
    raw: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)


def _to_float(s: str) -> Optional[float]:
    try:
        return float(s)
    except Exception:
        return None


def _to_int(s: str) -> Optional[int]:
    try:
        return int(s.lstrip("0") or "0")
    except Exception:
        return None


def parse_info(response: str) -> DeviceInfo:
    """Parse 'i,protocol,model,feature,serial[,mac]'."""
    info = DeviceInfo(raw=response.strip())
    parts = [p.strip() for p in response.replace("\r", "").replace("\n", "").split(",")]
    # First token should be 'i'
    if not parts:
        return info
    if parts[0].lower().startswith("i"):
        parts = parts[1:]
    if len(parts) >= 1:
        info.protocol_number = _to_int(parts[0])
    if len(parts) >= 2:
        info.model_number = _to_int(parts[1])
    if len(parts) >= 3:
        info.feature_number = _to_int(parts[2])
    if len(parts) >= 4:
        info.serial_number = _to_int(parts[3])
    if len(parts) >= 5:
        # Some firmwares append a MAC for Ethernet/WiFi models
        candidate = parts[4]
        if re.match(r"^([0-9A-Fa-f]{2}[:\-]){5}[0-9A-Fa-f]{2}$", candidate):
            info.mac_address = candidate.upper().replace("-", ":")
    return info


def parse_reading(response: str) -> Reading:
    """Parse a reading response (rx or ux).

    Format: 'r,<mpsas>m,<freq>Hz,<counts>c,<period>s,<temp>C'
    """
    reading = Reading(raw=response.strip())
    text = response.replace("\r", "").replace("\n", "")
    # Locate numbers followed by units anywhere in the string
    m = re.search(rf"({_NUM})\s*m(?:[,\s]|$)", text)
    if m:
        reading.mpsas = _to_float(m.group(1))
    m = re.search(rf"({_NUM})\s*Hz", text, re.IGNORECASE)
    if m:
        reading.frequency_hz = _to_float(m.group(1))
    m = re.search(rf"({_NUM})\s*c(?:[,\s]|$)", text)
    if m:
        reading.counts = _to_int(m.group(1))
    m = re.search(rf"({_NUM})\s*s(?:[,\s]|$)", text)
    if m:
        reading.period_s = _to_float(m.group(1))
    m = re.search(rf"({_NUM})\s*C\b", text)
    if m:
        reading.temperature_c = _to_float(m.group(1))
    return reading


def parse_calibration(response: str) -> CalibrationInfo:
    """Parse cx calibration response.

    Format (typical): 'c,<lightCal_mpsas>m,<lightCal_period>s,<lightCal_temp>C,<darkCal_mpsas>m,<darkCal_temp>C'
    """
    cal = CalibrationInfo(raw=response.strip())
    text = response.replace("\r", "").replace("\n", "")
    # Extract pairs of value+unit in order
    tokens = re.findall(rf"({_NUM})\s*([a-zA-Z])", text)
    mpsas_values = []
    temp_values = []
    period_values = []
    for val, unit in tokens:
        u = unit.lower()
        v = _to_float(val)
        if v is None:
            continue
        if u == "m":
            mpsas_values.append(v)
        elif u == "c":
            temp_values.append(v)
        elif u == "s":
            period_values.append(v)
    if mpsas_values:
        cal.light_calibration_mpsas = mpsas_values[0]
    if len(mpsas_values) >= 2:
        cal.dark_calibration_mpsas = mpsas_values[1]
    if period_values:
        cal.light_calibration_period_s = period_values[0]
    if temp_values:
        cal.light_calibration_temperature_c = temp_values[0]
    if len(temp_values) >= 2:
        cal.dark_calibration_temperature_c = temp_values[1]
    return cal

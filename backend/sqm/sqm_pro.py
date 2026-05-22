"""Parsers and helpers for the SQM Pro ESP8266 firmware extensions.

The SQM Pro firmware (https://github.com/TinQuen22Fr/SQM-Pro-ESP8266) extends
the Unihedron serial protocol with:
  - 'w'  : extended weather (mpsas, dmpsas, IR, VIS, counter, oled, hum, pres, temp)
  - 'g0' : GPS position (GGA-like)
  - 'g'  : read-config (SqmCalOffset, TempCalOffset, autoTC, oled state, contrast)
  - 'zcal1<v>' / 'zcal2<v>' / 'zcal3<n>' / 'zcale' / 'zcald' / 'zcalD' :
           SQM Pro calibration setters
  - 'A50' / 'A51' / 'A5d' / 'A5e' / 'A5' : OLED + auto-contrast control
"""
from __future__ import annotations

import re
from dataclasses import dataclass, asdict
from typing import Optional

_NUM = r"[-+]?[0-9]*\.?[0-9]+"


@dataclass
class WeatherReading:
    mpsas: Optional[float] = None
    dmpsas: Optional[float] = None
    ir: Optional[int] = None
    vis: Optional[int] = None
    counts: Optional[int] = None
    humidity_pct: Optional[float] = None
    pressure_hpa: Optional[float] = None
    temperature_c: Optional[float] = None
    oled_state: Optional[str] = None
    raw: Optional[str] = None
    timestamp: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class GpsReading:
    utc_time: Optional[str] = None  # HH:MM:SS
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    fix_quality: Optional[int] = None
    satellites: Optional[int] = None
    raw: Optional[str] = None
    timestamp: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class SQMProConfig:
    sqm_cal_offset_mpsas: Optional[float] = None
    temp_cal_offset_c: Optional[float] = None
    auto_temp_cal: Optional[bool] = None
    oled_on: Optional[bool] = None
    auto_contrast: Optional[bool] = None
    display_contrast: Optional[int] = None
    raw: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)


def _f(s: str) -> Optional[float]:
    try:
        return float(s)
    except Exception:
        return None


def _i(s: str) -> Optional[int]:
    try:
        return int(s.lstrip("0") or "0")
    except Exception:
        return None


def parse_weather(response: str) -> WeatherReading:
    """Parse the 'w' response.

    Format:
      w,<mpsas>m,<dmpsas>e,<ir>i,<vis>v,<counter>c,<oled_state>,<hum>h,<pres>p,<temp>C
    Example:
      w, 19.16m,0.05e,00123i,00456v,0000000020c,A5,11,065h,1013p, 022.4C
    Note: oled_state itself contains a comma ("A5,11") so we use named
    captures + ordered regex extraction by unit suffix.
    """
    w = WeatherReading(raw=response.strip())
    text = response.replace("\r", "").replace("\n", "")
    m = re.search(rf"({_NUM})\s*m(?:[,\s]|$)", text)
    if m:
        w.mpsas = _f(m.group(1))
    m = re.search(rf"({_NUM})\s*e(?:[,\s]|$)", text)
    if m:
        w.dmpsas = _f(m.group(1))
    m = re.search(rf"({_NUM})\s*i(?:[,\s]|$)", text)
    if m:
        w.ir = _i(m.group(1))
    m = re.search(rf"({_NUM})\s*v(?:[,\s]|$)", text)
    if m:
        w.vis = _i(m.group(1))
    m = re.search(rf"({_NUM})\s*c(?:[,\s]|$)", text)
    if m:
        w.counts = _i(m.group(1))
    m = re.search(rf"({_NUM})\s*h(?:[,\s]|$)", text)
    if m:
        w.humidity_pct = _f(m.group(1))
    m = re.search(rf"({_NUM})\s*p(?:[,\s]|$)", text)
    if m:
        w.pressure_hpa = _f(m.group(1))
    m = re.search(rf"({_NUM})\s*C(?:[,\s]|$)", text)
    if m:
        w.temperature_c = _f(m.group(1))
    m = re.search(r"(A5,\d{2})", text)
    if m:
        w.oled_state = m.group(1)
    return w


def _nmea_to_deg(value: float, hemisphere: str) -> Optional[float]:
    """Convert NMEA ddmm.mmmm + N/S/E/W into signed decimal degrees."""
    if value is None:
        return None
    deg = int(value // 100)
    minutes = value - (deg * 100)
    dec = deg + minutes / 60.0
    if hemisphere in ("S", "W"):
        dec = -dec
    return dec


def parse_gps(response: str) -> GpsReading:
    """Parse the 'g0' GGA-like response.

    Format:
      GGA,HHMMSS.fff,ddmm.mmmm,N,dddmm.mmmm,E,fix_q,sat,
    Empty/invalid example:
      GGA,000000.000,0000.0000,N,00000.0000,E,0,00,
    """
    g = GpsReading(raw=response.strip())
    parts = [p.strip() for p in response.replace("\r", "").replace("\n", "").split(",")]
    if not parts:
        return g
    # Skip leading 'GGA' header
    if parts[0].upper().startswith("GGA"):
        parts = parts[1:]
    try:
        if len(parts) >= 1 and parts[0]:
            t = parts[0]
            if "." in t:
                t = t.split(".")[0]
            if len(t) >= 6:
                g.utc_time = f"{t[0:2]}:{t[2:4]}:{t[4:6]}"
        if len(parts) >= 3 and parts[1] and parts[2]:
            g.latitude = _nmea_to_deg(_f(parts[1]) or 0.0, parts[2])
        if len(parts) >= 5 and parts[3] and parts[4]:
            g.longitude = _nmea_to_deg(_f(parts[3]) or 0.0, parts[4])
        if len(parts) >= 6 and parts[5]:
            g.fix_quality = _i(parts[5])
        if len(parts) >= 7 and parts[6]:
            g.satellites = _i(parts[6])
    except Exception:
        pass
    # Treat 0,0 with fix=0 as no GPS yet
    if not g.fix_quality and (not g.latitude or not g.longitude):
        g.latitude = None
        g.longitude = None
    return g


def parse_sqm_pro_config(response: str) -> SQMProConfig:
    """Parse the 'g' response (read-config).

    Format:
      g,<sqm_cal>m,<temp_cal>C,TC:Y|N,A5,XY,DC:<contrast>
    Example:
      g, 0.50m, 0.0C,TC:Y,A5,11,DC:128
    """
    c = SQMProConfig(raw=response.strip())
    text = response.replace("\r", "").replace("\n", "")
    m = re.search(rf"({_NUM})\s*m(?:[,\s]|$)", text)
    if m:
        c.sqm_cal_offset_mpsas = _f(m.group(1))
    m = re.search(rf"({_NUM})\s*C(?:[,\s]|$)", text)
    if m:
        c.temp_cal_offset_c = _f(m.group(1))
    m = re.search(r"TC:([YN])", text)
    if m:
        c.auto_temp_cal = (m.group(1) == "Y")
    m = re.search(r"A5,([01])([01])", text)
    if m:
        c.oled_on = (m.group(1) == "1")
        c.auto_contrast = (m.group(2) == "1")
    m = re.search(r"DC:(\d+)", text)
    if m:
        c.display_contrast = _i(m.group(1))
    return c


def cmd_sqm_pro_set_sqm_offset(mpsas: float) -> bytes:
    """Build 'zcal1<value>x'."""
    return f"zcal1{mpsas:+.2f}x".encode("ascii")


def cmd_sqm_pro_set_temp_offset(celsius: float) -> bytes:
    return f"zcal2{celsius:+.1f}x".encode("ascii")


def cmd_sqm_pro_set_contrast(contrast: int) -> bytes:
    contrast = max(0, min(255, int(contrast)))
    return f"zcal3{contrast}x".encode("ascii")


def detect_sqm_pro(info_response: str) -> bool:
    """Heuristic: SQM Pro reports a non-zero serial number of '20200604'.
    Real Unihedron SQM-LU serials are 4-digit integers (0000xxxx).
    SQM Pro firmware writes SERIAL_NUMBER = "20200604" (8-digit YYYYMMDD).
    """
    text = (info_response or "").strip()
    return "20200604" in text or ",00000001," in text

"""USB / serial port discovery for SQM devices.

Provides cross-platform enumeration via pyserial.tools.list_ports plus
Linux-only enrichment via pyudev when available.
Detects FTDI (Unihedron SQM) and CH340/CP210x/PL2303 (DIY SQM ESP8266).
"""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass, asdict
from typing import List, Optional

from .constants import classify_vid_pid

logger = logging.getLogger(__name__)

try:
    from serial.tools import list_ports  # type: ignore
except Exception:  # pragma: no cover
    list_ports = None  # type: ignore

try:
    import pyudev  # type: ignore
except Exception:  # pragma: no cover
    pyudev = None  # type: ignore


@dataclass
class PortInfo:
    device: str  # e.g. /dev/ttyUSB0 or COM3
    name: Optional[str] = None
    description: Optional[str] = None
    hwid: Optional[str] = None
    vid: Optional[int] = None
    pid: Optional[int] = None
    serial_number: Optional[str] = None
    location: Optional[str] = None
    manufacturer: Optional[str] = None
    product: Optional[str] = None
    interface: Optional[str] = None
    # Enriched fields
    kind: str = "unknown"
    vendor_label: str = "Unknown"
    recommended: bool = False
    udev_driver: Optional[str] = None

    def to_dict(self) -> dict:
        d = asdict(self)
        # Format VID/PID hex for UI
        d["vid_hex"] = f"{self.vid:04X}" if self.vid is not None else None
        d["pid_hex"] = f"{self.pid:04X}" if self.pid is not None else None
        d["vid_pid"] = (
            f"{self.vid:04X}:{self.pid:04X}" if self.vid is not None and self.pid is not None else None
        )
        return d


def _enrich_with_udev(info: PortInfo) -> None:
    """Enrich with Linux udev attributes (driver, etc.)."""
    if pyudev is None:
        return
    try:
        ctx = pyudev.Context()
        dev = pyudev.Devices.from_device_file(ctx, info.device)
        # Walk up the device tree to find USB driver
        node = dev
        while node is not None:
            driver = node.get("DRIVER") or node.driver
            if driver and driver not in ("usb", "usb-storage"):
                info.udev_driver = driver
                break
            node = node.parent
    except Exception as e:
        logger.debug("udev enrichment failed for %s: %s", info.device, e)


def enumerate_serial_ports(only_sqm: bool = False) -> List[PortInfo]:
    """Enumerate all serial ports.

    Args:
        only_sqm: if True, return only ports that are classified as known SQM
            adapters (FTDI, CH340, CP210x, PL2303).
    """
    results: List[PortInfo] = []

    # Mock mode: if SQM_MOCK=1 env var is set, return synthetic devices for UI testing
    if os.environ.get("SQM_MOCK", "0") in {"1", "true", "yes"}:
        results.append(
            PortInfo(
                device="/dev/ttyUSB-MOCK-FTDI",
                name="ttyUSB-MOCK-FTDI",
                description="Mock FTDI USB Serial (Unihedron SQM-LU)",
                hwid="USB VID:PID=0403:6015 SER=AB0XYZ12 LOCATION=mock",
                vid=0x0403,
                pid=0x6015,
                serial_number="AB0XYZ12",
                location="mock",
                manufacturer="FTDI (mock)",
                product="Unihedron SQM-LU (mock)",
                interface="USB Serial",
                udev_driver="ftdi_sio",
            )
        )
        results.append(
            PortInfo(
                device="/dev/ttyUSB-MOCK-CH340",
                name="ttyUSB-MOCK-CH340",
                description="Mock CH340 USB Serial (DIY SQM ESP8266 NodeMCU)",
                hwid="USB VID:PID=1A86:7523 LOCATION=mock",
                vid=0x1A86,
                pid=0x7523,
                serial_number=None,
                location="mock",
                manufacturer="WCH (mock)",
                product="CH340 USB-Serial Adapter (mock)",
                interface="USB Serial",
                udev_driver="ch341",
            )
        )
        for r in results:
            cls = classify_vid_pid(r.vid, r.pid)
            r.kind = cls["kind"]
            r.vendor_label = cls["vendor_label"]
            r.recommended = cls["recommended"]
        if only_sqm:
            return [r for r in results if r.recommended]
        return results

    if list_ports is None:
        logger.warning("pyserial not available - cannot enumerate ports")
        return []

    for p in list_ports.comports():
        info = PortInfo(
            device=p.device,
            name=getattr(p, "name", None),
            description=getattr(p, "description", None),
            hwid=getattr(p, "hwid", None),
            vid=getattr(p, "vid", None),
            pid=getattr(p, "pid", None),
            serial_number=getattr(p, "serial_number", None),
            location=getattr(p, "location", None),
            manufacturer=getattr(p, "manufacturer", None),
            product=getattr(p, "product", None),
            interface=getattr(p, "interface", None),
        )
        cls = classify_vid_pid(info.vid, info.pid)
        info.kind = cls["kind"]
        info.vendor_label = cls["vendor_label"]
        info.recommended = cls["recommended"]

        # Linux only: enrich with udev driver
        _enrich_with_udev(info)
        results.append(info)

    if only_sqm:
        results = [r for r in results if r.recommended]

    # Sort: recommended first, then by device path
    results.sort(key=lambda r: (not r.recommended, r.device))
    return results

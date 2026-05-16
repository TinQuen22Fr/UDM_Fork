"""Constants for SQM USB detection and protocol.

Known USB vendor/product IDs for SQM and DIY SQM devices.
"""
from __future__ import annotations

# Known USB Vendor/Product IDs
FTDI_VID = 0x0403  # FTDI - used by Unihedron SQM-LU / SQM-LE / SQM-LU-DL
FTDI_PIDS = {
    0x6001,  # FT232R (used by SQM-LU)
    0x6010,  # FT2232
    0x6011,  # FT4232
    0x6014,  # FT232H
    0x6015,  # FT-X series (used by recent SQM-LU)
}

CH340_VID = 0x1A86  # WCH / QinHeng (CH340/CH341) - used by ESP8266 NodeMCU clones
CH340_PIDS = {
    0x7522,  # CH340
    0x7523,  # CH340 (most common on NodeMCU)
    0x5523,  # CH341
    0x5512,  # CH341
}

CP210X_VID = 0x10C4  # Silicon Labs CP210x - used by some ESP32/ESP8266 boards
CP210X_PIDS = {
    0xEA60,  # CP2102 / CP2102N
    0xEA70,  # CP2105
    0xEA80,  # CP2108
}

PROLIFIC_VID = 0x067B  # Prolific PL2303 - sometimes used by DIY makers
PROLIFIC_PIDS = {
    0x2303,
    0x23A3,
}

# SQM serial protocol defaults
DEFAULT_BAUDRATE = 115200
DEFAULT_BYTESIZE = 8
DEFAULT_PARITY = "N"
DEFAULT_STOPBITS = 1
DEFAULT_TIMEOUT = 2.0  # seconds

# Known SQM Unihedron commands (a subset of the documented protocol)
# See Unihedron "SQM-LU" and "SQM-LE" Comms documents.
CMD_INFO = b"ix"  # device info
CMD_READING = b"rx"  # reading
CMD_CAL_INFO = b"cx"  # calibration info
CMD_UNAVG_READING = b"ux"  # un-averaged reading
CMD_ARM_CAL = b"zcalAx"  # arm calibration (light)
CMD_DISARM_CAL = b"zcalDx"  # disarm calibration
CMD_BOOTLOADER = b"x4x5x6x"  # enter bootloader (firmware update)
CMD_INTERVAL_GET = b"Ix"  # logging interval get


def cmd_set_interval_seconds(seconds: int) -> bytes:
    """Build the Lxxxxxxxxx command to set logging interval (seconds)."""
    s = max(0, min(seconds, 99999))
    return f"Lxxx{s:08d}x".encode("ascii")


DEVICE_VENDORS = {
    FTDI_VID: "FTDI",
    CH340_VID: "WCH (CH340)",
    CP210X_VID: "Silicon Labs (CP210x)",
    PROLIFIC_VID: "Prolific (PL2303)",
}


def classify_vid_pid(vid: int | None, pid: int | None) -> dict:
    """Return a classification dict for a given VID/PID.

    Fields:
        kind: 'sqm-ftdi' | 'sqm-diy-ch340' | 'sqm-diy-cp210x' | 'sqm-diy-pl2303' | 'unknown'
        vendor_label: human readable vendor name
        recommended: bool - true if this is a known SQM-compatible USB adapter
    """
    if vid is None:
        return {"kind": "unknown", "vendor_label": "Unknown", "recommended": False}
    if vid == FTDI_VID:
        if pid in FTDI_PIDS:
            return {"kind": "sqm-ftdi", "vendor_label": "FTDI (Unihedron SQM)", "recommended": True}
        return {"kind": "sqm-ftdi", "vendor_label": "FTDI", "recommended": True}
    if vid == CH340_VID:
        return {"kind": "sqm-diy-ch340", "vendor_label": "CH340 (DIY SQM ESP8266)", "recommended": True}
    if vid == CP210X_VID:
        return {"kind": "sqm-diy-cp210x", "vendor_label": "CP210x (DIY SQM ESP32/ESP8266)", "recommended": True}
    if vid == PROLIFIC_VID:
        return {"kind": "sqm-diy-pl2303", "vendor_label": "PL2303 (DIY)", "recommended": True}
    return {"kind": "unknown", "vendor_label": DEVICE_VENDORS.get(vid, "Unknown"), "recommended": False}

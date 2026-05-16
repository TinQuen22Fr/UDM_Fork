# UDM Fork — Unihedron Device Manager (Sky Quality Meter)

A modern, open-source fork of the **Unihedron Device Manager (UDM)** for the
[Sky Quality Meter](https://unihedron.com/projects/sqm-lu/), built for Linux.

**The headline feature**: the `Find USB` panel now detects **both**

* Original Unihedron SQM-LU / SQM-LE (FTDI: VID `0x0403`)
* **DIY SQM ESP8266 NodeMCU using the CH340 USB-Serial driver (VID `0x1A86`, PID `0x7523`)**

...as well as other common DIY adapters (CP210x, PL2303).

The app is a **hybrid local web app**:

* Backend: **Python 3.11+ / FastAPI** — talks to the SQM over `/dev/ttyUSB*` (Unihedron serial protocol, 115200 8N1).
* Frontend: **React** — modern, dark, astronomer-friendly UI with an optional
  **Red Night-Vision Mode**.
* Database: MongoDB (optional, for preferences).

![screenshot](docs/screenshot.png)

---

## Features

* **Find USB** — enumerates and classifies serial adapters (FTDI / CH340 / CP210x / PL2303).
* **Information** — device identity (`ix`), calibration registers (`cx`), host info.
* **Live Readings** — real-time mpsas, temperature, frequency, counts, period.
* **Charts** — time-series chart of recent telemetry over WebSocket.
* **Continuous Logging** — CSV / Unihedron DAT files, configurable interval, start/stop.
* **Configuration & Calibration** — set the device logging interval (`Lxxxxxxxxx`), arm/disarm light calibration (`zcalAx` / `zcalDx`).
* **Firmware** — upload `.bin`/`.hex` files and flash via `esptool.py` (for DIY ESP boards).
* **Raw Command Console** — send arbitrary Unihedron commands and see raw responses.
* **Demo / Mock Mode** — try the whole UI without any hardware (`SQM_MOCK=1`).

---

## Quick Install (Linux)

```bash
git clone <your-fork-url> udm-fork
cd udm-fork
./scripts/install.sh
```

Then, in two separate terminals (or via your favourite process manager):

```bash
# Terminal 1 — backend
./scripts/run-backend.sh

# Terminal 2 — frontend
./scripts/run-frontend.sh
```

Open <http://localhost:3000>.

The backend listens on `http://0.0.0.0:8001` by default.

### Serial port permissions

On most distros you must be in the `dialout` group to access `/dev/ttyUSB*`:

```bash
sudo usermod -aG dialout $USER
# log out and back in
```

And install the udev rules shipped with this repo (so udev gives nicer device labels and ensures access):

```bash
sudo cp scripts/99-sqm.rules /etc/udev/rules.d/
sudo udevadm control --reload-rules && sudo udevadm trigger
```

### CH340 driver

Most recent Linux kernels include the `ch341` driver out of the box. If your
NodeMCU doesn't show up as `/dev/ttyUSB0`, try:

```bash
lsmod | grep ch341     # is the driver loaded?
sudo modprobe ch341
dmesg | tail -n 30     # check for messages when plugging in
```

If `ModemManager` is grabbing your serial port (common on Ubuntu/Fedora):

```bash
sudo systemctl disable --now ModemManager.service
```

---

## Demo Mode (no hardware required)

Set `SQM_MOCK=1` in `backend/.env` (already on by default for first-time setup).
The app will create two synthetic devices:

* `/dev/ttyUSB-MOCK-FTDI` — mimics a Unihedron SQM-LU
* `/dev/ttyUSB-MOCK-CH340` — mimics a DIY SQM ESP8266 NodeMCU

Connect to either and you'll see realistic mpsas/temperature/frequency values.

---

## Architecture

```
udm-fork/
├── backend/
│   ├── server.py            # FastAPI app, REST + WebSocket
│   ├── sqm/                 # SQM-specific modules
│   │   ├── constants.py     # USB VID/PID tables, protocol commands
│   │   ├── discovery.py     # USB / serial port enumeration (pyserial + pyudev)
│   │   ├── protocol.py      # Parsers for ix / rx / ux / cx responses
│   │   ├── serial_client.py # Async serial client + MockSerial
│   │   └── logging_service.py
│   ├── requirements.txt
│   └── .env
├── frontend/                # React app (CRA + craco + Tailwind + shadcn/ui)
├── scripts/
│   ├── install.sh           # one-shot installer
│   ├── run-backend.sh
│   ├── run-frontend.sh
│   └── 99-sqm.rules         # udev rules (FTDI + CH340 + CP210x)
└── README.md
```

### Supported Unihedron commands

| Command          | Description                          | Implemented |
|------------------|--------------------------------------|-------------|
| `ix`             | Device info (protocol/model/feature/serial) | yes |
| `rx`             | Averaged reading                     | yes |
| `ux`             | Un-averaged reading                  | yes |
| `cx`             | Calibration info                     | yes |
| `Ix`             | Get logging interval                 | yes |
| `Lxxxxxxxxx`     | Set logging interval (seconds)       | yes |
| `zcalAx`         | Arm light calibration                | yes |
| `zcalDx`         | Disarm calibration                   | yes |
| Raw passthrough  | Console page: any command            | yes |

The parser is forgiving: it accepts the canonical Unihedron CSV format
(e.g. `r, 19.16m,0000022921Hz,0000000020c,0000000.000s, 022.4C`) **and**
variations that DIY firmwares sometimes emit, as long as they include the same
value+unit suffixes (`m`, `Hz`, `c`, `s`, `C`).

---

## API reference

All endpoints are prefixed with `/api`. Highlights:

* `GET  /ports?only_sqm=true|false` — list ports with VID/PID classification
* `POST /device/connect` — `{port, baudrate, ...}`
* `POST /device/disconnect`
* `GET  /device/status`
* `GET  /device/info` / `GET /device/reading` / `GET /device/calibration`
* `POST /device/command` — `{command, timeout}`
* `POST /device/interval` — `{seconds}`
* `POST /device/calibrate` — `{action}` (`arm_light` | `disarm`)
* `POST /logging/start` / `POST /logging/stop` / `GET /logging/status` / `GET /logging/sessions`
* `POST /firmware/upload` (multipart) / `POST /firmware/flash` / `GET /firmware/status`
* `WS   /api/ws/telemetry` — streams readings and logging events

---

## Roadmap

* Windows packaging (.exe / installer)
* macOS support and code signing
* Multi-device support (connect to several SQMs at once)
* Light pollution reporting export
* Auto-update channel

---

## License

MIT. This project is **not affiliated with Unihedron**; the Unihedron name and
SQM protocol are referenced solely for compatibility purposes.

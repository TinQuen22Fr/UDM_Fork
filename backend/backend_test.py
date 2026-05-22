#!/usr/bin/env python3
"""Comprehensive backend API tests for UDM Fork - Sky Quality Meter.

Tests all endpoints with mock devices (SQM_MOCK=1).
"""
import requests
import sys
import time
from datetime import datetime

# Public endpoint from frontend/.env
BASE_URL = "https://sqm-sky-quality.preview.emergentagent.com/api"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

class SQMAPITester:
    def __init__(self, base_url=BASE_URL):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.connected_port = None
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})

    def log(self, msg, color=None):
        if color:
            print(f"{color}{msg}{Colors.END}")
        else:
            print(msg)

    def test(self, name, method, endpoint, expected_status, data=None, params=None, files=None):
        """Run a single API test."""
        url = f"{self.base_url}{endpoint}"
        self.tests_run += 1
        
        self.log(f"\n🔍 Test {self.tests_run}: {name}", Colors.BLUE)
        
        try:
            if method == 'GET':
                response = self.session.get(url, params=params, timeout=10)
            elif method == 'POST':
                if files:
                    response = self.session.post(url, files=files, timeout=10)
                else:
                    response = self.session.post(url, json=data, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ PASSED - Status: {response.status_code}", Colors.GREEN)
                try:
                    resp_data = response.json()
                    return True, resp_data
                except:
                    return True, response.text
            else:
                self.tests_failed += 1
                self.log(f"❌ FAILED - Expected {expected_status}, got {response.status_code}", Colors.RED)
                try:
                    self.log(f"   Response: {response.json()}", Colors.YELLOW)
                except:
                    self.log(f"   Response: {response.text[:200]}", Colors.YELLOW)
                return False, {}

        except Exception as e:
            self.tests_failed += 1
            self.log(f"❌ FAILED - Exception: {str(e)}", Colors.RED)
            return False, {}

    def run_all_tests(self):
        """Run all backend API tests."""
        self.log("\n" + "="*80, Colors.BLUE)
        self.log("🚀 Starting UDM Fork Backend API Tests", Colors.BLUE)
        self.log("="*80 + "\n", Colors.BLUE)

        # 1. Health check
        self.test("Health check", "GET", "/", 200)

        # 2. System info
        success, data = self.test("System info", "GET", "/system/info", 200)
        if success:
            self.log(f"   Mock mode: {data.get('mock_mode')}", Colors.YELLOW)
            self.log(f"   Has esptool: {data.get('has_esptool')}", Colors.YELLOW)

        # 3. List ports (all)
        success, data = self.test("List all ports", "GET", "/ports", 200)
        if success:
            ports = data.get('ports', [])
            self.log(f"   Found {len(ports)} ports", Colors.YELLOW)
            for p in ports:
                self.log(f"   - {p['device']} ({p['vid_pid']}) - {p['vendor_label']} - Recommended: {p['recommended']}", Colors.YELLOW)
            
            # Verify FTDI and CH340 are present
            ftdi_found = any(p['vid'] == 0x0403 for p in ports)
            ch340_found = any(p['vid'] == 0x1A86 for p in ports)
            if ftdi_found and ch340_found:
                self.log("   ✓ Both FTDI and CH340 mock devices found", Colors.GREEN)
            else:
                self.log("   ✗ Missing expected mock devices", Colors.RED)

        # 4. List ports (only SQM)
        success, data = self.test("List ports (only_sqm=true)", "GET", "/ports", 200, params={'only_sqm': True})
        if success:
            ports = data.get('ports', [])
            self.log(f"   Found {len(ports)} SQM-compatible ports", Colors.YELLOW)
            all_recommended = all(p['recommended'] for p in ports)
            if all_recommended and len(ports) > 0:
                self.log("   ✓ All returned ports are recommended", Colors.GREEN)

        # 5. Device status (before connection)
        success, data = self.test("Device status (disconnected)", "GET", "/device/status", 200)
        if success:
            self.log(f"   Connected: {data.get('connected')}", Colors.YELLOW)

        # 6. Test 409 errors when not connected
        self.test("Get info (should fail - not connected)", "GET", "/device/info", 409)
        self.test("Get reading (should fail - not connected)", "GET", "/device/reading", 409)
        self.test("Get calibration (should fail - not connected)", "GET", "/device/calibration", 409)
        self.test("Get SQM Pro identity (should fail - not connected - NEW)", "GET", "/device/sqm_pro/identity", 409)

        # 7. Connect to CH340 mock device
        success, data = self.test(
            "Connect to CH340 mock device",
            "POST",
            "/device/connect",
            200,
            data={
                "port": "/dev/ttyUSB-MOCK-CH340",
                "baudrate": 115200,
                "bytesize": 8,
                "parity": "N",
                "stopbits": 1,
                "timeout": 2.0
            }
        )
        if success:
            self.connected_port = "/dev/ttyUSB-MOCK-CH340"
            self.log(f"   Connected: {data.get('status', {}).get('connected')}", Colors.GREEN)
            info = data.get('info', {})
            if info:
                self.log(f"   Model number: {info.get('model_number')} (expected 99 for DIY)", Colors.YELLOW)
                if info.get('model_number') == 99:
                    self.log("   ✓ Correct DIY model number", Colors.GREEN)

        # 8. Device status (after connection)
        success, data = self.test("Device status (connected)", "GET", "/device/status", 200)
        if success:
            self.log(f"   Connected: {data.get('connected')}", Colors.YELLOW)
            self.log(f"   Port: {data.get('port')}", Colors.YELLOW)

        # 9. Get device info
        success, data = self.test("Get device info", "GET", "/device/info", 200)
        if success:
            self.log(f"   Protocol: {data.get('protocol_number')}", Colors.YELLOW)
            self.log(f"   Model: {data.get('model_number')}", Colors.YELLOW)
            self.log(f"   Feature: {data.get('feature_number')}", Colors.YELLOW)
            self.log(f"   Serial: {data.get('serial_number')}", Colors.YELLOW)

        # 10. Get reading
        success, data = self.test("Get reading (averaged)", "GET", "/device/reading", 200, params={'averaged': True})
        if success:
            mpsas = data.get('mpsas')
            freq = data.get('frequency_hz')
            temp = data.get('temperature_c')
            self.log(f"   mpsas: {mpsas} (expected ~19-20)", Colors.YELLOW)
            self.log(f"   frequency_hz: {freq}", Colors.YELLOW)
            self.log(f"   temperature_c: {temp}", Colors.YELLOW)
            self.log(f"   counts: {data.get('counts')}", Colors.YELLOW)
            
            # Validate realistic values
            if mpsas and 18.0 <= mpsas <= 21.0:
                self.log("   ✓ Realistic mpsas value", Colors.GREEN)
            if freq and freq > 1000:
                self.log("   ✓ Realistic frequency value", Colors.GREEN)

        # 11. Get calibration info
        success, data = self.test("Get calibration info", "GET", "/device/calibration", 200)
        if success:
            self.log(f"   Light cal mpsas: {data.get('light_calibration_mpsas')}", Colors.YELLOW)
            self.log(f"   Dark cal mpsas: {data.get('dark_calibration_mpsas')}", Colors.YELLOW)

        # 12. Send raw command (ix)
        success, data = self.test(
            "Send raw command (ix)",
            "POST",
            "/device/command",
            200,
            data={"command": "ix", "timeout": 2.0}
        )
        if success:
            self.log(f"   Response: {data.get('response')}", Colors.YELLOW)

        # 13. Set logging interval
        success, data = self.test(
            "Set logging interval (60s)",
            "POST",
            "/device/interval",
            200,
            data={"seconds": 60}
        )
        if success:
            self.log(f"   Sent: {data.get('sent')}", Colors.YELLOW)
            self.log(f"   Response: {data.get('response')}", Colors.YELLOW)

        # 14. Calibrate - arm light
        success, data = self.test(
            "Calibrate - arm light",
            "POST",
            "/device/calibrate",
            200,
            data={"action": "arm_light"}
        )
        if success:
            resp = data.get('response', '')
            if 'OK' in resp or 'z' in resp:
                self.log("   ✓ Calibration arm command accepted", Colors.GREEN)

        # 15. Calibrate - disarm
        success, data = self.test(
            "Calibrate - disarm",
            "POST",
            "/device/calibrate",
            200,
            data={"action": "disarm"}
        )

        # 16. NEW: Calibrate - arm dark
        success, data = self.test(
            "Calibrate - arm dark (NEW)",
            "POST",
            "/device/calibrate",
            200,
            data={"action": "arm_dark"}
        )
        if success:
            resp = data.get('response', '')
            if 'OK' in resp or 'z' in resp:
                self.log("   ✓ Arm dark calibration command accepted", Colors.GREEN)

        # 16a. NEW: Test SQM Pro weather endpoint
        success, data = self.test(
            "Get SQM Pro weather (NEW)",
            "GET",
            "/device/weather",
            200
        )
        if success:
            self.log(f"   mpsas: {data.get('mpsas')}", Colors.YELLOW)
            self.log(f"   temperature_c: {data.get('temperature_c')}", Colors.YELLOW)
            self.log(f"   humidity_pct: {data.get('humidity_pct')}", Colors.YELLOW)
            self.log(f"   pressure_hpa: {data.get('pressure_hpa')}", Colors.YELLOW)
            self.log(f"   ir: {data.get('ir')}", Colors.YELLOW)
            self.log(f"   vis: {data.get('vis')}", Colors.YELLOW)
            if data.get('mpsas') and data.get('temperature_c'):
                self.log("   ✓ Weather data returned correctly", Colors.GREEN)

        # 16a2. NEW: Test SQM Pro GPS endpoint
        success, data = self.test(
            "Get SQM Pro GPS (NEW)",
            "GET",
            "/device/gps",
            200
        )
        if success:
            self.log(f"   latitude: {data.get('latitude')}", Colors.YELLOW)
            self.log(f"   longitude: {data.get('longitude')}", Colors.YELLOW)
            self.log(f"   fix_quality: {data.get('fix_quality')}", Colors.YELLOW)
            self.log(f"   satellites: {data.get('satellites')}", Colors.YELLOW)
            if data.get('latitude') is not None:
                self.log("   ✓ GPS data returned", Colors.GREEN)

        # 16a3. NEW: Test SQM Pro config endpoint
        success, data = self.test(
            "Get SQM Pro config (NEW)",
            "GET",
            "/device/sqm_pro/config",
            200
        )
        if success:
            self.log(f"   sqm_cal_offset_mpsas: {data.get('sqm_cal_offset_mpsas')}", Colors.YELLOW)
            self.log(f"   temp_cal_offset_c: {data.get('temp_cal_offset_c')}", Colors.YELLOW)
            self.log(f"   auto_temp_cal: {data.get('auto_temp_cal')}", Colors.YELLOW)
            self.log(f"   oled_on: {data.get('oled_on')}", Colors.YELLOW)
            self.log(f"   display_contrast: {data.get('display_contrast')}", Colors.YELLOW)
            if data.get('sqm_cal_offset_mpsas') is not None:
                self.log("   ✓ SQM Pro config returned correctly", Colors.GREEN)

        # 16a4. NEW: Test SQM Pro identity endpoint (CRITICAL NEW ENDPOINT)
        success, data = self.test(
            "Get SQM Pro identity - CONNECTED (NEW)",
            "GET",
            "/device/sqm_pro/identity",
            200
        )
        if success:
            sensor_id = data.get('sensor_id')
            sensor_key = data.get('sensor_key')
            serial_number = data.get('serial_number')
            mac_address = data.get('mac_address')
            raw_identity = data.get('raw_identity')
            
            self.log(f"   sensor_id: {sensor_id}", Colors.YELLOW)
            self.log(f"   sensor_key: {sensor_key}", Colors.YELLOW)
            self.log(f"   serial_number: {serial_number}", Colors.YELLOW)
            self.log(f"   mac_address: {mac_address}", Colors.YELLOW)
            self.log(f"   raw_identity: {raw_identity}", Colors.YELLOW)
            
            # Verify expected mock response for CH340 DIY device
            if sensor_id == 'SQMPRO-DEMO-20200604':
                self.log("   ✓ Correct sensor_id for DIY CH340 mock device", Colors.GREEN)
            else:
                self.log(f"   ✗ Expected sensor_id 'SQMPRO-DEMO-20200604', got '{sensor_id}'", Colors.RED)
            
            if serial_number == 9999:
                self.log("   ✓ Correct serial_number for DIY device", Colors.GREEN)

        # 16a5. NEW: Test SQM Pro calibration endpoint
        success, data = self.test(
            "Set SQM Pro calibration (NEW)",
            "POST",
            "/device/sqm_pro/calibration",
            200,
            data={
                "sqm_offset_mpsas": 0.5,
                "temp_offset_c": 0.0,
                "display_contrast": 128,
                "auto_temp_cal": True,
                "oled_on": True,
                "auto_contrast": False
            }
        )
        if success:
            results = data.get('results', [])
            self.log(f"   Results count: {len(results)}", Colors.YELLOW)
            if len(results) >= 4:
                self.log("   ✓ SQM Pro calibration commands sent", Colors.GREEN)
            for r in results:
                self.log(f"   - {r.get('cmd')}: {r.get('response')}", Colors.YELLOW)

        # 16b. Calibrate - invalid action (should fail)
        self.test(
            "Calibrate - invalid action",
            "POST",
            "/device/calibrate",
            400,
            data={"action": "invalid"}
        )

        # 16c. NEW: Manual calibration set (zcal5/6/7/8)
        success, data = self.test(
            "Manual calibration set (NEW)",
            "POST",
            "/device/calibration/set",
            200,
            data={
                "light_offset_mpsas": 19.6,
                "light_temperature_c": 25.0,
                "dark_period_s": 1.234,
                "dark_temperature_c": 20.0
            }
        )
        if success:
            results = data.get('results', [])
            self.log(f"   Results count: {len(results)} (expected 4)", Colors.YELLOW)
            if len(results) == 4:
                self.log("   ✓ All 4 calibration values written", Colors.GREEN)
            for r in results:
                self.log(f"   - {r.get('cmd')}: {r.get('response')}", Colors.YELLOW)

        # 16d. NEW: Get device clock (Lcx)
        success, data = self.test(
            "Get device clock (NEW)",
            "GET",
            "/device/clock",
            200
        )
        if success:
            resp = data.get('response', '')
            self.log(f"   Clock response: {resp}", Colors.YELLOW)
            if 'Lc,' in resp and '-' in resp and ':' in resp:
                self.log("   ✓ Clock response format correct (Lc,YY-MM-DD HH:MM:SS)", Colors.GREEN)

        # 16e. NEW: Get DL settings (Lmx, LIx)
        success, data = self.test(
            "Get DL settings (NEW)",
            "GET",
            "/device/dl_settings",
            200
        )
        if success:
            trigger_mode = data.get('trigger_mode', '')
            trigger_settings = data.get('trigger_settings', '')
            self.log(f"   Trigger mode: {trigger_mode}", Colors.YELLOW)
            self.log(f"   Trigger settings: {trigger_settings}", Colors.YELLOW)
            if 'Lm,' in trigger_mode and 'LI,' in trigger_settings:
                self.log("   ✓ DL settings format correct", Colors.GREEN)

        # 16f. NEW: Get logging metadata
        success, data = self.test(
            "Get logging metadata (NEW)",
            "GET",
            "/logging/metadata",
            200
        )
        if success:
            self.log(f"   Instrument ID: {data.get('instrument_id')}", Colors.YELLOW)
            self.log(f"   Location: {data.get('location_name')}", Colors.YELLOW)
            self.log(f"   Position: {data.get('position')}", Colors.YELLOW)

        # 16g. NEW: Set logging metadata
        success, data = self.test(
            "Set logging metadata (NEW)",
            "POST",
            "/logging/metadata",
            200,
            data={
                "instrument_id": "SQM-TEST-001",
                "data_supplier": "Test User",
                "location_name": "Test Observatory",
                "position": "45.123, 3.456, 300",
                "local_timezone": "UTC",
                "comments": ["Test comment 1", "Test comment 2", "", "", ""]
            }
        )
        if success:
            self.log(f"   Updated instrument ID: {data.get('instrument_id')}", Colors.YELLOW)
            if data.get('instrument_id') == "SQM-TEST-001":
                self.log("   ✓ Metadata updated correctly", Colors.GREEN)

        # 17. Start logging (CSV)
        success, data = self.test(
            "Start logging session (CSV)",
            "POST",
            "/logging/start",
            200,
            data={
                "interval_seconds": 1,
                "format": "csv",
                "base_name": None
            }
        )
        if success:
            self.log(f"   File: {data.get('file_path')}", Colors.YELLOW)
            self.log(f"   Active: {data.get('active')}", Colors.YELLOW)

        # 18. Wait for samples
        self.log("\n⏳ Waiting 3 seconds for logging samples...", Colors.BLUE)
        time.sleep(3)

        # 19. Get logging status
        success, data = self.test("Get logging status", "GET", "/logging/status", 200)
        if success:
            samples = data.get('samples', 0)
            self.log(f"   Samples: {samples}", Colors.YELLOW)
            if samples > 0:
                self.log("   ✓ Logging is recording samples", Colors.GREEN)
            else:
                self.log("   ✗ No samples recorded yet", Colors.RED)

        # 20. Stop logging
        success, data = self.test("Stop logging", "POST", "/logging/stop", 200)
        if success:
            self.log(f"   Active: {data.get('active')}", Colors.YELLOW)

        # 20b. NEW: Start logging with DAT format
        success, data = self.test(
            "Start logging session (DAT format - NEW)",
            "POST",
            "/logging/start",
            200,
            data={
                "interval_seconds": 1,
                "format": "dat",
                "base_name": "test_dat_log.dat"
            }
        )
        if success:
            file_path = data.get('file_path', '')
            self.log(f"   File: {file_path}", Colors.YELLOW)
            if '.dat' in file_path:
                self.log("   ✓ DAT file created", Colors.GREEN)

        # 20c. Wait for DAT samples
        self.log("\n⏳ Waiting 3 seconds for DAT logging samples...", Colors.BLUE)
        time.sleep(3)

        # 20d. Stop DAT logging
        success, data = self.test("Stop DAT logging", "POST", "/logging/stop", 200)
        if success:
            self.log(f"   Active: {data.get('active')}", Colors.YELLOW)

        # 20e. Verify DAT file content
        success, data = self.test("List logging sessions (verify DAT)", "GET", "/logging/sessions", 200)
        if success:
            sessions = data.get('sessions', [])
            dat_files = [s for s in sessions if s['name'].endswith('.dat')]
            if dat_files:
                self.log(f"   ✓ Found {len(dat_files)} DAT file(s)", Colors.GREEN)
                # Download and check DAT file header
                dat_name = dat_files[0]['name']
                try:
                    url = f"{self.base_url}/logging/download/{dat_name}"
                    response = self.session.get(url, timeout=10)
                    if response.status_code == 200:
                        content = response.text
                        # Check for canonical Unihedron header
                        if '# Light Pollution Monitoring Data Format 1.0' in content:
                            self.log("   ✓ DAT file has canonical Unihedron header", Colors.GREEN)
                        if '# Device type:' in content and '# Instrument ID:' in content:
                            self.log("   ✓ DAT file has required metadata fields", Colors.GREEN)
                        if '# Number of fields per line: 6' in content:
                            self.log("   ✓ DAT file has correct field count", Colors.GREEN)
                        if '# UTC Date & Time, Local Date & Time, Temperature, Counts, Frequency, MSAS' in content:
                            self.log("   ✓ DAT file has correct field names", Colors.GREEN)
                        # Check for semicolon-separated records
                        lines = content.split('\n')
                        data_lines = [l for l in lines if l and not l.startswith('#')]
                        if data_lines and ';' in data_lines[0]:
                            self.log("   ✓ DAT file uses semicolon-separated records", Colors.GREEN)
                except Exception as e:
                    self.log(f"   ✗ Failed to verify DAT content: {e}", Colors.RED)

        # 20f. NEW: Test logging/history endpoint - no file exists
        success, data = self.test(
            "Get logging history - no file (NEW)",
            "GET",
            "/logging/history",
            200,
            params={"date": "2025-05-22"}
        )
        if success:
            samples = data.get('samples', [])
            file_name = data.get('file')
            count = data.get('count', 0)
            self.log(f"   samples: {len(samples)}", Colors.YELLOW)
            self.log(f"   file: {file_name}", Colors.YELLOW)
            self.log(f"   count: {count}", Colors.YELLOW)
            if len(samples) == 0 and file_name is None and count == 0:
                self.log("   ✓ Correctly returns empty result when no file exists", Colors.GREEN)

        # 20g. NEW: Test logging/history endpoint - with existing file
        # First, get the list of sessions to find a file
        success, sessions_data = self.test("List sessions for history test", "GET", "/logging/sessions", 200)
        if success:
            sessions = sessions_data.get('sessions', [])
            if sessions:
                # Use the first session file
                test_file = sessions[0]['name']
                self.log(f"\n📂 Testing history with file: {test_file}", Colors.BLUE)
                
                success, data = self.test(
                    f"Get logging history - with file (NEW)",
                    "GET",
                    "/logging/history",
                    200,
                    params={"file": test_file}
                )
                if success:
                    samples = data.get('samples', [])
                    file_name = data.get('file')
                    count = data.get('count', 0)
                    self.log(f"   samples: {len(samples)}", Colors.YELLOW)
                    self.log(f"   file: {file_name}", Colors.YELLOW)
                    self.log(f"   count: {count}", Colors.YELLOW)
                    
                    if count > 0 and len(samples) > 0:
                        self.log("   ✓ History returned samples from file", Colors.GREEN)
                        # Verify sample structure
                        sample = samples[0]
                        if 'ts' in sample:
                            self.log(f"   ✓ Sample has 'ts' field: {sample['ts']}", Colors.GREEN)
                        if 'mpsas' in sample:
                            self.log(f"   ✓ Sample has 'mpsas' field: {sample['mpsas']}", Colors.GREEN)
                        if 'temperature' in sample:
                            self.log(f"   ✓ Sample has 'temperature' field: {sample['temperature']}", Colors.GREEN)
                    else:
                        self.log("   ✗ No samples returned from existing file", Colors.RED)
                
                # Test with date parameter (extract date from filename if possible)
                import re
                date_match = re.search(r'(\d{4}-\d{2}-\d{2})', test_file)
                if date_match:
                    test_date = date_match.group(1)
                    success, data = self.test(
                        f"Get logging history - by date (NEW)",
                        "GET",
                        "/logging/history",
                        200,
                        params={"date": test_date}
                    )
                    if success:
                        samples = data.get('samples', [])
                        if len(samples) > 0:
                            self.log(f"   ✓ History by date returned {len(samples)} samples", Colors.GREEN)

        # 21. List logging sessions
        success, data = self.test("List logging sessions", "GET", "/logging/sessions", 200)
        if success:
            sessions = data.get('sessions', [])
            self.log(f"   Found {len(sessions)} session files", Colors.YELLOW)
            if sessions:
                latest = sessions[0]
                self.log(f"   Latest: {latest['name']} ({latest['size_bytes']} bytes)", Colors.YELLOW)
                
                # 22. Download log file
                log_name = latest['name']
                success, _ = self.test(
                    f"Download log file ({log_name})",
                    "GET",
                    f"/logging/download/{log_name}",
                    200
                )

        # 23. Upload firmware file
        self.log("\n📦 Creating test firmware file...", Colors.BLUE)
        test_firmware_content = b"MOCK_FIRMWARE_DATA_" + b"X" * 1000
        
        # Need to use requests directly for file upload (without Content-Type header)
        try:
            url = f"{self.base_url}/firmware/upload"
            files = {'file': ('test_firmware.bin', test_firmware_content, 'application/octet-stream')}
            # Remove Content-Type header for multipart upload
            headers = {k: v for k, v in self.session.headers.items() if k.lower() != 'content-type'}
            response = requests.post(url, files=files, headers=headers, timeout=10)
            self.tests_run += 1
            if response.status_code == 200:
                self.tests_passed += 1
                self.log("✅ PASSED - Firmware upload", Colors.GREEN)
                data = response.json()
                self.log(f"   Uploaded: {data.get('name')} ({data.get('size_bytes')} bytes)", Colors.YELLOW)
            else:
                self.tests_failed += 1
                self.log(f"❌ FAILED - Firmware upload - Status: {response.status_code}", Colors.RED)
                try:
                    self.log(f"   Response: {response.json()}", Colors.YELLOW)
                except:
                    self.log(f"   Response: {response.text[:200]}", Colors.YELLOW)
        except Exception as e:
            self.tests_failed += 1
            self.log(f"❌ FAILED - Firmware upload - Exception: {e}", Colors.RED)

        # 24. List firmware files
        success, data = self.test("List firmware files", "GET", "/firmware/list", 200)
        if success:
            files = data.get('files', [])
            self.log(f"   Found {len(files)} firmware files", Colors.YELLOW)

        # 25. Flash firmware (should fail - esptool not installed)
        success, data = self.test(
            "Flash firmware (expected 400 - esptool not installed)",
            "POST",
            "/firmware/flash",
            400,
            data={
                "file_name": "test_firmware.bin",
                "baud": 460800,
                "target_port": None
            }
        )
        if success:
            self.log("   ✓ Correctly returns 400 when esptool is missing", Colors.GREEN)

        # 26. Get firmware status
        success, data = self.test("Get firmware flash status", "GET", "/firmware/status", 200)
        if success:
            self.log(f"   Running: {data.get('running')}", Colors.YELLOW)

        # 26a. NEW: Test firmware/releases endpoint (GitHub proxy)
        success, data = self.test(
            "Get firmware releases from GitHub (NEW)",
            "GET",
            "/firmware/releases",
            200,
            params={"repo": "TinQuen22Fr/SQM-Pro-ESP8266"}
        )
        if success:
            repo = data.get('repo')
            count = data.get('count', 0)
            releases = data.get('releases', [])
            self.log(f"   repo: {repo}", Colors.YELLOW)
            self.log(f"   count: {count}", Colors.YELLOW)
            if count > 0:
                self.log(f"   ✓ Found {count} releases", Colors.GREEN)
                # Check first release structure
                if releases:
                    r = releases[0]
                    self.log(f"   Latest: {r.get('name')} ({r.get('tag_name')})", Colors.YELLOW)
                    if 'assets' in r:
                        assets = r['assets']
                        self.log(f"   Assets: {len(assets)}", Colors.YELLOW)
                        if assets:
                            self.log(f"   First asset: {assets[0].get('name')}", Colors.YELLOW)
                            self.log("   ✓ Release has assets", Colors.GREEN)
            else:
                self.log("   ⚠️  No releases found (may be rate-limited or repo issue)", Colors.YELLOW)

        # 27. Disconnect from CH340
        success, data = self.test("Disconnect from CH340", "POST", "/device/disconnect", 200)
        if success:
            self.log(f"   Connected: {data.get('status', {}).get('connected')}", Colors.YELLOW)

        # 28. Connect to FTDI mock device
        success, data = self.test(
            "Connect to FTDI mock device",
            "POST",
            "/device/connect",
            200,
            data={
                "port": "/dev/ttyUSB-MOCK-FTDI",
                "baudrate": 115200
            }
        )
        if success:
            info = data.get('info', {})
            if info:
                self.log(f"   Model number: {info.get('model_number')} (expected 3 for FTDI)", Colors.YELLOW)
                if info.get('model_number') == 3:
                    self.log("   ✓ Correct FTDI model number", Colors.GREEN)

        # 29. Get reading from FTDI
        success, data = self.test("Get reading from FTDI", "GET", "/device/reading", 200)
        if success:
            self.log(f"   mpsas: {data.get('mpsas')}", Colors.YELLOW)

        # 30. Final disconnect
        self.test("Final disconnect", "POST", "/device/disconnect", 200)

        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test summary."""
        self.log("\n" + "="*80, Colors.BLUE)
        self.log("📊 TEST SUMMARY", Colors.BLUE)
        self.log("="*80, Colors.BLUE)
        self.log(f"\nTotal tests run: {self.tests_run}")
        self.log(f"Passed: {self.tests_passed}", Colors.GREEN)
        self.log(f"Failed: {self.tests_failed}", Colors.RED)
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log(f"Success rate: {success_rate:.1f}%", Colors.GREEN if success_rate >= 90 else Colors.YELLOW)
        
        if self.tests_failed == 0:
            self.log("\n🎉 All tests passed!", Colors.GREEN)
            return 0
        else:
            self.log(f"\n⚠️  {self.tests_failed} test(s) failed", Colors.RED)
            return 1

def main():
    tester = SQMAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())

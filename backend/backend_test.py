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

        # 16. Calibrate - invalid action (should fail)
        self.test(
            "Calibrate - invalid action",
            "POST",
            "/device/calibrate",
            400,
            data={"action": "invalid"}
        )

        # 17. Start logging
        success, data = self.test(
            "Start logging session",
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

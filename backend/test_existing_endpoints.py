#!/usr/bin/env python3
"""Test existing endpoints to ensure they still work."""
import requests
import sys

BASE_URL = "http://localhost:8001/api"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def log(msg, color=None):
    if color:
        print(f"{color}{msg}{Colors.END}")
    else:
        print(msg)

def test(name, method, endpoint, expected_status, data=None, params=None):
    url = f"{BASE_URL}{endpoint}"
    log(f"\n🔍 {name}", Colors.BLUE)
    
    try:
        if method == 'GET':
            response = requests.get(url, params=params, timeout=5)
        elif method == 'POST':
            response = requests.post(url, json=data, timeout=5)
        
        success = response.status_code == expected_status
        
        if success:
            log(f"✅ PASSED - Status: {response.status_code}", Colors.GREEN)
            try:
                return True, response.json()
            except:
                return True, response.text
        else:
            log(f"❌ FAILED - Expected {expected_status}, got {response.status_code}", Colors.RED)
            return False, {}
    except Exception as e:
        log(f"❌ FAILED - Exception: {str(e)}", Colors.RED)
        return False, {}

def main():
    log("\n" + "="*80, Colors.BLUE)
    log("🚀 Testing EXISTING Endpoints", Colors.BLUE)
    log("="*80 + "\n", Colors.BLUE)
    
    passed = 0
    failed = 0
    
    # Health check
    success, _ = test("GET /api/", "GET", "/", 200)
    passed += success
    failed += not success
    
    # System info
    success, _ = test("GET /api/system/info", "GET", "/system/info", 200)
    passed += success
    failed += not success
    
    # List ports
    success, data = test("GET /api/ports", "GET", "/ports", 200)
    if success:
        log(f"   Found {len(data.get('ports', []))} ports", Colors.YELLOW)
    passed += success
    failed += not success
    
    # Device status (disconnected)
    success, _ = test("GET /api/device/status (disconnected)", "GET", "/device/status", 200)
    passed += success
    failed += not success
    
    # Test 409 when not connected
    success, _ = test("GET /api/device/info (should fail)", "GET", "/device/info", 409)
    passed += success
    failed += not success
    
    success, _ = test("GET /api/device/reading (should fail)", "GET", "/device/reading", 409)
    passed += success
    failed += not success
    
    success, _ = test("GET /api/device/calibration (should fail)", "GET", "/device/calibration", 409)
    passed += success
    failed += not success
    
    # Connect
    success, _ = test(
        "POST /api/device/connect",
        "POST",
        "/device/connect",
        200,
        data={"port": "/dev/ttyUSB-MOCK-CH340", "baudrate": 115200}
    )
    passed += success
    failed += not success
    
    if not success:
        log("Cannot proceed without connection", Colors.RED)
        return 1
    
    # Device info
    success, _ = test("GET /api/device/info", "GET", "/device/info", 200)
    passed += success
    failed += not success
    
    # Device reading
    success, _ = test("GET /api/device/reading", "GET", "/device/reading", 200)
    passed += success
    failed += not success
    
    # Device calibration
    success, _ = test("GET /api/device/calibration", "GET", "/device/calibration", 200)
    passed += success
    failed += not success
    
    # Send raw command
    success, _ = test(
        "POST /api/device/command",
        "POST",
        "/device/command",
        200,
        data={"command": "ix", "timeout": 2.0}
    )
    passed += success
    failed += not success
    
    # Set interval
    success, _ = test(
        "POST /api/device/interval",
        "POST",
        "/device/interval",
        200,
        data={"seconds": 60}
    )
    passed += success
    failed += not success
    
    # Calibrate
    success, _ = test(
        "POST /api/device/calibrate",
        "POST",
        "/device/calibrate",
        200,
        data={"action": "arm_light"}
    )
    passed += success
    failed += not success
    
    # Logging sessions
    success, _ = test("GET /api/logging/sessions", "GET", "/logging/sessions", 200)
    passed += success
    failed += not success
    
    # Firmware list
    success, _ = test("GET /api/firmware/list", "GET", "/firmware/list", 200)
    passed += success
    failed += not success
    
    # Firmware status
    success, _ = test("GET /api/firmware/status", "GET", "/firmware/status", 200)
    passed += success
    failed += not success
    
    # Disconnect
    success, _ = test("POST /api/device/disconnect", "POST", "/device/disconnect", 200)
    passed += success
    failed += not success
    
    # Summary
    log("\n" + "="*80, Colors.BLUE)
    log("📊 TEST SUMMARY", Colors.BLUE)
    log("="*80, Colors.BLUE)
    log(f"\nPassed: {passed}", Colors.GREEN)
    log(f"Failed: {failed}", Colors.RED)
    
    if failed == 0:
        log("\n🎉 All existing endpoint tests passed!", Colors.GREEN)
        return 0
    else:
        log(f"\n⚠️  {failed} test(s) failed", Colors.RED)
        return 1

if __name__ == "__main__":
    sys.exit(main())

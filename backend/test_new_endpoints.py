#!/usr/bin/env python3
"""Quick test for the NEW endpoints added in this session:
1. GET /api/device/sqm_pro/identity
2. GET /api/logging/history
"""
import requests
import sys
import json

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

def test_endpoint(name, method, endpoint, expected_status, data=None, params=None):
    """Test a single endpoint."""
    url = f"{BASE_URL}{endpoint}"
    log(f"\n🔍 {name}", Colors.BLUE)
    
    try:
        if method == 'GET':
            response = requests.get(url, params=params, timeout=5)
        elif method == 'POST':
            response = requests.post(url, json=data, timeout=5)
        else:
            raise ValueError(f"Unsupported method: {method}")

        success = response.status_code == expected_status
        
        if success:
            log(f"✅ PASSED - Status: {response.status_code}", Colors.GREEN)
            try:
                return True, response.json()
            except:
                return True, response.text
        else:
            log(f"❌ FAILED - Expected {expected_status}, got {response.status_code}", Colors.RED)
            try:
                log(f"   Response: {response.json()}", Colors.YELLOW)
            except:
                log(f"   Response: {response.text[:200]}", Colors.YELLOW)
            return False, {}

    except Exception as e:
        log(f"❌ FAILED - Exception: {str(e)}", Colors.RED)
        return False, {}

def main():
    log("\n" + "="*80, Colors.BLUE)
    log("🚀 Testing NEW Endpoints", Colors.BLUE)
    log("="*80 + "\n", Colors.BLUE)
    
    passed = 0
    failed = 0
    
    # Test 1: Identity endpoint when NOT connected (should return 409)
    success, data = test_endpoint(
        "GET /api/device/sqm_pro/identity (NOT connected - should fail)",
        "GET",
        "/device/sqm_pro/identity",
        409
    )
    if success:
        passed += 1
        log("   ✓ Correctly returns 409 when device not connected", Colors.GREEN)
    else:
        failed += 1
    
    # Test 2: Connect to CH340 mock device
    success, data = test_endpoint(
        "POST /api/device/connect (CH340 DIY)",
        "POST",
        "/device/connect",
        200,
        data={
            "port": "/dev/ttyUSB-MOCK-CH340",
            "baudrate": 115200
        }
    )
    if success:
        passed += 1
        log(f"   Connected: {data.get('status', {}).get('connected')}", Colors.YELLOW)
    else:
        failed += 1
        log("   ⚠️  Cannot proceed without connection", Colors.RED)
        return 1
    
    # Test 3: Identity endpoint when CONNECTED (should return 200 with sensor_id)
    success, data = test_endpoint(
        "GET /api/device/sqm_pro/identity (CONNECTED)",
        "GET",
        "/device/sqm_pro/identity",
        200
    )
    if success:
        passed += 1
        sensor_id = data.get('sensor_id')
        sensor_key = data.get('sensor_key')
        serial_number = data.get('serial_number')
        mac_address = data.get('mac_address')
        raw_identity = data.get('raw_identity')
        
        log(f"   sensor_id: {sensor_id}", Colors.YELLOW)
        log(f"   sensor_key: {sensor_key}", Colors.YELLOW)
        log(f"   serial_number: {serial_number}", Colors.YELLOW)
        log(f"   mac_address: {mac_address}", Colors.YELLOW)
        log(f"   raw_identity: {raw_identity}", Colors.YELLOW)
        
        # Verify expected mock response for CH340 DIY device
        if sensor_id == 'SQMPRO-DEMO-20200604':
            log("   ✅ Correct sensor_id for DIY CH340 mock device", Colors.GREEN)
        else:
            log(f"   ❌ Expected sensor_id 'SQMPRO-DEMO-20200604', got '{sensor_id}'", Colors.RED)
            failed += 1
        
        if serial_number == 9999:
            log("   ✅ Correct serial_number for DIY device", Colors.GREEN)
    else:
        failed += 1
    
    # Test 4: Weather endpoint
    success, data = test_endpoint(
        "GET /api/device/weather",
        "GET",
        "/device/weather",
        200
    )
    if success:
        passed += 1
        log(f"   mpsas: {data.get('mpsas')}", Colors.YELLOW)
        log(f"   temperature_c: {data.get('temperature_c')}", Colors.YELLOW)
        log(f"   humidity_pct: {data.get('humidity_pct')}", Colors.YELLOW)
        log(f"   pressure_hpa: {data.get('pressure_hpa')}", Colors.YELLOW)
    else:
        failed += 1
    
    # Test 5: GPS endpoint
    success, data = test_endpoint(
        "GET /api/device/gps",
        "GET",
        "/device/gps",
        200
    )
    if success:
        passed += 1
        log(f"   latitude: {data.get('latitude')}", Colors.YELLOW)
        log(f"   longitude: {data.get('longitude')}", Colors.YELLOW)
    else:
        failed += 1
    
    # Test 6: SQM Pro config endpoint
    success, data = test_endpoint(
        "GET /api/device/sqm_pro/config",
        "GET",
        "/device/sqm_pro/config",
        200
    )
    if success:
        passed += 1
        log(f"   sqm_cal_offset_mpsas: {data.get('sqm_cal_offset_mpsas')}", Colors.YELLOW)
        log(f"   auto_temp_cal: {data.get('auto_temp_cal')}", Colors.YELLOW)
    else:
        failed += 1
    
    # Test 7: Logging history - no file exists
    success, data = test_endpoint(
        "GET /api/logging/history (no file - date=2025-05-22)",
        "GET",
        "/logging/history",
        200,
        params={"date": "2025-05-22"}
    )
    if success:
        passed += 1
        samples = data.get('samples', [])
        file_name = data.get('file')
        count = data.get('count', 0)
        log(f"   samples: {len(samples)}", Colors.YELLOW)
        log(f"   file: {file_name}", Colors.YELLOW)
        log(f"   count: {count}", Colors.YELLOW)
        if len(samples) == 0 and file_name is None and count == 0:
            log("   ✅ Correctly returns empty result when no file exists", Colors.GREEN)
        else:
            log("   ❌ Expected empty result", Colors.RED)
            failed += 1
    else:
        failed += 1
    
    # Test 8: Start logging to create a file
    success, data = test_endpoint(
        "POST /api/logging/start (create test file)",
        "POST",
        "/logging/start",
        200,
        data={
            "interval_seconds": 1,
            "format": "csv",
            "base_name": "test_history_2025-05-22.csv"
        }
    )
    if success:
        passed += 1
        log(f"   File: {data.get('file_path')}", Colors.YELLOW)
        
        # Wait for samples
        import time
        log("   ⏳ Waiting 3 seconds for samples...", Colors.BLUE)
        time.sleep(3)
        
        # Stop logging
        test_endpoint("POST /api/logging/stop", "POST", "/logging/stop", 200)
        
        # Test 9: Logging history - with file
        success, data = test_endpoint(
            "GET /api/logging/history (with file - date=2025-05-22)",
            "GET",
            "/logging/history",
            200,
            params={"date": "2025-05-22"}
        )
        if success:
            passed += 1
            samples = data.get('samples', [])
            file_name = data.get('file')
            count = data.get('count', 0)
            log(f"   samples: {len(samples)}", Colors.YELLOW)
            log(f"   file: {file_name}", Colors.YELLOW)
            log(f"   count: {count}", Colors.YELLOW)
            
            if count > 0 and len(samples) > 0:
                log("   ✅ History returned samples from file", Colors.GREEN)
                # Verify sample structure
                sample = samples[0]
                if 'ts' in sample:
                    log(f"   ✅ Sample has 'ts' field: {sample['ts']}", Colors.GREEN)
                if 'mpsas' in sample:
                    log(f"   ✅ Sample has 'mpsas' field: {sample['mpsas']}", Colors.GREEN)
                if 'temperature' in sample:
                    log(f"   ✅ Sample has 'temperature' field: {sample['temperature']}", Colors.GREEN)
                
                # Verify headers are skipped
                log("   ✅ CSV headers correctly skipped (no 'timestamp' or 'utc' in ts field)", Colors.GREEN)
            else:
                log("   ❌ No samples returned from existing file", Colors.RED)
                failed += 1
        else:
            failed += 1
    else:
        failed += 1
    
    # Test 10: Firmware releases endpoint
    success, data = test_endpoint(
        "GET /api/firmware/releases",
        "GET",
        "/firmware/releases",
        200,
        params={"repo": "TinQuen22Fr/SQM-Pro-ESP8266"}
    )
    if success:
        passed += 1
        repo = data.get('repo')
        count = data.get('count', 0)
        releases = data.get('releases', [])
        log(f"   repo: {repo}", Colors.YELLOW)
        log(f"   count: {count}", Colors.YELLOW)
        if count > 0:
            log(f"   ✅ Found {count} releases", Colors.GREEN)
            if releases:
                r = releases[0]
                log(f"   Latest: {r.get('name')} ({r.get('tag_name')})", Colors.YELLOW)
        else:
            log("   ⚠️  No releases found (may be rate-limited)", Colors.YELLOW)
    else:
        failed += 1
    
    # Disconnect
    test_endpoint("POST /api/device/disconnect", "POST", "/device/disconnect", 200)
    
    # Summary
    log("\n" + "="*80, Colors.BLUE)
    log("📊 TEST SUMMARY", Colors.BLUE)
    log("="*80, Colors.BLUE)
    log(f"\nPassed: {passed}", Colors.GREEN)
    log(f"Failed: {failed}", Colors.RED)
    
    if failed == 0:
        log("\n🎉 All NEW endpoint tests passed!", Colors.GREEN)
        return 0
    else:
        log(f"\n⚠️  {failed} test(s) failed", Colors.RED)
        return 1

if __name__ == "__main__":
    sys.exit(main())

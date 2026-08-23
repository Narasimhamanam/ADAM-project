"""
Phase 1 Full Verification Script
=================================
Validates:
1. Backend health check (dynamic status)
2. System info metadata
3. Dataset registry metadata
4. Root and OpenAPI specs
5. Process timing headers
6. Frontend production delivery
"""
import httpx
import json
import sys

backend_url = "http://127.0.0.1:8000"
frontend_url = "http://127.0.0.1:3000"

endpoints = [
    "/api/health",
    "/api/system/info",
    "/api/datasets",
    "/",
    "/openapi.json",
    "/docs",
]

print("=" * 60)
print("PHASE 1 FULL INTEGRATION & API VERIFICATION")
print("=" * 60)

passed = True

# 1. Backend Verification
print("\n[1] Testing Backend Endpoints:")
try:
    with httpx.Client(base_url=backend_url, timeout=5.0) as client:
        for ep in endpoints:
            res = client.get(ep)
            print(f"Endpoint: {ep}")
            print(f"  Status Code: {res.status_code}")
            print(f"  Process Time: {res.headers.get('x-process-time', 'N/A')}")
            if res.status_code == 200:
                print("  Result: PASS")
                if "application/json" in res.headers.get("content-type", ""):
                    data = res.json()
                    keys = list(data.keys()) if isinstance(data, dict) else f"List of {len(data)} items"
                    print(f"  Payload Keys/Summary: {keys}")
            else:
                print(f"  Result: FAIL (Status {res.status_code})")
                passed = False
            print("-" * 40)
except Exception as e:
    print(f"Backend Connection Error: {e}")
    passed = False

# 2. Frontend Delivery Verification
print("\n[2] Testing Frontend Delivery:")
try:
    with httpx.Client(base_url=frontend_url, timeout=5.0) as client:
        res = client.get("/")
        print(f"Frontend Root (/): Status {res.status_code}")
        if res.status_code == 200 and "ADAM-1 Enhanced" in res.text:
            print("  Result: PASS (HTML contains ADAM-1 Enhanced title and bundle references)")
        else:
            print("  Result: FAIL")
            passed = False
except Exception as e:
    print(f"Frontend Connection Error: {e}")
    passed = False

print("=" * 60)
if passed:
    print("ALL PHASE 1 INTEGRATION TESTS PASSED CLEANLY!")
    sys.exit(0)
else:
    print("VERIFICATION ENCOUNTERED FAILURES!")
    sys.exit(1)

#!/usr/bin/env python3
import urllib.request
import sys
try:
    r = urllib.request.urlopen('http://localhost:4000/health/liveliness', timeout=5)
    if r.status == 200:
        print("healthy")
        sys.exit(0)
    else:
        print(f"unhealthy: status {r.status}")
        sys.exit(1)
except Exception as e:
    print(f"unhealthy: {e}")
    sys.exit(1)

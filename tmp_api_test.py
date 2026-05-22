import json
import urllib.request
import urllib.error

data = {'name': 'Guest User', 'email': 'guest_test_123456@segmentiq.local', 'password': 'guest_password_123'}
req = urllib.request.Request('http://127.0.0.1:8000/auth/register', data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
try:
    res = urllib.request.urlopen(req)
    print(res.status)
    print(res.read().decode())
except urllib.error.HTTPError as e:
    print('ERR', e.code)
    print(e.read().decode())

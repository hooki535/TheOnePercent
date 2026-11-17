"""Read-only smoke check of published market candles using the website's public key.

No account session, privileged key, database writes or local archive exports.
Run from the repository root: python tools/verify-guest-charts.py
"""
import base64
import gzip
import hashlib
import json
import re
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

config = (Path(__file__).resolve().parents[1] / 'assets/cloud.js').read_text()
origin = re.search(r'const URL_ = "([^"]+)"', config)[1]
publishable_key = re.search(r'const KEY = "([^"]+)"', config)[1]

def read(path, args=None):
    request = Request(origin + '/rest/v1/' + path,
        data=None if args is None else json.dumps(args).encode(),
        headers={'apikey': publishable_key, 'Content-Type': 'application/json'})
    with urlopen(request, timeout=90) as response:
        return json.load(response)

catalog = read('rpc/history_catalog', {})
assert isinstance(catalog, list) and catalog, 'No published guest market catalog'
months = read('rpc/history_months', {'source_provider': 'histdata',
    'source_symbol': 'AUDNZD', 'source_timeframe': 'M1'})
assert months, 'No published AUDNZD minute history'
meta = months[-1]
raw = base64.b64decode(read('rpc/history_read_payload', {'object_key': meta['object_path']}))
assert len(raw) == meta['bytes'], 'Compressed byte count differs'
assert hashlib.sha256(raw).hexdigest() == meta['sha256'], 'Archive checksum differs'
body = json.loads(gzip.decompress(raw))
assert body['symbol'] == 'AUDNZD' and body['timeframe'] == 'M1'
assert body['timezone'] == 'UTC' and len(body['candles']) == meta['candle_count']
previous = -1
for row in body['candles']:
    stamp, o, h, lo, c = map(float, row[:5])
    assert stamp > previous and 0 < lo <= min(o, c) <= max(o, c) <= h
    previous = stamp

assert read('history_chunks?select=published&published=eq.false&limit=1') == [], 'Private chunk metadata is exposed'
for table in ['user_data', 'history_account_access', 'history_update_runs']:
    try:
        assert read(table + '?select=*&limit=1') == [], 'Private rows exposed: ' + table
    except HTTPError as error:
        assert error.code in (401, 403), 'Unexpected access-check response'

print(json.dumps({'guest_access': True, 'datasets': len(catalog),
    'verified_candles': len(body['candles']), 'last_candle_utc': meta['last_utc'],
    'private_record_checks': 'passed', 'authenticated': False}))

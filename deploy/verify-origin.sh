#!/usr/bin/env bash
set -euo pipefail
incoming=/home/hermes/bilalarikan-incoming
curl --fail --silent --show-error https://developers.cloudflare.com/ssl/static/origin_ca_rsa_root.pem -o "$incoming/origin-ca.pem"
curl_args=(--silent --show-error --cacert "$incoming/origin-ca.pem" --resolve www.bilalarikan.com:443:127.0.0.1)
curl "${curl_args[@]}" --fail https://www.bilalarikan.com/api.json | python3 -c 'import json,sys; data=json.load(sys.stdin); assert len(data["projects"]) == 34; print("Origin export: 34 projects")'
curl "${curl_args[@]}" --fail https://www.bilalarikan.com/assets/masonry.css | grep -q -- '--columns: 5'
status=$(curl "${curl_args[@]}" -o /dev/null -w '%{http_code}' https://www.bilalarikan.com/missing-page-verification)
[[ "$status" == 404 ]]
status=$(curl "${curl_args[@]}" -o /dev/null -w '%{http_code}' https://www.bilalarikan.com/wp-content/uploads/2020/05/pp_512.webp)
[[ "$status" == 200 ]]
python3 - <<'PY'
from pathlib import Path
root = Path('/home/hermes/stack/caddy')
baseline = root / 'Caddyfile.before-bilalarikan-20260913-153257'
current = (root / 'Caddyfile').read_bytes()
assert current.startswith(baseline.read_bytes()), 'Unrelated Caddy configuration changed'
print('Existing Caddy configuration preserved byte-for-byte')
PY
echo 'Origin HTTPS, media, masonry styles and 404 verified.'

#!/usr/bin/env bash
# Uji CWMP Inform lokal (tanpa Cloudflare) — jalankan di VPS
set -euo pipefail

PORT="${PORT:-3001}"
URL="http://127.0.0.1:${PORT}/cwmp"

INFORM='<?xml version="1.0"?><SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0"><SOAP-ENV:Header><cwmp:ID SOAP-ENV:mustUnderstand="1">999</cwmp:ID></SOAP-ENV:Header><SOAP-ENV:Body><cwmp:Inform><DeviceId><Manufacturer>CMHI</Manufacturer><OUI>20968A</OUI><ProductClass>MJM-01</ProductClass><SerialNumber>CMHI202B8E62</SerialNumber></DeviceId><Event><EventStruct><EventCode>2 PERIODIC</EventCode></EventStruct></Event><MaxEnvelopes>1</MaxEnvelopes><CurrentTime>2026-07-02T12:00:00Z</CurrentTime><RetryCount>0</RetryCount></cwmp:Inform></SOAP-ENV:Body></SOAP-ENV:Envelope>'

echo "=== 1. Health ==="
curl -s "http://127.0.0.1:${PORT}/health" | head -c 200
echo -e "\n"

echo "=== 2. GET /cwmp (probe ONU) ==="
curl -sS -D - -o /dev/null "$URL" | head -5
echo

echo "=== 3. POST Inform ==="
curl -sS -D - -X POST "$URL" \
  -H 'Content-Type: text/xml; charset=utf-8' \
  -d "$INFORM" | head -30
echo

echo "=== 4. POST empty (empty POST sesi) ==="
curl -sS -D - -X POST "$URL" \
  -H 'Content-Type:' \
  -d '' | head -10
echo

echo "=== 5. Via Cloudflare (jika DNS OK) ==="
CF_HEADERS=$(curl -sS -D - -o /tmp/cwmp-cf-body.txt -X POST "https://myacs.teslatech.my.id/cwmp" \
  -H 'Content-Type: text/xml; charset=utf-8' \
  -d "$INFORM" --max-time 15 2>&1) || true
echo "$CF_HEADERS" | head -25
if echo "$CF_HEADERS" | grep -qi '403'; then
  echo ""
  echo ">>> MASALAH: Cloudflare memblokir CWMP (403)."
  if echo "$CF_HEADERS" | grep -qi 'cf-mitigated: challenge'; then
    echo ">>> Penyebab: JavaScript Challenge — ONU tidak bisa lewat."
  fi
  echo ">>> Solusi: Security → WAF → Custom rules → Skip untuk URI Path contains /cwmp"
  echo ">>> Lihat: deploy/CLOUDFLARE.md"
elif echo "$CF_HEADERS" | grep -qi 'InformResponse'; then
  echo ""
  echo ">>> OK: Cloudflare meneruskan CWMP ke MyACS."
fi
head -5 /tmp/cwmp-cf-body.txt 2>/dev/null || true
echo
echo "Selesai. Pantau: pm2 logs myacs | grep cwmp"

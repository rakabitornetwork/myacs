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
curl -sS -D - -X POST "https://myacs.teslatech.my.id/cwmp" \
  -H 'Content-Type: text/xml; charset=utf-8' \
  -d "$INFORM" --max-time 15 | head -20 || echo "(curl cloudflare gagal)"
echo
echo "Selesai. Pantau: pm2 logs myacs | grep cwmp"

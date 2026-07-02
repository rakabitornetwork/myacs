#!/usr/bin/env node
import 'dotenv/config';
import { flattenGenieacsDocument } from '../app/helpers/genieacsParams.js';

const base = (process.env.GENIEACS_NBI_URL || 'http://103.118.175.21:7557').replace(/\/$/, '');
const res = await fetch(`${base}/devices/?projection=_id`);
const ids = await res.json();
console.log('devices:', ids.length);

for (const { _id } of ids) {
  const r = await fetch(`${base}/devices/?query=${encodeURIComponent(JSON.stringify({ _id }))}`);
  const items = await r.json();
  const doc = items[0];
  if (!doc) continue;
  const flat = flattenGenieacsDocument(doc);
  const hostKeys = Object.keys(flat).filter((k) =>
    /Hosts\.Host\.\d+\.(MACAddress|IPAddress|HostName)/i.test(k)
    || /AssociatedDevice\.\d+\.AssociatedDeviceMACAddress/i.test(k),
  );
  if (hostKeys.length) {
    console.log('\nDEVICE', _id);
    hostKeys.forEach((k) => console.log(' ', k, '=', flat[k]));
  }
}

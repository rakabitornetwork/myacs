#!/usr/bin/env node
/**
 * Inspect parameter TR-069 device di GenieACS (MongoDB atau NBI HTTP).
 *
 *   node scripts/genieacs-inspect-device.js 20968a-mjm-01-cmhi202b8e62
 *   GENIEACS_NBI_URL=http://103.118.175.21:7557 node scripts/genieacs-inspect-device.js 20968a-mjm-01-cmhi202b8e62
 */
import 'dotenv/config';
import { inspectGenieacsDevice } from '../app/services/genieacs/importParams.js';
import { extractDeviceInfo } from '../app/helpers/deviceInfo.js';

const deviceId = process.argv[2];
if (!deviceId) {
  console.error('Usage: node scripts/genieacs-inspect-device.js <deviceId>');
  process.exit(1);
}

const uri = process.env.GENIEACS_MONGODB_URI || 'mongodb://127.0.0.1:27017/genieacs';
const nbi = process.env.GENIEACS_NBI_URL || '(not set)';
console.log(`GenieACS MongoDB: ${uri}`);
console.log(`GenieACS NBI: ${nbi}`);
console.log(`Device: ${deviceId}\n`);

const result = await inspectGenieacsDevice(deviceId);
if (!result) {
  console.error('Device tidak ditemukan di koleksi GenieACS devices.');
  process.exit(1);
}

console.log(`Last inform: ${result.lastInform || '—'}`);
console.log(`Info parameters: ${result.paramCount}\n`);

for (const [group, paths] of Object.entries(result.categories)) {
  if (!paths.length) continue;
  console.log(`=== ${group} ===`);
  for (const path of paths) {
    console.log(`  ${path} = ${JSON.stringify(result.values[path])}`);
  }
  console.log('');
}

const info = extractDeviceInfo({
  manufacturer: 'CMHI',
  model: 'MJM-01',
  parameters: result.values,
});

console.log('=== extractDeviceInfo (preview) ===');
console.log(JSON.stringify(info, null, 2));

process.exit(0);

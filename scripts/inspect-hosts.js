#!/usr/bin/env node
import 'dotenv/config';
import { fetchGenieacsDeviceDoc } from '../app/services/genieacs/importParams.js';
import { flattenGenieacsDocument } from '../app/helpers/genieacsParams.js';
import { pickInfoParameters } from '../app/helpers/genieacsParams.js';
import { extractConnectedClients } from '../app/helpers/connectedClients.js';

const deviceId = process.argv[2] || '20968a-mjm-01-cmhi202b8e62';
const doc = await fetchGenieacsDeviceDoc(deviceId);
if (!doc) {
  console.error('Device not found');
  process.exit(1);
}

const flat = flattenGenieacsDocument(doc);
const picked = pickInfoParameters(doc);

console.log('=== LANDevice.1.Hosts (raw) ===');
console.log(JSON.stringify(doc?.InternetGatewayDevice?.LANDevice?.['1']?.Hosts, null, 2));

console.log('\n=== X_CMCC_HostCustomise ===');
console.log(JSON.stringify(doc?.InternetGatewayDevice?.LANDevice?.['1']?.X_CMCC_HostCustomise, null, 2)?.slice(0, 3000));

console.log('\n=== WLAN AssociatedDevice.1 ===');
console.log(JSON.stringify(doc?.InternetGatewayDevice?.LANDevice?.['1']?.WLANConfiguration?.['1']?.AssociatedDevice, null, 2)?.slice(0, 3000));

console.log('\n=== Flat keys matching Host ===');
Object.keys(flat).filter((k) => /Hosts\.Host\.\d|AssociatedDevice\.\d|HostCustomise/i.test(k)).forEach((k) => {
  console.log(k, '=', flat[k]);
});

console.log('\n=== Picked host-related ===');
Object.keys(picked).filter((k) => /host|associated|lease/i.test(k)).forEach((k) => {
  console.log(k, '=', picked[k]);
});

console.log('\n=== extractConnectedClients ===');
console.log(JSON.stringify(extractConnectedClients({ parameters: flat }), null, 2));

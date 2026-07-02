import mongoose from 'mongoose';
import config from '../../config/index.js';
import Device from '../../models/Device.js';
import { pickDeviceSyncParameters, categorizeInfoPaths } from '../../helpers/genieacsParams.js';
import { paramUpdatesFromMap } from '../../helpers/parameters.js';

let genieConn = null;

function nbiBaseUrl() {
  return config.genieacs.nbiUrl?.trim()?.replace(/\/$/, '') || '';
}

async function getGenieConnection() {
  if (!config.genieacs.mongoUri) return null;
  if (genieConn?.readyState === 1) return genieConn;
  genieConn = mongoose.createConnection(config.genieacs.mongoUri);
  await genieConn.asPromise();
  return genieConn;
}

async function fetchGenieacsDeviceFromNbi(deviceId) {
  const base = nbiBaseUrl();
  if (!base) return null;

  const queries = [
    { _id: deviceId },
    { _id: deviceId.toUpperCase() },
    { '_deviceId._SerialNumber': { $regex: deviceId.split('-').pop() || deviceId, $options: 'i' } },
  ];

  for (const query of queries) {
    const url = `${base}/devices/?query=${encodeURIComponent(JSON.stringify(query))}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) continue;
    const items = await res.json();
    if (Array.isArray(items) && items.length) {
      return items.find((d) => String(d._id).toLowerCase() === deviceId.toLowerCase()) || items[0];
    }
  }

  return null;
}

export async function fetchGenieacsDeviceDoc(deviceId) {
  const conn = await getGenieConnection();
  if (conn) {
    const exact = await conn.db.collection('devices').findOne({ _id: deviceId });
    if (exact) return exact;

    const serial = deviceId.split('-').pop();
    if (serial) {
      const bySerial = await conn.db.collection('devices').findOne({
        '_deviceId._SerialNumber': { $regex: serial, $options: 'i' },
      });
      if (bySerial) return bySerial;
    }
  }

  return fetchGenieacsDeviceFromNbi(deviceId);
}

export async function importGenieacsParamsForDevice(deviceId) {
  const doc = await fetchGenieacsDeviceDoc(deviceId);
  if (!doc) {
    return { ok: false, error: 'Device tidak ditemukan di GenieACS (MongoDB/NBI)' };
  }

  const params = pickDeviceSyncParameters(doc);
  const count = Object.keys(params).length;
  if (!count) {
    return { ok: false, error: 'Tidak ada parameter info di GenieACS untuk device ini' };
  }

  await Device.findOneAndUpdate(
    { deviceId },
    { $set: paramUpdatesFromMap(params) },
  );

  return {
    ok: true,
    imported: count,
    genieacsId: doc._id,
    categories: categorizeInfoPaths(params),
    paths: Object.keys(params).sort(),
  };
}

export async function inspectGenieacsDevice(deviceId) {
  const doc = await fetchGenieacsDeviceDoc(deviceId);
  if (!doc) return null;

  const params = pickDeviceSyncParameters(doc);
  return {
    deviceId,
    genieacsId: doc._id,
    lastInform: doc._lastInform || null,
    paramCount: Object.keys(params).length,
    categories: categorizeInfoPaths(params),
    values: params,
  };
}

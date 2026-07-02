import mongoose from 'mongoose';
import config from '../../config/index.js';
import Device from '../../models/Device.js';
import { pickInfoParameters, categorizeInfoPaths } from '../../helpers/genieacsParams.js';
import { paramUpdatesFromMap } from '../../helpers/parameters.js';

let genieConn = null;

async function getGenieConnection() {
  if (!config.genieacs.mongoUri) return null;
  if (genieConn?.readyState === 1) return genieConn;
  genieConn = mongoose.createConnection(config.genieacs.mongoUri);
  await genieConn.asPromise();
  return genieConn;
}

export async function fetchGenieacsDeviceDoc(deviceId) {
  const conn = await getGenieConnection();
  if (!conn) return null;
  return conn.db.collection('devices').findOne({ _id: deviceId });
}

export async function importGenieacsParamsForDevice(deviceId) {
  const doc = await fetchGenieacsDeviceDoc(deviceId);
  if (!doc) {
    return { ok: false, error: 'Device tidak ditemukan di GenieACS MongoDB' };
  }

  const params = pickInfoParameters(doc);
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
    categories: categorizeInfoPaths(params),
    paths: Object.keys(params).sort(),
  };
}

export async function inspectGenieacsDevice(deviceId) {
  const doc = await fetchGenieacsDeviceDoc(deviceId);
  if (!doc) return null;

  const params = pickInfoParameters(doc);
  return {
    deviceId,
    lastInform: doc._lastInform || null,
    paramCount: Object.keys(params).length,
    categories: categorizeInfoPaths(params),
    values: params,
  };
}

import mongoose from 'mongoose';
import config from '../config/index.js';
import Device from '../models/Device.js';
import { pickInfoParameters } from '../helpers/genieacsParams.js';

let genieConn = null;

function getGenieParam(doc, ...paths) {
  for (const path of paths) {
    const val = doc[path];
    if (val !== undefined && val !== null) {
      if (typeof val === 'object' && '_value' in val) return val._value;
      if (typeof val !== 'object') return val;
    }
  }
  return null;
}

function mapGenieDevice(doc) {
  const deviceId = String(doc._id);
  const lastInform = doc._lastInform ? new Date(doc._lastInform) : null;
  const onlineThreshold = Date.now() - config.deviceOfflineMinutes * 60 * 1000;
  const infoParams = pickInfoParameters(doc);

  return {
    deviceId,
    serialNumber:
      getGenieParam(doc, 'Device.DeviceInfo.SerialNumber') ||
      getGenieParam(doc, 'InternetGatewayDevice.DeviceInfo.SerialNumber') ||
      deviceId.split('-').pop(),
    oui: deviceId.split('-')[0] || '',
    productClass: deviceId.split('-')[1] || '',
    manufacturer:
      getGenieParam(doc, 'Device.DeviceInfo.Manufacturer') ||
      getGenieParam(doc, 'InternetGatewayDevice.DeviceInfo.Manufacturer'),
    model:
      getGenieParam(doc, 'Device.DeviceInfo.ModelName') ||
      getGenieParam(doc, 'InternetGatewayDevice.DeviceInfo.ModelName'),
    softwareVersion:
      getGenieParam(doc, 'Device.DeviceInfo.SoftwareVersion') ||
      getGenieParam(doc, 'InternetGatewayDevice.DeviceInfo.SoftwareVersion'),
    hardwareVersion:
      getGenieParam(doc, 'Device.DeviceInfo.HardwareVersion') ||
      getGenieParam(doc, 'InternetGatewayDevice.DeviceInfo.HardwareVersion'),
    connectionRequestUrl:
      getGenieParam(doc, 'Device.ManagementServer.ConnectionRequestURL') ||
      getGenieParam(doc, 'InternetGatewayDevice.ManagementServer.ConnectionRequestURL'),
    ipAddress: getGenieParam(doc, 'Device.IP.Interface.1.IPAddress') || doc._ipAddress || null,
    lastInform,
    isOnline: lastInform ? lastInform.getTime() > onlineThreshold : false,
    tags: [...(doc._tags || []), 'genieacs'],
    source: 'genieacs',
    parameters: infoParams,
  };
}

async function getGenieConnection() {
  if (!config.genieacs.mongoUri) return null;
  if (genieConn?.readyState === 1) return genieConn;

  genieConn = mongoose.createConnection(config.genieacs.mongoUri);
  await genieConn.asPromise();
  return genieConn;
}

export async function syncDevicesFromGenieacs() {
  if (!config.genieacs.syncEnabled || !config.genieacs.mongoUri) {
    return { synced: 0, removed: 0 };
  }

  const conn = await getGenieConnection();
  if (!conn) return { synced: 0, removed: 0 };

  const collection = conn.db.collection('devices');
  const genieDevices = await collection.find({}).toArray();
  const genieIds = new Set();

  let synced = 0;
  for (const doc of genieDevices) {
    const mapped = mapGenieDevice(doc);
    genieIds.add(mapped.deviceId);

    const existing = await Device.findOne({ deviceId: mapped.deviceId });
    if (existing?.source === 'myacs') {
      continue;
    }

    await Device.findOneAndUpdate(
      { deviceId: mapped.deviceId },
      { $set: mapped },
      { upsert: true },
    );
    synced++;
  }

  const removed = await Device.deleteMany({
    source: 'genieacs',
    deviceId: { $nin: [...genieIds] },
  });

  return { synced, removed: removed.deletedCount || 0 };
}

export function startGenieacsSyncJob() {
  if (!config.genieacs.syncEnabled || !config.genieacs.mongoUri) return;

  const intervalMs = config.genieacs.syncIntervalMinutes * 60 * 1000;

  const tick = async () => {
    try {
      const { synced, removed } = await syncDevicesFromGenieacs();
      if (synced > 0 || removed > 0) {
        console.log(`[genieacs-sync] synced ${synced}, removed ${removed} device(s)`);
      }
    } catch (err) {
      console.error('[genieacs-sync] error:', err.message);
    }
  };

  tick();
  setInterval(tick, intervalMs);
  console.log(`[genieacs-sync] every ${config.genieacs.syncIntervalMinutes}m from ${config.genieacs.mongoUri}`);
}

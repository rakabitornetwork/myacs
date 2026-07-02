import Task from '../../models/Task.js';
import { getDeviceInfoFetchPaths, deviceInfoIsComplete, extractDeviceInfo } from '../../helpers/deviceInfo.js';
import { getConnectedClientsFetchPaths } from '../../helpers/connectedClients.js';

const REFRESH_TASK_NAME = 'Refresh device info';
const REFRESH_COOLDOWN_MS = parseInt(process.env.DEVICE_INFO_REFRESH_COOLDOWN_MS || '1800000', 10);

function getDeviceRefreshFetchPaths() {
  return [...new Set([...getDeviceInfoFetchPaths(), ...getConnectedClientsFetchPaths()])];
}

export { getDeviceRefreshFetchPaths };

export async function queueDeviceInfoRefresh(device, { force = false } = {}) {
  if (!device?.deviceId || device.source === 'genieacs') return false;

  const info = extractDeviceInfo(device);
  if (!force && deviceInfoIsComplete(info)) return false;

  const recent = await Task.findOne({
    deviceId: device.deviceId,
    name: REFRESH_TASK_NAME,
    status: { $in: ['pending', 'running'] },
  });
  if (recent) return false;

  if (!force) {
    const cooldown = await Task.findOne({
      deviceId: device.deviceId,
      name: REFRESH_TASK_NAME,
      createdAt: { $gte: new Date(Date.now() - REFRESH_COOLDOWN_MS) },
    });
    if (cooldown) return false;
  }

  await Task.create({
    deviceId: device.deviceId,
    name: REFRESH_TASK_NAME,
    method: 'GetParameterValues',
    payload: { names: getDeviceRefreshFetchPaths() },
    priority: 1,
  });

  return true;
}

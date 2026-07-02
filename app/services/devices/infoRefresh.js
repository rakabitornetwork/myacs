import Task from '../../models/Task.js';
import { deviceInfoIsComplete, extractDeviceInfo } from '../../helpers/deviceInfo.js';
import { getDeviceRefreshFetchPaths, resolveDeviceRefreshFetchPaths } from '../../helpers/refreshPaths.js';

const REFRESH_TASK_NAME = 'Refresh device info';
const REFRESH_COOLDOWN_MS = parseInt(process.env.DEVICE_INFO_REFRESH_COOLDOWN_MS || '1800000', 10);

export { getDeviceRefreshFetchPaths, resolveDeviceRefreshFetchPaths };

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

  const paths = resolveDeviceRefreshFetchPaths(device);
  await Task.insertMany(
    paths.map((name) => ({
      deviceId: device.deviceId,
      name: REFRESH_TASK_NAME,
      method: 'GetParameterValues',
      payload: { names: [name] },
      priority: 1,
    })),
  );

  return true;
}

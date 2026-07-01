import Task from '../../models/Task.js';
import Device from '../../models/Device.js';
import { sendConnectionRequest } from '../connectionRequest.js';
import { isGenieacsDevice } from '../../helpers/acs.js';

function getDeviceParam(device, key) {
  const params = device.parameters || {};
  if (params instanceof Map) return params.get(key);
  return params[key];
}

export async function wakeDeviceConnection(device) {
  if (!device?.connectionRequestUrl || isGenieacsDevice(device)) return { ok: false, skipped: true };

  try {
    const result = await sendConnectionRequest(device.connectionRequestUrl, {
      username: getDeviceParam(device, 'Device.ManagementServer.ConnectionRequestUsername') || '',
      password: getDeviceParam(device, 'Device.ManagementServer.ConnectionRequestPassword') || '',
    });
    return { ok: result.ok, status: result.status };
  } catch (err) {
    console.warn(`[task] connection request failed for ${device.deviceId}:`, err.message);
    return { ok: false, error: err.message };
  }
}

export async function createTaskForDevice(device, taskData, { wake = true } = {}) {
  const task = await Task.create({
    deviceId: device.deviceId,
    ...taskData,
  });

  if (wake && !isGenieacsDevice(device)) {
    await wakeDeviceConnection(device);
  }

  return task;
}

export async function countPendingTasks(deviceId) {
  return Task.countDocuments({ deviceId, status: 'pending' });
}

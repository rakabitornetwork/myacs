import Task from '../../models/Task.js';
import Device from '../../models/Device.js';
import { sendConnectionRequest } from '../connectionRequest.js';
import { getConnectionRequestCredentials, hasConnectionRequestCredentials, CR_CREDENTIAL_PARAM_NAMES } from '../../helpers/connectionRequestCreds.js';

export async function queueFetchConnectionRequestCredentials(device) {
  return createTaskForDevice(
    device,
    {
      name: 'Get Connection Request credentials',
      method: 'GetParameterValues',
      payload: { names: CR_CREDENTIAL_PARAM_NAMES },
    },
    { wake: true },
  );
}

export async function markConnectionRequestSent(deviceId) {
  await Device.updateOne({ deviceId }, { $set: { lastConnectionRequestAt: new Date() } });
}

export async function wakeDeviceConnection(device) {
  if (!device?.connectionRequestUrl) return { ok: false, skipped: true };

  try {
    const credentials = getConnectionRequestCredentials(device);
    const result = await sendConnectionRequest(device.connectionRequestUrl, credentials);
    if (result.ok) {
      await markConnectionRequestSent(device.deviceId);
    }
    return { ok: result.ok, status: result.status, hint: result.hint };
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

  if (wake) {
    await wakeDeviceConnection(device);
  }

  return task;
}

export async function countPendingTasks(deviceId) {
  return Task.countDocuments({ deviceId, status: 'pending' });
}

/**
 * Re-send Connection Request for a device that has stale pending tasks.
 * Called by the sweep job after retryOrFailStalePendingTasks increments retries.
 */
export async function retryWakeForPendingTasks(deviceId) {
  const device = await Device.findOne({ deviceId }).lean();
  if (!device) return { ok: false, error: 'device not found' };

  const result = await wakeDeviceConnection(device);
  if (result.ok) {
    console.log(`[task] retry connection request OK for ${deviceId}`);
  } else if (!result.skipped) {
    console.warn(`[task] retry connection request failed for ${deviceId}:`, result.error || result.hint || result.status);
  }
  return result;
}

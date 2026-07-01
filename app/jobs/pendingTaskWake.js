import Task from '../models/Task.js';
import Device from '../models/Device.js';
import CwmpSession from '../models/CwmpSession.js';
import { wakeDeviceConnection } from '../services/tasks/queue.js';
import { getStalePendingDeviceIds, retryOrFailStalePendingTasks } from '../services/tasks/lifecycle.js';

const WAKE_INTERVAL_MS = parseInt(process.env.PENDING_TASK_WAKE_MS || '120000', 10);

export function startPendingTaskWakeJob() {
  const tick = async () => {
    try {
      // 1) Normal wake: send Connection Request for ALL devices with pending tasks
      const deviceIds = await Task.distinct('deviceId', { status: 'pending' });
      if (!deviceIds.length) return;

      for (const deviceId of deviceIds) {
        const device = await Device.findOne({ deviceId }).lean();
        if (device) {
          const result = await wakeDeviceConnection(device);
          if (result.ok) {
            await CwmpSession.updateOne({ deviceId }, { awaitingDispatch: true });
            console.log(`[jobs] connection request sent for pending tasks: ${deviceId}`);
          }
        }
      }

      // 2) Stale check: retry or fault tasks that have been pending too long
      const staleDeviceIds = await getStalePendingDeviceIds();
      for (const deviceId of staleDeviceIds) {
        const { retried, faulted } = await retryOrFailStalePendingTasks(deviceId);
        if (retried > 0) {
          console.log(`[jobs] ${deviceId}: retried ${retried} stale pending task(s) — re-sending connection request`);
        }
        if (faulted > 0) {
          console.log(`[jobs] ${deviceId}: faulted ${faulted} stale pending task(s) (max retries exceeded)`);
        }
      }
    } catch (err) {
      console.error('[jobs] pending task wake error:', err.message);
    }
  };

  tick();
  setInterval(tick, WAKE_INTERVAL_MS);
  console.log(`[jobs] pending task wake every ${WAKE_INTERVAL_MS / 1000}s`);
}


import Task from '../models/Task.js';
import Device from '../models/Device.js';
import { wakeDeviceConnection } from '../services/tasks/queue.js';

const WAKE_INTERVAL_MS = parseInt(process.env.PENDING_TASK_WAKE_MS || '120000', 10);

export function startPendingTaskWakeJob() {
  const tick = async () => {
    try {
      const deviceIds = await Task.distinct('deviceId', { status: 'pending' });
      if (!deviceIds.length) return;

      for (const deviceId of deviceIds) {
        const device = await Device.findOne({ deviceId }).lean();
        if (device) {
          const result = await wakeDeviceConnection(device);
          if (result.ok) {
            console.log(`[jobs] connection request sent for pending tasks: ${deviceId}`);
          }
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

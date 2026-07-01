import Task from '../../models/Task.js';
import Device from '../../models/Device.js';

const RUNNING_STALE_MINUTES = parseInt(process.env.TASK_RUNNING_STALE_MINUTES || '5', 10);
const PENDING_STALE_MINUTES = parseInt(process.env.TASK_PENDING_STALE_MINUTES || '10', 10);

export async function releaseStaleRunningTasks(deviceId) {
  const cutoff = new Date(Date.now() - RUNNING_STALE_MINUTES * 60_000);
  const result = await Task.updateMany(
    {
      deviceId,
      status: 'running',
      updatedAt: { $lt: cutoff },
    },
    {
      $set: {
        status: 'fault',
        fault: `Task running lebih dari ${RUNNING_STALE_MINUTES} menit tanpa respons CPE — antrikan ulang.`,
        completedAt: new Date(),
      },
    },
  );
  return result.modifiedCount;
}

export async function completeRebootTasksOnBoot(deviceId) {
  const result = await Task.updateMany(
    { deviceId, method: 'Reboot', status: 'running' },
    {
      $set: {
        status: 'completed',
        completedAt: new Date(),
        result: { note: 'CPE BOOT setelah Reboot' },
      },
    },
  );
  return result.modifiedCount;
}

/**
 * Also complete pending Reboot tasks on BOOT.
 * Covers the case where the task was never dispatched (stayed pending)
 * but the CPE rebooted anyway (e.g. manual reboot or power cycle).
 */
export async function completePendingRebootTasksOnBoot(deviceId) {
  const result = await Task.updateMany(
    { deviceId, method: 'Reboot', status: 'pending' },
    {
      $set: {
        status: 'completed',
        completedAt: new Date(),
        result: { note: 'CPE BOOT — task pending diselesaikan otomatis' },
      },
    },
  );
  return result.modifiedCount;
}

/**
 * Find all distinct deviceIds that have stale pending tasks.
 */
export async function getStalePendingDeviceIds() {
  const cutoff = new Date(Date.now() - PENDING_STALE_MINUTES * 60_000);
  return Task.distinct('deviceId', {
    status: 'pending',
    updatedAt: { $lt: cutoff },
  });
}

/**
 * For a given device, retry or fail stale pending tasks.
 * - If retries < maxRetries: increment retries, touch updatedAt (so the next sweep gives it another interval)
 * - If retries >= maxRetries: mark as fault
 * Returns { retried, faulted }
 */
export async function retryOrFailStalePendingTasks(deviceId) {
  const cutoff = new Date(Date.now() - PENDING_STALE_MINUTES * 60_000);
  const staleTasks = await Task.find({
    deviceId,
    status: 'pending',
    updatedAt: { $lt: cutoff },
  });

  let retried = 0;
  let faulted = 0;

  for (const task of staleTasks) {
    if (task.retries >= task.maxRetries) {
      task.status = 'fault';
      task.fault = `Task pending lebih dari ${PENDING_STALE_MINUTES * (task.maxRetries + 1)} menit — CPE tidak merespons Connection Request setelah ${task.maxRetries} percobaan ulang.`;
      task.completedAt = new Date();
      await task.save();
      faulted++;
    } else {
      task.retries += 1;
      // Touch updatedAt so the next sweep waits another interval
      await task.save();
      retried++;
    }
  }

  return { retried, faulted };
}

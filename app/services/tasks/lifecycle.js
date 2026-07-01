import Task from '../models/Task.js';

const RUNNING_STALE_MINUTES = parseInt(process.env.TASK_RUNNING_STALE_MINUTES || '5', 10);

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

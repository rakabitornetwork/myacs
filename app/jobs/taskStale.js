import Task from '../../models/Task.js';
import config from '../config/index.js';

const STALE_MINUTES = parseInt(process.env.TASK_STALE_MINUTES || '60', 10);

export function startTaskStaleJob() {
  const intervalMs = 5 * 60_000;

  const tick = async () => {
    try {
      const cutoff = new Date(Date.now() - STALE_MINUTES * 60 * 1000);
      const result = await Task.updateMany(
        {
          status: { $in: ['pending', 'running'] },
          createdAt: { $lt: cutoff },
        },
        {
          $set: {
            status: 'fault',
            fault: `Task expired after ${STALE_MINUTES} minutes — CPE tidak merespons. Coba Connection Request lalu antrikan ulang.`,
            completedAt: new Date(),
          },
        },
      );
      if (result.modifiedCount > 0) {
        console.log(`[jobs] expired ${result.modifiedCount} stale task(s)`);
      }
    } catch (err) {
      console.error('[jobs] task stale error:', err.message);
    }
  };

  tick();
  setInterval(tick, intervalMs);
  console.log(`[jobs] task stale checker every ${intervalMs / 1000}s (threshold ${STALE_MINUTES}m)`);
}

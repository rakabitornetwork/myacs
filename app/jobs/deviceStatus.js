import config from '../config/index.js';
import Device from '../models/Device.js';

export function startDeviceStatusJob() {
  const intervalMs = 60_000;

  const tick = async () => {
    try {
      const cutoff = new Date(Date.now() - config.deviceOfflineMinutes * 60 * 1000);
      const result = await Device.updateMany(
        { isOnline: true, lastInform: { $lt: cutoff } },
        { $set: { isOnline: false } },
      );
      if (result.modifiedCount > 0) {
        console.log(`[jobs] marked ${result.modifiedCount} device(s) offline`);
      }
    } catch (err) {
      console.error('[jobs] device status error:', err.message);
    }
  };

  tick();
  setInterval(tick, intervalMs);
  console.log(
    `[jobs] device offline checker every ${intervalMs / 1000}s (threshold ${config.deviceOfflineMinutes}m)`,
  );
}

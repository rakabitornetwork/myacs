import mongoose from 'mongoose';
import config from '../config/index.js';
import { validateConfig } from '../config/validate.js';
import { getCwmpPublicUrl } from '../helpers/acs.js';

export async function healthCheck() {
  const checks = {
    mongodb: false,
    cwmpEnabled: config.cwmp.enabled,
    cwmpUrl: getCwmpPublicUrl(),
    uptime: Math.floor(process.uptime()),
    version: process.env.npm_package_version || '1.0.0',
  };

  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      checks.mongodb = true;
    }
  } catch {
    checks.mongodb = false;
  }

  const configResult = validateConfig();
  const healthy = checks.mongodb && configResult.ok;

  return {
    status: healthy ? 'ok' : 'degraded',
    checks,
    config: {
      warnings: configResult.warnings,
      errors: configResult.errors,
    },
  };
}

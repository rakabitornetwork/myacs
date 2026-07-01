import mongoose from 'mongoose';
import config from '../config/index.js';
import { validateConfig } from '../config/validate.js';

export async function healthCheck() {
  const checks = {
    mongodb: false,
    genieacsMongo: null,
    acsMode: config.acsMode,
    cwmpEnabled: config.cwmp.enabled,
    cwmpUrl: config.cwmp.enabled ? `${config.appUrl}${config.cwmp.path}` : null,
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

  if (config.genieacs.syncEnabled && config.genieacs.mongoUri) {
    try {
      const conn = mongoose.createConnection(config.genieacs.mongoUri, {
        serverSelectionTimeoutMS: 3000,
      });
      await conn.asPromise();
      await conn.db.admin().ping();
      checks.genieacsMongo = true;
      await conn.close();
    } catch {
      checks.genieacsMongo = false;
    }
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

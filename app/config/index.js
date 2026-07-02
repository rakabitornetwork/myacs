import dotenv from 'dotenv';

dotenv.config();

/**
 * ACS_MODE:
 * - standalone  → hanya MyACS CWMP
 * - dual        → MyACS + GenieACS paralel (CPE terpisah), panel terpadu
 * - genieacs-panel → hanya panel, CWMP di GenieACS
 */
function resolveAcsMode() {
  const explicit = process.env.ACS_MODE?.trim().toLowerCase();
  if (explicit && ['standalone', 'dual', 'genieacs-panel'].includes(explicit)) {
    return explicit;
  }

  if (process.env.GENIEACS_COEXIST === 'true') {
    return process.env.CWMP_ENABLED === 'false' ? 'genieacs-panel' : 'dual';
  }

  return 'standalone';
}

const acsMode = resolveAcsMode();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/myacs',
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret',
  acsMode,
  cwmp: {
    path: process.env.CWMP_PATH || '/cwmp',
    enabled: acsMode === 'dual' || acsMode === 'standalone',
    /** URL lengkap untuk CPE (ONU) — bisa beda protokol dari APP_URL panel */
    publicUrl: (process.env.CWMP_PUBLIC_URL || '').trim(),
    crUsername: process.env.CWMP_CR_USERNAME || '',
    crPassword: process.env.CWMP_CR_PASSWORD || '',
    crAutoProvision: process.env.CWMP_CR_AUTO_PROVISION === 'true',
  },
  genieacs: {
    syncEnabled: acsMode === 'dual' || acsMode === 'genieacs-panel',
    mongoUri: process.env.GENIEACS_MONGODB_URI || '',
    syncIntervalMinutes: parseInt(process.env.GENIEACS_SYNC_INTERVAL || '5', 10),
    cwmpUrl: process.env.GENIEACS_CWMP_URL || '',
    nbiUrl: process.env.GENIEACS_NBI_URL || '',
  },
  deviceOfflineMinutes: parseInt(process.env.DEVICE_OFFLINE_MINUTES || '15', 10),
  uploadMaxMb: parseInt(process.env.UPLOAD_MAX_MB || '100', 10),
  isProduction: process.env.NODE_ENV === 'production',
};

export default config;

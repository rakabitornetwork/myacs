import dotenv from 'dotenv';

dotenv.config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/myacs',
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret',
  cwmp: {
    path: process.env.CWMP_PATH || '/cwmp',
    enabled: process.env.CWMP_ENABLED !== 'false',
    /** URL lengkap untuk CPE (ONU) — bisa beda protokol dari APP_URL panel */
    publicUrl: (process.env.CWMP_PUBLIC_URL || '').trim(),
    crUsername: process.env.CWMP_CR_USERNAME || '',
    crPassword: process.env.CWMP_CR_PASSWORD || '',
    crAutoProvision: process.env.CWMP_CR_AUTO_PROVISION === 'true',
  },
  deviceOfflineMinutes: parseInt(process.env.DEVICE_OFFLINE_MINUTES || '15', 10),
  uploadMaxMb: parseInt(process.env.UPLOAD_MAX_MB || '100', 10),
  isProduction: process.env.NODE_ENV === 'production',
};

export default config;

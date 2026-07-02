import config from './index.js';

const PLACEHOLDER_SECRETS = [
  'dev-secret',
  'myacs-dev-session-secret-change-in-production',
  'ganti-dengan-string-acak-panjang',
];

export function validateConfig({ production = config.isProduction } = {}) {
  const errors = [];
  const warnings = [];

  if (production) {
    if (PLACEHOLDER_SECRETS.includes(config.sessionSecret)) {
      errors.push('SESSION_SECRET masih default — ganti dengan string acak panjang di .env');
    }

    if (!config.appUrl.startsWith('https://')) {
      warnings.push('APP_URL sebaiknya HTTPS di production (CPE & session cookie)');
    }

    if (config.sessionSecret.length < 32) {
      warnings.push('SESSION_SECRET disarankan minimal 32 karakter');
    }
  }

  return { errors, warnings, ok: errors.length === 0 };
}

export function logConfigValidation() {
  const { errors, warnings, ok } = validateConfig();

  for (const w of warnings) {
    console.warn(`[myacs] config warning: ${w}`);
  }

  for (const e of errors) {
    console.error(`[myacs] config error: ${e}`);
  }

  if (!ok && config.isProduction) {
    console.error('[myacs] production startup dibatalkan — perbaiki .env terlebih dahulu');
    process.exit(1);
  }

  return ok;
}

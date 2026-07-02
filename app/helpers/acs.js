import config from '../config/index.js';

export function isGenieacsNbiConfigured() {
  return Boolean(config.genieacs.nbiUrl?.trim());
}

/** URL ACS untuk CPE — gunakan CWMP_PUBLIC_URL jika di-set, else APP_URL + path */
export function resolveCwmpPublicUrl({ publicUrl, appUrl, path, enabled }) {
  if (!enabled) return null;
  if (publicUrl?.trim()) {
    return publicUrl.trim().replace(/\/$/, '');
  }
  const base = (appUrl || '').replace(/\/$/, '');
  return `${base}${path || '/cwmp'}`;
}

export function getCwmpPublicUrl() {
  return resolveCwmpPublicUrl({
    publicUrl: config.cwmp.publicUrl,
    appUrl: config.appUrl,
    path: config.cwmp.path,
    enabled: config.cwmp.enabled,
  });
}

export function acsInfoForClient() {
  return {
    mode: config.acsMode,
    cwmpEnabled: config.cwmp.enabled,
    cwmpUrl: getCwmpPublicUrl(),
    appUrl: config.appUrl,
    genieacsCwmpUrl: config.genieacs.cwmpUrl || null,
    genieacsNbiUrl: config.genieacs.nbiUrl || null,
    genieacsNbiConfigured: isGenieacsNbiConfigured(),
    syncEnabled: config.genieacs.syncEnabled,
  };
}

export function isGenieacsDevice(device) {
  return device?.source === 'genieacs';
}

export function isMyacsDevice(device) {
  return !device?.source || device.source === 'myacs';
}

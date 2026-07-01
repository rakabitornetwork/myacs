import config from '../config/index.js';

export function isGenieacsNbiConfigured() {
  return Boolean(config.genieacs.nbiUrl?.trim());
}

export function acsInfoForClient() {
  return {
    mode: config.acsMode,
    cwmpEnabled: config.cwmp.enabled,
    cwmpUrl: config.cwmp.enabled ? `${config.appUrl}${config.cwmp.path}` : null,
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

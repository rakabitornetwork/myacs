import { flattenParameterMap } from './parameters.js';

const PARAM_PATHS = {
  pppoeUsername: [
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username',
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Username',
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.2.Username',
    'Device.PPP.Interface.1.Username',
  ],
  pppoePassword: [
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Password',
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Password',
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.2.Password',
    'Device.PPP.Interface.1.Password',
  ],
  ssid: [
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID',
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.SSID',
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.3.SSID',
    'Device.WiFi.SSID.1.SSID',
    'Device.WiFi.Radio.1.SSID',
  ],
  ssidPassword: [
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.PreSharedKey',
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase',
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.PreSharedKey.1.PreSharedKey',
    'Device.WiFi.AccessPoint.1.Security.KeyPassphrase',
    'Device.WiFi.AccessPoint.1.Security.X_CMCC_KeyPassphrase',
  ],
  temperature: [
    'InternetGatewayDevice.DeviceInfo.Temperature',
    'InternetGatewayDevice.X_CMHI_DeviceInfo.Temperature',
    'InternetGatewayDevice.WANDevice.1.X_CMHI_GponInterfaceConfig.TransceiverTemperature',
    'Device.DeviceInfo.TemperatureStatus.Temperature',
    'Device.Optical.Interface.1.Temperature',
  ],
  rxPower: [
    'InternetGatewayDevice.WANDevice.1.X_CMHI_GponInterfaceConfig.RXPower',
    'InternetGatewayDevice.WANDevice.1.X_CMHI_GponInterfaceConfig.RxPower',
    'InternetGatewayDevice.X_CMHI_Optical.RxPower',
    'InternetGatewayDevice.X_CMHI_Optical.Diagnostic.RXPower',
    'Device.Optical.Interface.1.RxPower',
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.X_CMHI_RxPower',
  ],
};

const FUZZY_OR = {
  pppoeUsername: [['wanpppconnection', 'username']],
  pppoePassword: [['wanpppconnection', 'password']],
  ssid: [['wlanconfiguration', 'ssid'], ['wifi', 'ssid']],
  ssidPassword: [['keypassphrase'], ['presharedkey']],
  temperature: [['temperature']],
  rxPower: [['rxpower']],
};

export function getDeviceInfoParamPaths() {
  return [...new Set(Object.values(PARAM_PATHS).flat())];
}

function findParamValue(flat, field) {
  const exact = PARAM_PATHS[field] || [];
  for (const path of exact) {
    const val = flat[path];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val).trim();
    }
  }

  const groups = FUZZY_OR[field] || [];
  for (const parts of groups) {
    for (const [key, val] of Object.entries(flat)) {
      if (val === undefined || val === null || String(val).trim() === '') continue;
      const lower = key.toLowerCase();
      if (parts.every((part) => lower.includes(part.toLowerCase()))) {
        return String(val).trim();
      }
    }
  }

  return '';
}

export function maskSecret(value) {
  if (!value) return '';
  if (value.length <= 2) return '••';
  return `${value.slice(0, 1)}${'•'.repeat(Math.min(value.length - 1, 8))}`;
}

export function formatRxPower(value) {
  if (!value) return '';
  const num = parseFloat(String(value).replace(/[^\d.-]/g, ''));
  if (Number.isNaN(num)) return value;
  return `${num.toFixed(2)} dBm`;
}

export function formatTemperature(value) {
  if (!value) return '';
  const num = parseFloat(String(value).replace(/[^\d.-]/g, ''));
  if (Number.isNaN(num)) return value;
  return `${num.toFixed(1)} °C`;
}

export function extractDeviceInfo(device) {
  const flat = flattenParameterMap(device?.parameters);

  const pppoeUsername = findParamValue(flat, 'pppoeUsername');
  const pppoePassword = findParamValue(flat, 'pppoePassword');
  const ssid = findParamValue(flat, 'ssid');
  const ssidPassword = findParamValue(flat, 'ssidPassword');
  const temperatureRaw = findParamValue(flat, 'temperature');
  const rxPowerRaw = findParamValue(flat, 'rxPower');

  return {
    brand: device?.manufacturer || '',
    onuType: device?.model || device?.productClass || '',
    pppoeUsername,
    pppoePassword,
    pppoePasswordMasked: maskSecret(pppoePassword),
    ssid,
    ssidPassword,
    ssidPasswordMasked: maskSecret(ssidPassword),
    temperature: formatTemperature(temperatureRaw),
    temperatureRaw,
    rxPower: formatRxPower(rxPowerRaw),
    rxPowerRaw,
  };
}

export function deviceInfoIsComplete(info) {
  return !!(info.pppoeUsername && info.ssid && (info.rxPowerRaw || info.temperatureRaw));
}

import { flattenParameterMap } from './parameters.js';

const USERNAME_KEYS = [
  'InternetGatewayDevice.ManagementServer.ConnectionRequestUsername',
  'Device.ManagementServer.ConnectionRequestUsername',
];

const PASSWORD_KEYS = [
  'InternetGatewayDevice.ManagementServer.ConnectionRequestPassword',
  'Device.ManagementServer.ConnectionRequestPassword',
];

export function getDeviceParametersMap(device) {
  const params = device?.parameters;
  if (!params) return {};
  if (params instanceof Map) return Object.fromEntries(params);
  return typeof params === 'object' ? params : {};
}

export function getConnectionRequestCredentials(device) {
  const flat = flattenParameterMap(getDeviceParametersMap(device));

  let username = '';
  let password = '';

  for (const key of USERNAME_KEYS) {
    if (flat[key]) {
      username = String(flat[key]);
      break;
    }
  }

  for (const key of PASSWORD_KEYS) {
    if (flat[key] !== undefined && flat[key] !== '') {
      password = String(flat[key]);
      break;
    }
  }

  return { username, password };
}

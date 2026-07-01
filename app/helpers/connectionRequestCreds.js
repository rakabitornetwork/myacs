import config from '../config/index.js';
import { flattenParameterMap } from './parameters.js';

const USERNAME_KEYS = [
  'InternetGatewayDevice.ManagementServer.ConnectionRequestUsername',
  'Device.ManagementServer.ConnectionRequestUsername',
];

const PASSWORD_KEYS = [
  'InternetGatewayDevice.ManagementServer.ConnectionRequestPassword',
  'Device.ManagementServer.ConnectionRequestPassword',
];

export const CR_CREDENTIAL_PARAM_NAMES = [
  ...USERNAME_KEYS,
  ...PASSWORD_KEYS,
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

  if (device?.connectionRequestUrl) {
    try {
      const parsed = new URL(device.connectionRequestUrl);
      if (!username && parsed.username) username = decodeURIComponent(parsed.username);
      if (!password && parsed.password) password = decodeURIComponent(parsed.password);
    } catch {
      // ignore invalid URL
    }
  }

  if (!username && config.cwmp.crUsername) username = config.cwmp.crUsername;
  if (!password && config.cwmp.crPassword) password = config.cwmp.crPassword;

  return { username, password };
}

export function hasConnectionRequestCredentials(credentials) {
  return Boolean(credentials?.username) || Boolean(credentials?.password);
}

export function connectionRequestCredentialStatus(device) {
  const flat = flattenParameterMap(getDeviceParametersMap(device));
  const fromDevice = {
    username: USERNAME_KEYS.some((k) => Boolean(flat[k])),
    password: PASSWORD_KEYS.some((k) => flat[k] !== undefined && flat[k] !== ''),
  };
  const credentials = getConnectionRequestCredentials(device);

  return {
    fromDevice,
    fromEnv: {
      username: Boolean(config.cwmp.crUsername),
      password: Boolean(config.cwmp.crPassword),
    },
    ready: hasConnectionRequestCredentials(credentials),
    username: credentials.username ? '••••' : null,
    hasPassword: Boolean(credentials.password),
  };
}

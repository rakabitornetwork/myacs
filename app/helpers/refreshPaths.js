import { flattenParameterMap } from './parameters.js';
import { getDeviceInfoFetchPaths } from './deviceInfo.js';
import { getConnectedClientsFetchPaths } from './connectedClients.js';

const CORE_IGD_PATHS = [
  'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.',
  'InternetGatewayDevice.LANDevice.1.WLANConfiguration.',
  'InternetGatewayDevice.LANDevice.1.Hosts.',
  'InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.',
  'InternetGatewayDevice.DeviceInfo.',
];

const CORE_DEVICE_PATHS = [
  'Device.DeviceInfo.',
  'Device.Hosts.',
  'Device.WiFi.AccessPoint.',
];

function getAllCandidatePaths() {
  return [...new Set([...getDeviceInfoFetchPaths(), ...getConnectedClientsFetchPaths()])];
}

function subtreePrefix(path) {
  return path.replace(/\.$/, '');
}

function hasSubtree(keys, path) {
  const prefix = subtreePrefix(path);
  return keys.some((key) => key === prefix || key.startsWith(`${prefix}.`));
}

function detectVendor(keys) {
  const joined = keys.join('\n');
  return {
    cmcc: /X_CMCC/i.test(joined),
    cmhi: /X_CMHI/i.test(joined),
    igd: keys.some((key) => key.startsWith('InternetGatewayDevice.')),
    device: keys.some((key) => key.startsWith('Device.')),
  };
}

function isVendorSpecificPath(path) {
  return /X_CMCC|X_CMHI|X_GponInterfaceConfig|WANOpticalInterface/i.test(path);
}

function pathAllowedForVendor(path, vendor) {
  if (/X_CMCC/i.test(path)) return vendor.cmcc;
  if (/X_CMHI/i.test(path)) return vendor.cmhi;
  if (/X_GponInterfaceConfig/i.test(path)) return !vendor.cmcc && !vendor.cmhi;
  return true;
}

function pathAllowedForModel(path, vendor) {
  if (path.startsWith('InternetGatewayDevice.')) {
    return vendor.igd || (!vendor.device && !vendor.igd);
  }
  if (path.startsWith('Device.')) {
    return vendor.device && !vendor.igd;
  }
  return true;
}

/**
 * Pilih subtree yang aman untuk GetParameterValues berdasarkan parameter device yang sudah ada.
 * Menghindari path vendor/model yang tidak ada agar CPE tidak fault (mis. kode 9005).
 */
export function resolveDeviceRefreshFetchPaths(device) {
  const candidates = getAllCandidatePaths();
  const keys = Object.keys(flattenParameterMap(device?.parameters || {}));

  if (keys.length === 0) {
    return [...CORE_IGD_PATHS];
  }

  const vendor = detectVendor(keys);

  const filtered = candidates.filter((path) => {
    if (!pathAllowedForModel(path, vendor)) return false;
    if (!pathAllowedForVendor(path, vendor)) return false;
    if (hasSubtree(keys, path)) return true;
    if (CORE_IGD_PATHS.includes(path) && (vendor.igd || !vendor.device)) return true;
    if (CORE_DEVICE_PATHS.includes(path) && vendor.device && !vendor.igd) return true;
    if (isVendorSpecificPath(path)) return false;
    return false;
  });

  if (filtered.length === 0) {
    return vendor.device && !vendor.igd ? [...CORE_DEVICE_PATHS] : [...CORE_IGD_PATHS];
  }

  return filtered;
}

export function getDeviceRefreshFetchPaths(device) {
  return resolveDeviceRefreshFetchPaths(device);
}

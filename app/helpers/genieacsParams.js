/** Flatten GenieACS MongoDB / NBI device document → { path: value } */

const SKIP_KEYS = new Set(['_id', '_deviceId', '_lastInform', '_registered', '_tags', '_timestamp', '_lastBootstrap', '_lastBoot']);

export const INFO_PARAM_PATTERNS = [
  /wlanconfiguration\.\d+\.ssid$/i,
  /wlanconfiguration\.\d+\.enable$/i,
  /keypassphrase/i,
  /wpakeypassphrase/i,
  /presharedkey/i,
  /wanpppconnection\.\d+\.username$/i,
  /wanpppconnection\.\d+\.password$/i,
  /rxpower/i,
  /txpower/i,
  /receivepower/i,
  /opticalsignallevel/i,
  /transceivertemperature/i,
  /gponinterfaceconfig/i,
  /eponinterfaceconfig/i,
  /x_cmhi/i,
  /x_cmcc/i,
  /x_gponinterfaceconfig/i,
  /x_alu_ontopticalparam/i,
  /wanopticalinterface/i,
  /deviceinfo\.temperature$/i,
  /hosts\.host\.\d+/i,
  /associateddevice\.\d+/i,
  /hostnumberofentries/i,
  /totalassociations$/i,
  /^virtualparameters\./i,
];

function genieScalar(entry) {
  if (entry === null || entry === undefined) return '';
  if (typeof entry !== 'object') return String(entry);
  if ('_value' in entry) return entry._value === null || entry._value === undefined ? '' : String(entry._value);
  if ('#text' in entry) return String(entry['#text'] ?? '');
  return null;
}

function flattenGenieacsNestedTree(input, prefix = '', out = {}) {
  if (input === null || input === undefined) return out;

  const scalar = genieScalar(input);
  if (scalar !== null) {
    if (prefix) out[prefix] = scalar;
    return out;
  }

  if (typeof input !== 'object') return out;

  for (const [key, val] of Object.entries(input)) {
    if (key.startsWith('_')) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    flattenGenieacsNestedTree(val, path, out);
  }

  return out;
}

export function flattenGenieacsDocument(doc = {}) {
  const flat = {};

  for (const [key, val] of Object.entries(doc)) {
    if (SKIP_KEYS.has(key)) continue;
    if (key.startsWith('_')) continue;

    const scalar = genieScalar(val);
    if (scalar !== null) {
      flat[key] = scalar;
      continue;
    }

    if (key === 'InternetGatewayDevice' || key === 'VirtualParameters' || key === 'Device') {
      flattenGenieacsNestedTree(val, key, flat);
      continue;
    }

    if (val && typeof val === 'object') {
      flattenGenieacsNestedTree(val, key, flat);
    }
  }

  return flat;
}

export function isInfoParameterPath(path) {
  return INFO_PARAM_PATTERNS.some((re) => re.test(path));
}

export function pickInfoParameters(doc = {}) {
  const flat = flattenGenieacsDocument(doc);
  return Object.fromEntries(
    Object.entries(flat).filter(([path]) => isInfoParameterPath(path)),
  );
}

const HOST_PARAM_PATTERNS = [
  /hosts\.host\.\d+/i,
  /hosts\.hostnumberofentries/i,
  /associateddevice\.\d+/i,
  /wlanconfiguration\.\d+\.totalassociations/i,
  /lanhostconfigmanagement\.(dhcplease|dhcpserver|minaddress|maxaddress|subnetmask|dnsservers|iprouters|domainname|passthrough)/i,
  /x_cmcc_hostcustomise/i,
];

export function isHostParameterPath(path) {
  return HOST_PARAM_PATTERNS.some((re) => re.test(path));
}

export function pickHostParameters(doc = {}) {
  const flat = flattenGenieacsDocument(doc);
  return Object.fromEntries(
    Object.entries(flat).filter(([path]) => isHostParameterPath(path)),
  );
}

export function pickDeviceSyncParameters(doc = {}) {
  return {
    ...pickInfoParameters(doc),
    ...pickHostParameters(doc),
  };
}

export function categorizeInfoPaths(flat = {}) {
  const groups = {
    pppoeUsername: [],
    pppoePassword: [],
    ssid: [],
    ssidPassword: [],
    rxPower: [],
    temperature: [],
    other: [],
  };

  for (const path of Object.keys(flat)) {
    const lower = path.toLowerCase();
    if (/virtualparameters\.(ppp|pppoe).*user/i.test(path) || /wanpppconnection\.\d+\.username$/i.test(path)) {
      groups.pppoeUsername.push(path);
    } else if (/virtualparameters\.(ppp|pppoe).*pass|pppoeclave|wanpppconnection\.\d+\.password$/i.test(path)) {
      groups.pppoePassword.push(path);
    } else if (lower.endsWith('.ssid') && !lower.includes('bssid')) {
      groups.ssid.push(path);
    } else if (/keypassphrase|wpakeypassphrase|presharedkey|virtualparameters\.wlan/i.test(path)) {
      groups.ssidPassword.push(path);
    } else if (/rxpower|receivepower|opticalsignallevel/i.test(path)) {
      groups.rxPower.push(path);
    } else if (/temperature|transceivertemperature|virtualparameters\.gettemp/i.test(path)) {
      groups.temperature.push(path);
    } else {
      groups.other.push(path);
    }
  }

  for (const key of Object.keys(groups)) {
    groups[key].sort();
  }
  return groups;
}

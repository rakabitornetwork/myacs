/** Flatten GenieACS MongoDB device document → { path: value } */

const SKIP_KEYS = new Set(['_id', '_deviceId', '_lastInform', '_registered', '_tags', '_timestamp']);

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
  /x_cmhi/i,
  /x_gponinterfaceconfig/i,
  /x_alu_ontopticalparam/i,
  /wanopticalinterface/i,
  /deviceinfo\.temperature$/i,
  /^virtualparameters\./i,
];

function genieScalar(entry) {
  if (entry === null || entry === undefined) return '';
  if (typeof entry !== 'object') return String(entry);
  if ('_value' in entry) return entry._value === null || entry._value === undefined ? '' : String(entry._value);
  if ('#text' in entry) return String(entry['#text'] ?? '');
  return null;
}

export function flattenGenieacsDocument(doc = {}) {
  const flat = {};
  for (const [key, val] of Object.entries(doc)) {
    if (key.startsWith('_') && SKIP_KEYS.has(key)) continue;
    if (key.startsWith('_')) continue;

    const scalar = genieScalar(val);
    if (scalar !== null) {
      flat[key] = scalar;
      continue;
    }

    if (val && typeof val === 'object' && '_value' in val) {
      flat[key] = genieScalar(val);
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
    } else if (/keypassphrase|wpakeypassphrase|presharedkey|virtualparameters\.wifi/i.test(path)) {
      groups.ssidPassword.push(path);
    } else if (/rxpower|receivepower|opticalsignallevel/i.test(path)) {
      groups.rxPower.push(path);
    } else if (/temperature|transceivertemperature/i.test(path)) {
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

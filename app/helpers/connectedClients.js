import { flattenParameterMap } from './parameters.js';

const FETCH_SUBTREES = [
  'InternetGatewayDevice.LANDevice.1.Hosts.',
  'InternetGatewayDevice.LANDevice.1.WLANConfiguration.',
  'Device.Hosts.',
  'Device.WiFi.AccessPoint.',
];

const HOST_ENTRY_RE = /^(?:InternetGatewayDevice\.LANDevice\.\d+\.Hosts\.Host|Device\.Hosts\.Host)\.(\d+)\.(.+)$/i;
const WLAN_ASSOC_RE = /^InternetGatewayDevice\.LANDevice\.\d+\.WLANConfiguration\.(\d+)\.AssociatedDevice\.(\d+)\.(.+)$/i;
const WIFI_ASSOC_RE = /^Device\.WiFi\.AccessPoint\.(\d+)\.AssociatedDevice\.(\d+)\.(.+)$/i;

const HOST_NUMBER_RE = /^(?:InternetGatewayDevice\.LANDevice\.\d+\.Hosts\.HostNumberOfEntries|Device\.Hosts\.HostNumberOfEntries)$/i;
const WLAN_TOTAL_ASSOC_RE = /^InternetGatewayDevice\.LANDevice\.\d+\.WLANConfiguration\.(\d+)\.TotalAssociations$/i;
const WLAN_ENABLE_RE = /^InternetGatewayDevice\.LANDevice\.\d+\.WLANConfiguration\.(\d+)\.Enable$/i;
const WLAN_SSID_RE = /^InternetGatewayDevice\.LANDevice\.\d+\.WLANConfiguration\.(\d+)\.SSID$/i;

function normMac(value) {
  if (!value) return '';
  const hex = String(value).replace(/[^a-fA-F0-9]/g, '').toUpperCase();
  if (hex.length !== 12) return String(value).trim().toUpperCase();
  return hex.match(/.{1,2}/g).join(':');
}

function isTruthy(value) {
  if (value === undefined || value === null || String(value).trim() === '') return false;
  const v = String(value).trim().toLowerCase();
  return v !== '0' && v !== 'false' && v !== 'no' && v !== 'disabled';
}

function fieldKey(segment) {
  return segment.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function setField(target, segment, value) {
  if (value === undefined || value === null || String(value).trim() === '') return;
  const key = fieldKey(segment);

  if (key === 'hostname' || key === 'hostdescription' || key === 'devicename') {
    target.hostName = String(value).trim();
    return;
  }
  if (key === 'ipaddress' || key === 'associateddeviceipaddress' || key === 'layer3ipv4address') {
    target.ipAddress = String(value).trim();
    return;
  }
  if (key === 'macaddress' || key === 'associateddevicemacaddress' || key === 'physaddress') {
    target.macAddress = normMac(value);
    return;
  }
  if (key === 'interfacetype' || key === 'interfacename') {
    target.interfaceType = String(value).trim();
    return;
  }
  if (key === 'active') {
    target.active = isTruthy(value);
    return;
  }
  if (key === 'addresssource') {
    target.addressSource = String(value).trim();
    return;
  }
  if (key === 'leasetimeremaining') {
    target.leaseTimeRemaining = String(value).trim();
    return;
  }
  if (key === 'associateddeviceauthenticationstate') {
    target.authState = String(value).trim();
    return;
  }
  if (key === 'lastrequestedunicastcipher' || key === 'lastdatadownlinkrate' || key === 'lastdatauplinkrate') {
    target[key] = String(value).trim();
  }
}

function ensureEntry(map, key, defaults = {}) {
  if (!map.has(key)) map.set(key, { ...defaults });
  return map.get(key);
}

function finalizeClient(raw) {
  const mac = normMac(raw.macAddress);
  const ip = raw.ipAddress?.trim() || '';
  const hostName = raw.hostName?.trim() || '';

  if (!mac && !ip && !hostName) return null;
  if (raw.active === false) return null;

  return {
    hostName: hostName || '—',
    ipAddress: ip || '—',
    macAddress: mac || '—',
    interfaceType: raw.interfaceType || raw.interface || '—',
    addressSource: raw.addressSource || '—',
    leaseTimeRemaining: raw.leaseTimeRemaining || '',
    authState: raw.authState || '',
    source: raw.source || 'lan',
    wlanIndex: raw.wlanIndex || null,
    wlanSsid: raw.wlanSsid || '',
  };
}

function dedupeClients(list) {
  const byMac = new Map();
  const withoutMac = [];

  for (const client of list) {
    if (client.macAddress && client.macAddress !== '—') {
      const existing = byMac.get(client.macAddress);
      if (!existing) {
        byMac.set(client.macAddress, client);
        continue;
      }
      for (const field of ['hostName', 'ipAddress', 'interfaceType', 'wlanSsid']) {
        if ((existing[field] === '—' || !existing[field]) && client[field] && client[field] !== '—') {
          existing[field] = client[field];
        }
      }
      continue;
    }
    withoutMac.push(client);
  }

  return [...byMac.values(), ...withoutMac].sort((a, b) => {
    const nameA = a.hostName === '—' ? a.macAddress : a.hostName;
    const nameB = b.hostName === '—' ? b.macAddress : b.hostName;
    return nameA.localeCompare(nameB, 'id');
  });
}

export function getConnectedClientsFetchPaths() {
  return [...FETCH_SUBTREES];
}

export function extractConnectedClients(device) {
  const flat = flattenParameterMap(device?.parameters);
  const hostEntries = new Map();
  const wlanEntries = new Map();
  const wifiEntries = new Map();
  const wlanSsids = new Map();
  const wlanEnabled = new Map();
  const wlanTotals = new Map();
  let hostNumberOfEntries = 0;

  for (const [path, value] of Object.entries(flat)) {
    if (HOST_NUMBER_RE.test(path)) {
      const n = parseInt(String(value), 10);
      if (!Number.isNaN(n)) hostNumberOfEntries = Math.max(hostNumberOfEntries, n);
      continue;
    }

    const totalMatch = path.match(WLAN_TOTAL_ASSOC_RE);
    if (totalMatch) {
      const n = parseInt(String(value), 10);
      if (!Number.isNaN(n)) wlanTotals.set(totalMatch[1], n);
      continue;
    }

    const enableMatch = path.match(WLAN_ENABLE_RE);
    if (enableMatch) {
      wlanEnabled.set(enableMatch[1], isTruthy(value));
      continue;
    }

    const ssidMatch = path.match(WLAN_SSID_RE);
    if (ssidMatch) {
      wlanSsids.set(ssidMatch[1], String(value).trim());
      continue;
    }

    const hostMatch = path.match(HOST_ENTRY_RE);
    if (hostMatch) {
      const entry = ensureEntry(hostEntries, hostMatch[1], { source: 'lan' });
      setField(entry, hostMatch[2], value);
      continue;
    }

    const wlanMatch = path.match(WLAN_ASSOC_RE);
    if (wlanMatch) {
      const wlanIndex = wlanMatch[1];
      const entry = ensureEntry(wlanEntries, `${wlanIndex}.${wlanMatch[2]}`, {
        source: 'wifi',
        wlanIndex,
        interfaceType: 'WiFi',
      });
      setField(entry, wlanMatch[3], value);
      continue;
    }

    const wifiMatch = path.match(WIFI_ASSOC_RE);
    if (wifiMatch) {
      const entry = ensureEntry(wifiEntries, `${wifiMatch[1]}.${wifiMatch[2]}`, {
        source: 'wifi',
        interfaceType: 'WiFi',
      });
      setField(entry, wifiMatch[3], value);
      continue;
    }
  }

  const clients = dedupeClients(
    [...hostEntries.values(), ...wlanEntries.values(), ...wifiEntries.values()]
      .map((raw) => {
        if (raw.wlanIndex) {
          raw.wlanSsid = wlanSsids.get(String(raw.wlanIndex)) || '';
          if (!raw.interfaceType || raw.interfaceType === '—') {
            raw.interfaceType = raw.wlanSsid ? `WiFi (${raw.wlanSsid})` : 'WiFi';
          }
        }
        return finalizeClient(raw);
      })
      .filter(Boolean),
  );

  let wifiAssociationTotal = 0;
  for (const [index, total] of wlanTotals.entries()) {
    if (wlanEnabled.get(index) === false) continue;
    wifiAssociationTotal += total;
  }

  const count = clients.length
    || hostNumberOfEntries
    || wifiAssociationTotal
    || 0;

  return {
    count,
    clients,
    hostNumberOfEntries,
    wifiAssociationTotal,
    hasDetails: clients.length > 0,
    countSource: clients.length
      ? 'list'
      : hostNumberOfEntries
        ? 'hostEntries'
        : wifiAssociationTotal
          ? 'wlanTotal'
          : 'none',
  };
}

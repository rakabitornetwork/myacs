import { flattenParameterMap } from './parameters.js';

const FETCH_SUBTREES = [
  'InternetGatewayDevice.LANDevice.1.Hosts.',
  'InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.',
  'InternetGatewayDevice.LANDevice.1.X_CMCC_HostCustomise.',
  'InternetGatewayDevice.LANDevice.1.WLANConfiguration.',
  'Device.Hosts.',
  'Device.WiFi.AccessPoint.',
];

const LAN_CONFIG_FIELDS = {
  dhcpLeaseTime: /\.LANHostConfigManagement\.DHCPLeaseTime$/i,
  dhcpServerEnable: /\.LANHostConfigManagement\.DHCPServerEnable$/i,
  minAddress: /\.LANHostConfigManagement\.MinAddress$/i,
  maxAddress: /\.LANHostConfigManagement\.MaxAddress$/i,
  subnetMask: /\.LANHostConfigManagement\.SubnetMask$/i,
};

const HOST_ENTRY_RE = /^(?:InternetGatewayDevice\.LANDevice\.\d+\.Hosts\.Host|Device\.Hosts\.Host)\.(\d+)\.(.+)$/i;
const WLAN_ASSOC_RE = /^InternetGatewayDevice\.LANDevice\.\d+\.WLANConfiguration\.(\d+)\.AssociatedDevice\.(\d+)\.(.+)$/i;
const WIFI_ASSOC_RE = /^Device\.WiFi\.AccessPoint\.(\d+)\.AssociatedDevice\.(\d+)\.(.+)$/i;

const HOST_NUMBER_RE = /^(?:InternetGatewayDevice\.LANDevice\.\d+\.Hosts\.HostNumberOfEntries|Device\.Hosts\.HostNumberOfEntries)$/i;
const WLAN_TOTAL_ASSOC_RE = /^InternetGatewayDevice\.LANDevice\.\d+\.WLANConfiguration\.(\d+)\.TotalAssociations$/i;
const WLAN_ENABLE_RE = /^InternetGatewayDevice\.LANDevice\.\d+\.WLANConfiguration\.(\d+)\.Enable$/i;
const WLAN_SSID_RE = /^InternetGatewayDevice\.LANDevice\.\d+\.WLANConfiguration\.(\d+)\.SSID$/i;

export function formatDhcpLeaseTime(value) {
  const sec = parseInt(String(value).replace(/[^\d]/g, ''), 10);
  if (Number.isNaN(sec) || sec <= 0) return '';

  if (sec % 86400 === 0) {
    const days = sec / 86400;
    return days === 1 ? '24 jam' : `${days} hari`;
  }
  if (sec % 3600 === 0) return `${sec / 3600} jam`;
  if (sec >= 3600) {
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    return mins ? `${hours} jam ${mins} menit` : `${hours} jam`;
  }
  if (sec >= 60) return `${Math.floor(sec / 60)} menit`;
  return `${sec} detik`;
}

export function formatLeaseTimeRemaining(value) {
  if (!value) return '';
  let text = String(value).trim();
  if (!text) return '';

  const compact = text.match(/(\d+)\s*Hour.*?(\d+)\s*Minute.*?(\d+)\s*Second/i);
  if (compact) {
    return `Sisa lease: ${compact[1]} jam ${compact[2]} menit ${compact[3]} detik`;
  }

  return text
    .replace(/Remaining\s*lease\s*term/i, 'Sisa lease: ')
    .replace(/(\d+)\s*Hour/gi, '$1 jam ')
    .replace(/(\d+)\s*Minute/gi, '$1 menit ')
    .replace(/(\d+)\s*Second/gi, '$1 detik')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatAddressSource(value) {
  if (!value) return '';
  const v = String(value).trim();
  const lower = v.toLowerCase();
  if (lower === 'dhcp') return 'DHCP';
  if (lower === 'static') return 'Static';
  if (lower === 'autoip') return 'Auto IP';
  return v;
}

export function formatInterfaceType(value) {
  if (!value) return '';
  const v = String(value).trim();
  const lower = v.toLowerCase();
  if (lower === 'wifi' || lower === '802.11' || lower.includes('wlan')) return 'WiFi';
  if (lower === 'ethernet' || lower === 'lan') return 'LAN';
  return v;
}

function normalizeHostName(value) {
  if (!value) return '';
  const v = String(value).trim();
  if (!v || /^n\/?a$/i.test(v)) return '';
  return v;
}

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
    target.hostName = normalizeHostName(value);
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
    target.interfaceType = formatInterfaceType(value);
    return;
  }
  if (key === 'devicetype' || key === 'xcmccdevicetype' || key === 'xcuhosttype' || key === 'xcmhihosttype') {
    const formatted = formatInterfaceType(value) || String(value).trim();
    if (formatted) target.deviceType = formatted;
    return;
  }
  if (key === 'layer2interface') {
    const formatted = formatInterfaceType(value) || String(value).trim();
    if (formatted) target.layer2Interface = formatted;
    if (formatted && !target.interfaceType) target.interfaceType = formatted;
    return;
  }
  if (key === 'active') {
    target.active = isTruthy(value);
    return;
  }
  if (key === 'addresssource') {
    target.addressSource = formatAddressSource(value) || String(value).trim();
    return;
  }
  if (key === 'leasetimeremaining' || key === 'leaseleft' || key === 'remaininglease') {
    target.leaseTimeRemaining = formatLeaseTimeRemaining(value);
    return;
  }
  if (key === 'status' && !target.leaseTimeRemaining) {
    const formatted = formatLeaseTimeRemaining(value);
    if (formatted) target.leaseTimeRemaining = formatted;
    return;
  }
  if (key === 'associateddeviceauthenticationstate') {
    target.authState = String(value).trim();
    return;
  }
  if (key.includes('xcmccstats') || key.includes('hoststats')) {
    if (/bytes|packets|rate|signal|rssi/i.test(key)) {
      target.stats = target.stats || {};
      target.stats[key] = String(value).trim();
    }
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
    interfaceType: raw.deviceType || raw.interfaceType || raw.interface || '—',
    addressSource: raw.addressSource || '—',
    leaseTimeRemaining: raw.leaseTimeRemaining || '',
    authState: raw.authState || '',
    active: raw.active,
    isActive: raw.active !== false,
    layer2Interface: raw.layer2Interface || '',
    source: raw.source || 'lan',
    wlanIndex: raw.wlanIndex || null,
    wlanSsid: raw.wlanSsid || '',
  };
}

function extractLanHostConfig(flat) {
  const config = {
    dhcpLeaseTime: '',
    dhcpLeaseTimeFormatted: '',
    dhcpServerEnable: '',
    minAddress: '',
    maxAddress: '',
    subnetMask: '',
  };

  for (const [path, value] of Object.entries(flat)) {
    if (LAN_CONFIG_FIELDS.dhcpLeaseTime.test(path)) {
      config.dhcpLeaseTime = String(value).trim();
      config.dhcpLeaseTimeFormatted = formatDhcpLeaseTime(value);
    } else if (LAN_CONFIG_FIELDS.dhcpServerEnable.test(path)) {
      config.dhcpServerEnable = isTruthy(value) ? 'Aktif' : (String(value).trim() ? 'Nonaktif' : '');
    } else if (LAN_CONFIG_FIELDS.minAddress.test(path)) {
      config.minAddress = String(value).trim();
    } else if (LAN_CONFIG_FIELDS.maxAddress.test(path)) {
      config.maxAddress = String(value).trim();
    } else if (LAN_CONFIG_FIELDS.subnetMask.test(path)) {
      config.subnetMask = String(value).trim();
    }
  }

  const hasData = Object.values(config).some((v) => v && v !== '');
  return hasData ? config : null;
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
    lanConfig: extractLanHostConfig(flat),
    countSource: clients.length
      ? 'list'
      : hostNumberOfEntries
        ? 'hostEntries'
        : wifiAssociationTotal
          ? 'wlanTotal'
          : 'none',
  };
}

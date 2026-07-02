import { flattenParameterMap } from './parameters.js';
import { classifyRxPower, classifyTemperature } from './opticalStatus.js';

const PARAM_PATHS = {
  pppoeUsername: [
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username',
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Username',
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.5.WANPPPConnection.1.Username',
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.2.Username',
    'Device.PPP.Interface.1.Username',
    'VirtualParameters.pppUsername',
    'VirtualParameters.pppoeUsername',
    'VirtualParameters.pppoeUsername2',
    'VirtualParameters.PPPoEUsername',
  ],
  pppoePassword: [
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Password',
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Password',
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.2.Password',
    'Device.PPP.Interface.1.Password',
    'VirtualParameters.pppoePassword',
    'VirtualParameters.pppoeclave',
    'VirtualParameters.pppPassword',
  ],
  ssid: [
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID',
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.SSID',
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.3.SSID',
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.4.SSID',
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID',
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.SSID',
    'Device.WiFi.SSID.1.SSID',
    'Device.WiFi.Radio.1.SSID',
  ],
  ssidPassword: [
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.WPAKeyPassphrase',
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase',
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase',
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.PreSharedKey',
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.WPAKeyPassphrase',
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.KeyPassphrase',
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.WPAKeyPassphrase',
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.KeyPassphrase',
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.PreSharedKey.1.PreSharedKey',
    'Device.WiFi.AccessPoint.1.Security.KeyPassphrase',
    'Device.WiFi.AccessPoint.1.Security.X_CMCC_KeyPassphrase',
    'VirtualParameters.wifipassword',
    'VirtualParameters.wifiPassword',
    'VirtualParameters.WiFiPassword',
    'VirtualParameters.WlanPassword',
  ],
  temperature: [
    'VirtualParameters.gettemp',
    'InternetGatewayDevice.WANDevice.1.X_CT-COM_EponInterfaceConfig.TransceiverTemperature',
    'InternetGatewayDevice.WANDevice.1.X_CMCC_EponInterfaceConfig.TransceiverTemperature',
    'InternetGatewayDevice.DeviceInfo.Temperature',
    'InternetGatewayDevice.X_CMHI_DeviceInfo.Temperature',
    'InternetGatewayDevice.WANDevice.1.X_CMHI_GponInterfaceConfig.TransceiverTemperature',
    'InternetGatewayDevice.WANDevice.1.X_CMHI_GponInterfaceConfig.Temperature',
    'InternetGatewayDevice.WANDevice.1.X_GponInterfaceConfig.TransceiverTemperature',
    'InternetGatewayDevice.WANDevice.1.X_GponInterfaceConfig.Temperature',
    'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.TransceiverTemperature',
    'InternetGatewayDevice.WANDevice.1.X_ZTE-COM_WANPONInterfaceConfig.TransceiverTemperature',
    'InternetGatewayDevice.X_ALU_OntOpticalParam.TransceiverTemperature',
    'InternetGatewayDevice.X_CT-COM_GponInterfaceConfig.Stats.TransceiverTemperature',
    'InternetGatewayDevice.X_CMHI_Status.Temperature',
    'Device.DeviceInfo.TemperatureStatus.Temperature',
    'Device.Optical.Interface.1.Temperature',
  ],
  rxPower: [
    'VirtualParameters.RXPower',
    'InternetGatewayDevice.WANDevice.1.X_CT-COM_EponInterfaceConfig.RXPower',
    'InternetGatewayDevice.WANDevice.1.X_CMCC_EponInterfaceConfig.RXPower',
    'InternetGatewayDevice.WANDevice.1.X_CMHI_GponInterfaceConfig.RXPower',
    'InternetGatewayDevice.WANDevice.1.X_CMHI_GponInterfaceConfig.RxPower',
    'InternetGatewayDevice.WANDevice.1.X_CMHI_GponInterfaceConfig.ReceivePower',
    'InternetGatewayDevice.WANDevice.1.X_GponInterfaceConfig.RXPower',
    'InternetGatewayDevice.WANDevice.1.X_GponInterfaceConfig.RxPower',
    'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.RXPower',
    'InternetGatewayDevice.WANDevice.1.X_ZTE-COM_WANPONInterfaceConfig.RXPower',
    'InternetGatewayDevice.X_ALU_OntOpticalParam.RXPower',
    'InternetGatewayDevice.X_CT-COM_GponInterfaceConfig.Stats.RXPower',
    'InternetGatewayDevice.X_CMHI_Optical.RxPower',
    'InternetGatewayDevice.X_CMHI_Optical.RXPower',
    'InternetGatewayDevice.X_CMHI_Optical.Diagnostic.RXPower',
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.X_CMHI_RxPower',
    'InternetGatewayDevice.WANDevice.1.WANOpticalInterface.OpticalSignalLevel',
    'InternetGatewayDevice.WANDevice.1.WANOpticalInterface.RXPower',
    'Device.Optical.Interface.1.RxPower',
    'Device.Optical.Interface.1.OpticalSignalLevel',
    'VirtualParameters.rxPower',
    'VirtualParameters.RXPOWER',
    'VirtualParameters.OpticalPower',
  ],
  routeProtocolRxPpp: [
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.5.WANPPPConnection.1.RouteProtocolRx',
  ],
  routeProtocolRxIp: [
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.6.WANIPConnection.1.RouteProtocolRx',
  ],
};

const MODEL_NAME_PATHS = [
  'InternetGatewayDevice.DeviceInfo.ModelName',
  'Device.DeviceInfo.ModelName',
];

const IP_TR069_PATHS = [
  'VirtualParameters.IPTR069',
  'VirtualParameters.IpTr069',
  'VirtualParameters.iptr069',
];

function findModelName(flat, device) {
  for (const path of MODEL_NAME_PATHS) {
    const val = flat[path];
    if (val !== undefined && val !== null && String(val).trim()) {
      return String(val).trim();
    }
  }
  return device?.model || device?.productClass || '';
}

function findIpTr069(flat) {
  for (const path of IP_TR069_PATHS) {
    const val = flat[path];
    if (val !== undefined && val !== null && String(val).trim()) {
      return String(val).trim();
    }
  }

  for (const [key, val] of Object.entries(flat)) {
    if (!/^virtualparameters\.iptr069$/i.test(key)) continue;
    if (val === undefined || val === null || String(val).trim() === '') continue;
    return String(val).trim();
  }

  return '';
}

/** Subtree paths untuk GetParameterValues (akhiri dengan titik) */
const FETCH_SUBTREES = [
  'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.',
  'InternetGatewayDevice.LANDevice.1.WLANConfiguration.',
  'InternetGatewayDevice.WANDevice.1.X_CMCC_EponInterfaceConfig.',
  'InternetGatewayDevice.WANDevice.1.X_CT-COM_EponInterfaceConfig.',
  'InternetGatewayDevice.WANDevice.1.X_CMCC_GponInterfaceConfig.',
  'InternetGatewayDevice.WANDevice.1.X_CMHI_GponInterfaceConfig.',
  'InternetGatewayDevice.WANDevice.1.X_GponInterfaceConfig.',
  'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.',
  'InternetGatewayDevice.WANDevice.1.X_ZTE-COM_WANPONInterfaceConfig.',
  'InternetGatewayDevice.WANDevice.1.WANOpticalInterface.',
  'InternetGatewayDevice.X_ALU_OntOpticalParam.',
  'InternetGatewayDevice.X_CT-COM_GponInterfaceConfig.',
  'InternetGatewayDevice.X_CMHI_Optical.',
  'InternetGatewayDevice.X_CMHI_Status.',
  'InternetGatewayDevice.X_CMHI_DeviceInfo.',
  'InternetGatewayDevice.DeviceInfo.',
  'Device.Optical.Interface.1.',
];

const FIELD_SCAN = {
  ssid: {
    endsWith: ['.ssid'],
    excludes: ['bssid', 'ssidmask', 'ssidadvertisement'],
  },
  ssidPassword: {
    includesAny: [
      ['keypassphrase'],
      ['wpakeypassphrase'],
      ['wpa', 'passphrase'],
      ['presharedkey', 'keypassphrase'],
    ],
    excludes: ['username', 'wanpppconnection'],
  },
  pppoePassword: {
    includesAll: [['wanpppconnection', 'password']],
    excludes: ['ssid', 'wlan'],
  },
  pppoeUsername: {
    includesAny: [
      ['wanpppconnection', 'username'],
    ],
    excludes: ['connectionrequest', 'admin', 'managementserver', 'ssid', 'wlan'],
  },
  routeProtocolRxPpp: {
    includesAll: [['wanpppconnection', 'routeprotocolrx']],
  },
  routeProtocolRxIp: {
    includesAll: [['wanipconnection', 'routeprotocolrx']],
  },
  rxPower: {
    includesAny: [
      ['rxpower'],
      ['rx', 'power'],
      ['receivepower'],
      ['opticalsignallevel'],
      ['optical', 'rx'],
      ['gponinterfaceconfig', 'rxpower'],
      ['gponinterafceconfig', 'rxpower'],
      ['eponinterfaceconfig', 'rxpower'],
    ],
    excludes: ['txpower', 'tx', 'transmit', 'routeprotocol'],
  },
  temperature: {
    includesAny: [
      ['transceivertemperature'],
      ['.temperature'],
      ['temperaturestatus'],
      ['gponinterfaceconfig', 'temperature'],
      ['gponinterafceconfig', 'temperature'],
      ['eponinterfaceconfig', 'transceivertemperature'],
    ],
    excludes: ['txpower'],
  },
};

export function getDeviceInfoParamPaths() {
  return [...new Set(Object.values(PARAM_PATHS).flat())];
}

export function getDeviceInfoFetchPaths() {
  return [...FETCH_SUBTREES];
}

function matchesExcludes(key, excludes = []) {
  const lower = key.toLowerCase();
  return excludes.some((ex) => lower.includes(ex.toLowerCase()));
}

function findByScan(flat, rules) {
  for (const [key, val] of Object.entries(flat)) {
    if (val === undefined || val === null || String(val).trim() === '') continue;
    if (matchesExcludes(key, rules.excludes)) continue;

    const lower = key.toLowerCase();

    if (rules.endsWith?.some((s) => lower.endsWith(s.toLowerCase()))) {
      return String(val).trim();
    }

    if (rules.includesAll) {
      for (const parts of rules.includesAll) {
        if (parts.every((p) => lower.includes(p.toLowerCase()))) {
          return String(val).trim();
        }
      }
    }

    if (rules.includesAny) {
      for (const parts of rules.includesAny) {
        if (parts.every((p) => lower.includes(p.toLowerCase()))) {
          return String(val).trim();
        }
      }
    }
  }
  return '';
}

function isEnabledValue(value) {
  return value === '1' || value === 'true' || value === true || value === 1;
}

function wlanIndexFromPath(path) {
  const match = path.match(/WLANConfiguration\.(\d+)\./i);
  return match ? match[1] : null;
}

function findWifiCredentials(flat) {
  const candidates = [];

  for (const [key, val] of Object.entries(flat)) {
    if (!key.toLowerCase().endsWith('.ssid')) continue;
    if (matchesExcludes(key, FIELD_SCAN.ssid.excludes)) continue;
    if (val === undefined || val === null || String(val).trim() === '') continue;

    const index = wlanIndexFromPath(key);
    const prefix = index
      ? key.replace(/\.SSID$/i, '')
      : key.slice(0, key.length - '.SSID'.length);
    const enableKey = `${prefix}.Enable`;
    const enabled = isEnabledValue(flat[enableKey]);

    const passwordPaths = index
      ? [
          `InternetGatewayDevice.LANDevice.1.WLANConfiguration.${index}.WPAKeyPassphrase`,
          `InternetGatewayDevice.LANDevice.1.WLANConfiguration.${index}.KeyPassphrase`,
          `InternetGatewayDevice.LANDevice.1.WLANConfiguration.${index}.PreSharedKey.1.KeyPassphrase`,
          `InternetGatewayDevice.LANDevice.1.WLANConfiguration.${index}.PreSharedKey.1.PreSharedKey`,
        ]
      : [];

    let password = '';
    for (const passwordPath of passwordPaths) {
      const candidate = flat[passwordPath];
      if (candidate !== undefined && candidate !== null && String(candidate).trim() !== '') {
        password = String(candidate).trim();
        break;
      }
    }

    if (!password) {
      for (const [passKey, passVal] of Object.entries(flat)) {
        if (passVal === undefined || passVal === null || String(passVal).trim() === '') continue;
        if (!passKey.startsWith(prefix)) continue;
        const lower = passKey.toLowerCase();
        if (
          lower.includes('keypassphrase')
          || lower.includes('wpakeypassphrase')
          || (lower.includes('presharedkey') && lower.endsWith('.presharedkey'))
        ) {
          password = String(passVal).trim();
          break;
        }
      }
    }

    candidates.push({
      ssid: String(val).trim(),
      password,
      enabled,
      index: index ? parseInt(index, 10) : 999,
    });
  }

  if (!candidates.length) {
    return { ssid: '', ssidPassword: '' };
  }

  candidates.sort((a, b) => {
    if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
    return a.index - b.index;
  });

  return { ssid: candidates[0].ssid, ssidPassword: candidates[0].password };
}

function isPppConnectionActive(flat, basePath) {
  const enable = flat[`${basePath}.Enable`];
  if (isEnabledValue(enable)) return true;
  const status = String(flat[`${basePath}.ConnectionStatus`] || '').toLowerCase();
  return status === 'connected' || status === 'connecting';
}

function findPppoeCredentials(flat) {
  let username = findParamValue(flat, 'pppoeUsername');
  let password = findParamValue(flat, 'pppoePassword');
  if (username) return { username, password };

  const connections = [];
  for (const [key, val] of Object.entries(flat)) {
    if (val === undefined || val === null || String(val).trim() === '') continue;
    const match = key.match(/^(.*\.WANPPPConnection\.\d+)\.(Username|Password)$/i);
    if (!match) continue;

    const base = match[1];
    const field = match[2].toLowerCase();
    let conn = connections.find((item) => item.base === base);
    if (!conn) {
      conn = { base, username: '', password: '', active: isPppConnectionActive(flat, base) };
      connections.push(conn);
    }
    if (field === 'username') conn.username = String(val).trim();
    if (field === 'password') conn.password = String(val).trim();
  }

  connections.sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    if (a.username && !b.username) return -1;
    if (!a.username && b.username) return 1;
    return 0;
  });

  const best = connections.find((item) => item.username) || connections[0];
  return {
    username: best?.username || '',
    password: password || best?.password || '',
  };
}

function findParamValue(flat, field) {
  const exact = PARAM_PATHS[field] || [];
  for (const path of exact) {
    const val = flat[path];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val).trim();
    }
  }

  const scan = FIELD_SCAN[field];
  if (scan) {
    const found = findByScan(flat, scan);
    if (found) return found;
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

  if (num < 0 && num > -60) {
    return `${num.toFixed(2)}\u00A0dBm`;
  }

  const raw = Math.round(num);
  if (raw > 0 && raw < 10000) {
    const dbm = -(10000 - raw) / 571.5;
    return `${dbm.toFixed(2)}\u00A0dBm`;
  }

  return `${num.toFixed(2)}\u00A0dBm`;
}

export function formatTemperature(value) {
  if (!value) return '';
  const num = parseFloat(String(value).replace(/[^\d.-]/g, ''));
  if (Number.isNaN(num)) return value;

  if (num > 500) {
    return `${(num / 256).toFixed(1)}\u00A0°C`;
  }

  return `${num.toFixed(1)}\u00A0°C`;
}

export function extractDeviceInfo(device) {
  const flat = flattenParameterMap(device?.parameters);

  const pppoe = findPppoeCredentials(flat);
  const pppoeUsername = pppoe.username;
  const pppoePassword = pppoe.password;
  let ssid = findParamValue(flat, 'ssid');
  let ssidPassword = findParamValue(flat, 'ssidPassword');
  if (!ssid || !ssidPassword) {
    const wifi = findWifiCredentials(flat);
    if (!ssid) ssid = wifi.ssid;
    if (!ssidPassword) ssidPassword = wifi.ssidPassword;
  }
  const temperatureRaw = findParamValue(flat, 'temperature');
  const rxPowerRaw = findParamValue(flat, 'rxPower');
  const modelName = findModelName(flat, device);
  const ipTr069 = findIpTr069(flat);
  const routeProtocolRxPpp = findParamValue(flat, 'routeProtocolRxPpp');
  const routeProtocolRxIp = findParamValue(flat, 'routeProtocolRxIp');

  return {
    brand: device?.manufacturer || '',
    modelName,
    onuType: modelName,
    ipTr069,
    routeProtocolRxPpp,
    routeProtocolRxIp,
    pppoeUsername,
    pppoePassword,
    pppoePasswordMasked: maskSecret(pppoePassword),
    pppoePasswordNote: pppoePassword ? '' : 'ONU sering tidak expose password PPPoE via TR-069',
    pppoeUsernameNote: pppoeUsername ? '' : 'Username PPPoE mungkin kosong di CPE atau belum ter-fetch',
    ssid,
    ssidPassword,
    ssidPasswordMasked: maskSecret(ssidPassword),
    ssidPasswordNote: ssidPassword ? '' : 'Banyak ONU tidak mengirim password WiFi via TR-069',
    temperature: formatTemperature(temperatureRaw),
    temperatureRaw,
    rxPower: formatRxPower(rxPowerRaw),
    rxPowerRaw,
    rxPowerStatus: classifyRxPower(rxPowerRaw),
    temperatureStatus: classifyTemperature(temperatureRaw),
    rxPowerNote: rxPowerRaw ? '' : 'Klik Refresh untuk fetch subtree optical (GPON/EPON)',
    ipTr069Note: ipTr069 ? '' : 'Belum ter-fetch — klik Refresh atau tunggu Inform dari CPE',
  };
}

export function deviceInfoIsComplete(info) {
  return !!(info.pppoeUsername && info.ssid && (info.rxPowerRaw || info.temperatureRaw));
}

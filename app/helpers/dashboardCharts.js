import { flattenParameterMap } from './parameters.js';
import { extractDeviceInfo } from './deviceInfo.js';
import {
  RX_BUCKETS,
  TEMP_BUCKETS,
  parseRxPowerDbm,
  parseTemperatureC,
  bucketize,
} from './opticalStatus.js';

const PON_MODE_ORDER = ['GPON', 'EPON', 'Ethernet', 'Unknown'];
const PON_MODE_COLORS = {
  GPON: '#3366ff',
  EPON: '#8b5cf6',
  Ethernet: '#64748b',
  Unknown: '#d4d4d8',
};

const BRAND_PALETTE = [
  '#3366ff', '#8b5cf6', '#06b6d4', '#22c55e', '#f97316',
  '#ef4444', '#ec4899', '#14b8a6', '#eab308', '#6366f1',
];

const PON_MODE_PATHS = [
  'VirtualParameters.getponmode',
  'VirtualParameters.ponMode',
  'VirtualParameters.PONMode',
  'VirtualParameters.getPonMode',
];

export { parseRxPowerDbm, parseTemperatureC } from './opticalStatus.js';

export function detectPonMode(device) {
  const flat = flattenParameterMap(device?.parameters);

  for (const path of PON_MODE_PATHS) {
    const value = String(flat[path] || '').toLowerCase();
    if (value.includes('gpon')) return 'GPON';
    if (value.includes('epon')) return 'EPON';
    if (value.includes('ethernet') || value === 'eth') return 'Ethernet';
  }

  const keys = Object.keys(flat);
  const lowerKeys = keys.map((k) => k.toLowerCase());

  const hasOpticalRx = (needle) => keys.some((k, i) => {
    const lk = lowerKeys[i];
    return lk.includes(needle) && lk.includes('rxpower') && String(flat[k]).trim() !== '';
  });

  if (hasOpticalRx('eponinterfaceconfig') || hasOpticalRx('x_cmcc_epon')) return 'EPON';
  if (hasOpticalRx('gponinterfaceconfig') || hasOpticalRx('x_cmhi_gpon') || hasOpticalRx('x_gpon')) {
    return 'GPON';
  }

  const hasEponConfig = lowerKeys.some((k) => k.includes('eponinterfaceconfig'));
  const hasGponConfig = lowerKeys.some((k) => k.includes('gponinterfaceconfig'));

  if (hasGponConfig && !hasEponConfig) return 'GPON';
  if (hasEponConfig && !hasGponConfig) return 'EPON';

  const hasEthernet = lowerKeys.some((k) => k.includes('wanethernetconnection'));
  if (hasEthernet && !hasGponConfig && !hasEponConfig) return 'Ethernet';

  return 'Unknown';
}

function initBucketCounts(buckets) {
  return Object.fromEntries(buckets.map((b) => [b.key, 0]));
}

function toSortedSeries(counts, meta, { unknownKey, unknownLabel, unknownColor } = {}) {
  const series = meta.map((item) => ({
    name: item.label || item.name || item.mode,
    count: counts[item.key] || counts[item.mode] || counts[item.name] || 0,
    color: item.color,
  }));

  if (unknownKey && counts[unknownKey]) {
    series.push({
      name: unknownLabel || 'Tidak ada data',
      count: counts[unknownKey],
      color: unknownColor || '#d4d4d8',
    });
  }

  return series.filter((s) => s.count > 0);
}

export function aggregateDashboardCharts(devices = []) {
  const brandCounts = {};
  const rxCounts = { ...initBucketCounts(RX_BUCKETS), unknown: 0 };
  const tempCounts = { ...initBucketCounts(TEMP_BUCKETS), unknown: 0 };
  const ponCounts = Object.fromEntries(PON_MODE_ORDER.map((m) => [m, 0]));

  let withRx = 0;
  let withTemp = 0;

  for (const device of devices) {
    const info = extractDeviceInfo(device);
    const brand = (info.brand || device.manufacturer || 'Tidak diketahui').trim() || 'Tidak diketahui';
    brandCounts[brand] = (brandCounts[brand] || 0) + 1;

    const rxDbm = parseRxPowerDbm(info.rxPowerRaw);
    if (rxDbm !== null) {
      withRx += 1;
      const bucket = bucketize(rxDbm, RX_BUCKETS);
      if (bucket) rxCounts[bucket.key] += 1;
    } else {
      rxCounts.unknown += 1;
    }

    const tempC = parseTemperatureC(info.temperatureRaw);
    if (tempC !== null) {
      withTemp += 1;
      const bucket = bucketize(tempC, TEMP_BUCKETS);
      if (bucket) tempCounts[bucket.key] += 1;
    } else {
      tempCounts.unknown += 1;
    }

    const ponMode = detectPonMode(device);
    ponCounts[ponMode] = (ponCounts[ponMode] || 0) + 1;
  }

  const brandEntries = Object.entries(brandCounts).sort((a, b) => b[1] - a[1]);
  const topBrands = brandEntries.slice(0, 8);
  const otherBrands = brandEntries.slice(8);
  const otherCount = otherBrands.reduce((sum, [, count]) => sum + count, 0);

  const byBrand = topBrands.map(([name, count], index) => ({
    name,
    count,
    color: BRAND_PALETTE[index % BRAND_PALETTE.length],
  }));
  if (otherCount > 0) {
    byBrand.push({ name: 'Lainnya', count: otherCount, color: '#a1a1aa' });
  }

  return {
    byBrand,
    rxPower: toSortedSeries(rxCounts, RX_BUCKETS, {
      unknownKey: 'unknown',
      unknownLabel: 'Tidak ada data',
      unknownColor: '#d4d4d8',
    }),
    temperature: toSortedSeries(tempCounts, TEMP_BUCKETS, {
      unknownKey: 'unknown',
      unknownLabel: 'Tidak ada data',
      unknownColor: '#d4d4d8',
    }),
    ponMode: PON_MODE_ORDER.map((mode) => ({
      name: mode,
      count: ponCounts[mode] || 0,
      color: PON_MODE_COLORS[mode],
    })).filter((item) => item.count > 0),
    totals: {
      devices: devices.length,
      withRx,
      withTemp,
      withBrand: devices.filter((d) => (d.manufacturer || extractDeviceInfo(d).brand)).length,
    },
  };
}

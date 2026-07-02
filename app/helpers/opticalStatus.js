export const RX_BUCKETS = [
  { key: 'critical', label: 'Kritis (< -28 dBm)', min: -Infinity, max: -28, color: '#ef4444' },
  { key: 'warning', label: 'Lemah (-28 s/d -26)', min: -28, max: -26, color: '#f97316' },
  { key: 'normal', label: 'Normal (-26 s/d -20)', min: -26, max: -20, color: '#22c55e' },
  { key: 'good', label: 'Baik (-20 s/d -15)', min: -20, max: -15, color: '#3366ff' },
  { key: 'strong', label: 'Kuat (> -15 dBm)', min: -15, max: Infinity, color: '#8b5cf6' },
];

export const TEMP_BUCKETS = [
  { key: 'cool', label: 'Dingin (< 40°C)', min: -Infinity, max: 40, color: '#38bdf8' },
  { key: 'normal', label: 'Normal (40–50°C)', min: 40, max: 50, color: '#22c55e' },
  { key: 'warm', label: 'Hangat (50–60°C)', min: 50, max: 60, color: '#f97316' },
  { key: 'hot', label: 'Panas (> 60°C)', min: 60, max: Infinity, color: '#ef4444' },
];

const RX_TEXT_CLASS = {
  critical: 'ui-optical-critical',
  warning: 'ui-optical-warning',
  normal: 'ui-optical-normal',
  good: 'ui-optical-good',
  strong: 'ui-optical-strong',
};

const TEMP_TEXT_CLASS = {
  cool: 'ui-optical-cool',
  normal: 'ui-optical-normal',
  warm: 'ui-optical-warning',
  hot: 'ui-optical-critical',
};

export function parseRxPowerDbm(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  const num = parseFloat(String(raw).replace(/[^\d.-]/g, ''));
  if (Number.isNaN(num)) return null;
  if (num < 0 && num > -60) return num;
  const rounded = Math.round(num);
  if (rounded > 0 && rounded < 10000) {
    return -(10000 - rounded) / 571.5;
  }
  return num;
}

export function parseTemperatureC(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  const num = parseFloat(String(raw).replace(/[^\d.-]/g, ''));
  if (Number.isNaN(num)) return null;
  if (num > 500) return num / 256;
  return num;
}

export function bucketize(value, buckets) {
  if (value === null) return null;
  for (const bucket of buckets) {
    if (value >= bucket.min && value < bucket.max) return bucket;
    if (bucket.max === Infinity && value >= bucket.min) return bucket;
  }
  return buckets[buckets.length - 1];
}

function toStatus(bucket, textClassMap, numericValue) {
  if (!bucket) return null;
  return {
    level: bucket.key,
    label: bucket.label,
    color: bucket.color,
    textClass: textClassMap[bucket.key] || 'ui-optical-neutral',
    value: numericValue,
  };
}

export function classifyRxPower(raw) {
  const dbm = parseRxPowerDbm(raw);
  if (dbm === null) return null;
  return toStatus(bucketize(dbm, RX_BUCKETS), RX_TEXT_CLASS, dbm);
}

export function classifyTemperature(raw) {
  const tempC = parseTemperatureC(raw);
  if (tempC === null) return null;
  return toStatus(bucketize(tempC, TEMP_BUCKETS), TEMP_TEXT_CLASS, tempC);
}

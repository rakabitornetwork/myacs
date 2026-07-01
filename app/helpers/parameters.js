export function normalizeParamScalar(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value !== 'object') return String(value);

  if (Array.isArray(value)) {
    return value.map((item) => normalizeParamScalar(item)).join(', ');
  }

  if ('#text' in value) {
    return String(value['#text'] ?? '');
  }

  const keys = Object.keys(value).filter((k) => !k.startsWith('@_'));
  if (keys.length === 0) return '';

  return null;
}

export function flattenParameterTree(input, prefix = '', out = {}) {
  if (input === null || input === undefined) return out;

  const scalar = normalizeParamScalar(input);
  if (scalar !== null) {
    if (prefix) out[prefix] = scalar;
    return out;
  }

  if (Array.isArray(input)) {
    input.forEach((item, index) => {
      const path = prefix ? `${prefix}.${index + 1}` : String(index + 1);
      flattenParameterTree(item, path, out);
    });
    return out;
  }

  if (typeof input === 'object') {
    for (const [key, val] of Object.entries(input)) {
      if (key.startsWith('@_')) continue;
      const path = prefix ? `${prefix}.${key}` : key;
      flattenParameterTree(val, path, out);
    }
  }

  return out;
}

export function flattenParameterMap(source = {}) {
  const entries = source instanceof Map ? [...source.entries()] : Object.entries(source || {});
  const flat = {};

  for (const [key, value] of entries) {
    const scalar = normalizeParamScalar(value);
    if (scalar !== null) {
      flat[key] = scalar;
      continue;
    }
    Object.assign(flat, flattenParameterTree(value, key));
  }

  return flat;
}

export function parametersToEntries(source = {}, { limit = 200 } = {}) {
  const flat = flattenParameterMap(source);
  return Object.entries(flat)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, limit);
}

export function paramUpdatesFromMap(source = {}) {
  const flat = flattenParameterMap(source);
  return Object.fromEntries(Object.entries(flat).map(([k, v]) => [`parameters.${k}`, v]));
}

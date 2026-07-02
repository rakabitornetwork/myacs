import config from '../../config/index.js';

function nbiBase() {
  const url = config.genieacs.nbiUrl?.trim();
  if (!url) throw new Error('GENIEACS_NBI_URL belum dikonfigurasi');
  return url.replace(/\/$/, '');
}

function devicePath(deviceId) {
  return `${nbiBase()}/devices/${encodeURIComponent(deviceId)}`;
}

async function nbiRequest(path, options = {}) {
  const res = await fetch(`${nbiBase()}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    signal: AbortSignal.timeout(30_000),
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(typeof data === 'string' ? data : `GenieACS NBI error ${res.status}`);
  }

  return data;
}

export async function genieacsConnectionRequest(deviceId) {
  return nbiRequest(`/devices/${encodeURIComponent(deviceId)}/tasks?connection_request`, {
    method: 'POST',
    body: '[]',
  });
}

export async function genieacsPostTask(deviceId, task, connectionRequest = true) {
  const qs = connectionRequest ? '?connection_request' : '';
  return nbiRequest(`/devices/${encodeURIComponent(deviceId)}/tasks${qs}`, {
    method: 'POST',
    body: JSON.stringify(task),
  });
}

export async function genieacsReboot(deviceId) {
  return genieacsPostTask(deviceId, { name: 'reboot' });
}

export async function genieacsFactoryReset(deviceId) {
  return genieacsPostTask(deviceId, { name: 'factoryReset' });
}

export async function genieacsGetParameterValues(deviceId, parameterNames) {
  return genieacsPostTask(deviceId, {
    name: 'getParameterValues',
    parameterNames: Array.isArray(parameterNames) ? parameterNames : [parameterNames],
  });
}

export async function genieacsSetParameterValues(deviceId, parameterValues) {
  const tuples = parameterValues.map((p) => [
    p.name,
    p.value ?? '',
    p.type || 'xsd:string',
  ]);
  return genieacsPostTask(deviceId, {
    name: 'setParameterValues',
    parameterValues: tuples,
  });
}

export async function genieacsDownload(deviceId, { file, fileType, url }) {
  if (file) {
    return genieacsPostTask(deviceId, { name: 'download', file, fileType: fileType || '1 Firmware Upgrade Image' });
  }
  if (url) {
    return genieacsPostTask(deviceId, {
      name: 'download',
      fileType: fileType || '1 Firmware Upgrade Image',
      url,
    });
  }
  throw new Error('File atau URL diperlukan untuk download GenieACS');
}

export async function genieacsGetParameterNames(deviceId, parameterPath, nextLevel = false) {
  return genieacsPostTask(deviceId, {
    name: 'getParameterNames',
    parameterPath: parameterPath || 'Device.',
    nextLevel: Boolean(nextLevel),
  });
}

export async function genieacsUpload(deviceId, { fileType, url }) {
  return genieacsPostTask(deviceId, {
    name: 'upload',
    fileType: fileType || '1 Vendor Configuration File',
    url,
  });
}

export async function genieacsRefreshObject(deviceId, objectName) {
  return genieacsPostTask(deviceId, {
    name: 'refreshObject',
    objectName,
  });
}

export async function genieacsRefreshHosts(deviceId) {
  return genieacsRefreshObject(deviceId, 'InternetGatewayDevice.LANDevice.1.Hosts.');
}

export function isGenieacsNbiConfigured() {
  return Boolean(config.genieacs.nbiUrl?.trim());
}

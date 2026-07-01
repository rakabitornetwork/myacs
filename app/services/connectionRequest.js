import crypto from 'crypto';

function parseDigestChallenge(header) {
  if (!header?.toLowerCase().startsWith('digest')) return null;

  const params = {};
  const regex = /(\w+)=(?:"([^"]+)"|([^,]+))/g;
  let match = regex.exec(header.replace(/^Digest\s+/i, ''));
  while (match) {
    params[match[1]] = match[2] || match[3];
    match = regex.exec(header.replace(/^Digest\s+/i, ''));
  }
  return params;
}

function buildDigestAuth({ method, path, credentials, challenge }) {
  const realm = challenge.realm || '';
  const nonce = challenge.nonce || '';
  const qop = challenge.qop?.split(',')[0] || 'auth';
  const nc = '00000001';
  const cnonce = crypto.randomBytes(8).toString('hex');

  const ha1 = crypto
    .createHash('md5')
    .update(`${credentials.username}:${realm}:${credentials.password}`)
    .digest('hex');
  const ha2 = crypto.createHash('md5').update(`${method}:${path}`).digest('hex');
  const response = crypto
    .createHash('md5')
    .update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
    .digest('hex');

  return (
    `Digest username="${credentials.username}", realm="${realm}", nonce="${nonce}", ` +
    `uri="${path}", qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${response}"` +
    (challenge.opaque ? `, opaque="${challenge.opaque}"` : '')
  );
}

async function fetchOnce(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 10_000);

  try {
    return await fetch(url, {
      method: options.method || 'GET',
      headers: options.headers,
      signal: controller.signal,
      redirect: 'manual',
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendConnectionRequest(connectionRequestUrl, credentials = {}) {
  if (!connectionRequestUrl?.trim()) {
    throw new Error('Connection Request URL tidak tersedia');
  }

  const url = new URL(connectionRequestUrl);
  const hasCreds = Boolean(credentials.username && credentials.password);

  if (credentials.username && !url.username) {
    url.username = credentials.username;
  }
  if (credentials.password && !url.password) {
    url.password = credentials.password;
  }

  const target = url.toString();
  let response = await fetchOnce(target);

  if (response.status === 401 && hasCreds) {
    const challenge = parseDigestChallenge(response.headers.get('www-authenticate'));
    if (challenge) {
      const path = url.pathname + url.search;
      const auth = buildDigestAuth({
        method: 'GET',
        path,
        credentials,
        challenge,
      });
      const digestUrl = `${url.protocol}//${url.host}${path}`;
      response = await fetchOnce(digestUrl, {
        headers: { Authorization: auth },
      });
    }
  }

  return {
    ok: response.ok || response.status === 204,
    status: response.status,
    statusText: response.statusText,
  };
}

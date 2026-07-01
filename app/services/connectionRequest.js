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
  const qop = challenge.qop?.split(',')[0]?.trim().replace(/^"|"$/g, '') || '';
  const nc = '00000001';
  const cnonce = crypto.randomBytes(8).toString('hex');

  const ha1 = crypto
    .createHash('md5')
    .update(`${credentials.username}:${realm}:${credentials.password}`)
    .digest('hex');
  const ha2 = crypto.createHash('md5').update(`${method}:${path}`).digest('hex');

  let response;
  let auth;

  if (qop) {
    response = crypto
      .createHash('md5')
      .update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
      .digest('hex');
    auth =
      `Digest username="${credentials.username}", realm="${realm}", nonce="${nonce}", ` +
      `uri="${path}", qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${response}"`;
  } else {
    response = crypto.createHash('md5').update(`${ha1}:${nonce}:${ha2}`).digest('hex');
    auth =
      `Digest username="${credentials.username}", realm="${realm}", nonce="${nonce}", ` +
      `uri="${path}", response="${response}"`;
  }

  if (challenge.opaque) {
    auth += `, opaque="${challenge.opaque}"`;
  }

  return auth;
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

function stripUrlCredentials(rawUrl) {
  const url = new URL(rawUrl);
  const embedded = {
    username: url.username ? decodeURIComponent(url.username) : '',
    password: url.password ? decodeURIComponent(url.password) : '',
  };
  url.username = '';
  url.password = '';
  const path = url.pathname + url.search;
  const requestUrl = `${url.protocol}//${url.host}${path}`;
  return { requestUrl, path, embedded };
}

function mergeCredentials(credentials, embedded) {
  return {
    username: credentials.username || embedded.username || '',
    password: credentials.password || embedded.password || '',
  };
}

export async function sendConnectionRequest(connectionRequestUrl, credentials = {}) {
  if (!connectionRequestUrl?.trim()) {
    throw new Error('Connection Request URL tidak tersedia');
  }

  const { requestUrl, path, embedded } = stripUrlCredentials(connectionRequestUrl);
  const creds = mergeCredentials(credentials, embedded);
  const hasCreds = Boolean(creds.username) || Boolean(creds.password);

  let response = await fetchOnce(requestUrl);

  if (response.status === 401 && hasCreds) {
    const challenge = parseDigestChallenge(response.headers.get('www-authenticate'));
    if (challenge) {
      const auth = buildDigestAuth({
        method: 'GET',
        path,
        credentials: creds,
        challenge,
      });
      response = await fetchOnce(requestUrl, {
        headers: { Authorization: auth },
      });
    }
  }

  if (response.status === 401 && !hasCreds) {
    return {
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      hint: 'CPE memerlukan ConnectionRequestUsername/Password — jalankan Get Parameter pada InternetGatewayDevice.ManagementServer.',
    };
  }

  return {
    ok: response.ok || response.status === 204,
    status: response.status,
    statusText: response.statusText,
    hint: response.status === 401
      ? 'Digest auth gagal — periksa username/password Connection Request di parameter CPE.'
      : undefined,
  };
}

import crypto from 'crypto';
import CwmpSession from '../../models/CwmpSession.js';
import Device from '../../models/Device.js';
import { getClientIp } from '../../helpers/clientIp.js';

const COOKIE_NAME = 'myacs-cwmp-session';
const SESSION_FALLBACK_MS = parseInt(process.env.CWMP_SESSION_FALLBACK_MS || '600000', 10);

export function parseCookies(header) {
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((part) => {
      const [key, ...rest] = part.trim().split('=');
      return [key, decodeURIComponent(rest.join('='))];
    }),
  );
}

export async function createSession(deviceId, ipAddress) {
  const sessionId = crypto.randomBytes(16).toString('hex');
  await CwmpSession.findOneAndUpdate(
    { deviceId },
    { sessionId, deviceId, ipAddress, lastSeen: new Date() },
    { upsert: true, new: true },
  );
  return sessionId;
}

export async function resolveDeviceId(req) {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies[COOKIE_NAME];

  if (sessionId) {
    const session = await CwmpSession.findOne({ sessionId });
    if (session) {
      session.lastSeen = new Date();
      await session.save();
      return session.deviceId;
    }
  }

  const clientIp = getClientIp(req);

  if (clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1') {
    const ipSession = await CwmpSession.findOne({ ipAddress: clientIp })
      .sort({ lastSeen: -1 })
      .lean();
    if (ipSession) {
      const ageMs = Date.now() - new Date(ipSession.lastSeen || 0).getTime();
      if (ageMs <= SESSION_FALLBACK_MS) return ipSession.deviceId;
    }

    const device = await Device.findOne({ ipAddress: clientIp, source: 'myacs' })
      .sort({ lastInform: -1 })
      .lean();
    if (device) return device.deviceId;
  }

  return null;
}

export function isRequestHttps(req) {
  if (req.secure) return true;
  const proto = req.headers['x-forwarded-proto'];
  if (typeof proto === 'string') return proto.split(',')[0].trim() === 'https';
  return false;
}

export function setCwmpCookie(res, sessionId, req) {
  const flags = isRequestHttps(req)
    ? 'Path=/cwmp; HttpOnly; Secure; SameSite=None'
    : 'Path=/cwmp; HttpOnly; SameSite=Lax';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${sessionId}; ${flags}`);
}

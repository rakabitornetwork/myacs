import crypto from 'crypto';
import CwmpSession from '../../models/CwmpSession.js';
import Device from '../../models/Device.js';

const COOKIE_NAME = 'myacs-cwmp-session';

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

  const clientIp =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress?.replace('::ffff:', '') ||
    req.ip;

  if (clientIp) {
    const device = await Device.findOne({ ipAddress: clientIp, source: 'myacs' })
      .sort({ lastInform: -1 })
      .lean();
    if (device) return device.deviceId;
  }

  return null;
}

export function setCwmpCookie(res, sessionId) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${sessionId}; Path=/cwmp; HttpOnly; SameSite=Lax${secure}`,
  );
}

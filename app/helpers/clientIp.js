export function getClientIp(req) {
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp && typeof cfIp === 'string') return cfIp.trim();

  const realIp = req.headers['x-real-ip'];
  if (realIp && typeof realIp === 'string') return realIp.trim();

  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = String(forwarded).split(',')[0]?.trim();
    if (first && first !== '127.0.0.1' && first !== '::1') return first;
  }

  const socketIp = req.socket?.remoteAddress?.replace('::ffff:', '') || req.ip;
  return socketIp || '';
}

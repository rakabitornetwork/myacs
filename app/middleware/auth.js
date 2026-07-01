export function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    if (req.headers['x-inertia'] === 'true') {
      return req.inertia.location('/login');
    }
    return res.redirect('/login');
  }
  next();
}

export function requireWrite(req, res, next) {
  if (!req.user) {
    return res.redirect('/login');
  }
  if (!['operator', 'admin'].includes(req.user.role)) {
    req.session.flash = { type: 'error', message: 'Akses ditolak — perlu role operator/admin' };
    const back = req.headers.referer || '/dashboard';
    return res.redirect(back);
  }
  next();
}

export function requireManage(req, res, next) {
  if (!req.user) {
    return res.redirect('/login');
  }
  if (req.user.role !== 'admin') {
    req.session.flash = { type: 'error', message: 'Akses ditolak — perlu role admin' };
    const back = req.headers.referer || '/dashboard';
    return res.redirect(back);
  }
  next();
}

export function guestOnly(req, res, next) {
  if (req.session?.userId) {
    return res.redirect('/dashboard');
  }
  next();
}

export async function attachUser(req, res, next) {
  if (req.session?.userId) {
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(req.session.userId);
    if (user?.isActive) {
      req.inertia.share('auth', {
        user: user.toSafeJSON(),
        ...permissionsForRole(user.role),
      });
      req.user = user;
    } else {
      req.session.destroy(() => {});
    }
  }
  next();
}

import User from '../../models/User.js';

export async function showLogin(req, res) {
  return req.inertia.render('Auth/Login', {
    errors: {},
    status: req.query.status || null,
  });
}

export async function login(req, res) {
  const { email, password } = req.body;
  const errors = {};

  if (!email) errors.email = 'Email wajib diisi';
  if (!password) errors.password = 'Password wajib diisi';

  if (Object.keys(errors).length) {
    return req.inertia.render('Auth/Login', { errors, status: null });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await user.verifyPassword(password))) {
    return req.inertia.render('Auth/Login', {
      errors: { email: 'Email atau password salah' },
      status: null,
    });
  }

  if (!user.isActive) {
    return req.inertia.render('Auth/Login', {
      errors: { email: 'Akun tidak aktif' },
      status: null,
    });
  }

  req.session.userId = user._id.toString();
  return res.redirect('/dashboard');
}

export async function logout(req, res) {
  req.session.destroy(() => {
    res.redirect('/login');
  });
}

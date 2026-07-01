import User from '../../models/User.js';

export async function usersIndex(req, res) {
  const users = await User.find().sort({ createdAt: -1 }).lean();

  const flash = req.session.flash || null;
  delete req.session.flash;

  return req.inertia.render('Users/Index', {
    users: users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
    })),
    roles: ['admin', 'operator', 'viewer'],
    flash,
  });
}

export async function usersStore(req, res) {
  const { name, email, password, role } = req.body;

  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    req.session.flash = { type: 'error', message: 'Nama, email, dan password wajib diisi' };
    return res.redirect('/users');
  }

  const existing = await User.findOne({ email: email.trim().toLowerCase() });
  if (existing) {
    req.session.flash = { type: 'error', message: 'Email sudah terdaftar' };
    return res.redirect('/users');
  }

  const allowedRoles = ['admin', 'operator', 'viewer'];
  const userRole = allowedRoles.includes(role) ? role : 'operator';

  await User.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: await User.hashPassword(password),
    role: userRole,
  });

  req.session.flash = { type: 'success', message: `User ${email} berhasil dibuat` };
  return res.redirect('/users');
}

export async function usersToggle(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).send('User not found');

  if (user._id.toString() === req.user._id.toString()) {
    req.session.flash = { type: 'error', message: 'Tidak bisa menonaktifkan akun sendiri' };
    return res.redirect('/users');
  }

  user.isActive = !user.isActive;
  await user.save();

  req.session.flash = {
    type: 'success',
    message: `User ${user.email} ${user.isActive ? 'diaktifkan' : 'dinonaktifkan'}`,
  };
  return res.redirect('/users');
}

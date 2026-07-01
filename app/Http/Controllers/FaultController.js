import Fault from '../../models/Fault.js';

export async function faultsIndex(req, res) {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const perPage = 30;
  const showResolved = req.query.resolved === '1';

  const filter = showResolved ? {} : { resolved: false };

  const [faults, total, unresolvedCount] = await Promise.all([
    Fault.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .lean(),
    Fault.countDocuments(filter),
    Fault.countDocuments({ resolved: false }),
  ]);

  return req.inertia.render('Faults/Index', {
    faults: faults.map((f) => ({
      id: f._id.toString(),
      deviceId: f.deviceId,
      code: f.code,
      message: f.message,
      resolved: f.resolved,
      createdAt: f.createdAt,
    })),
    pagination: {
      page,
      perPage,
      total,
      lastPage: Math.ceil(total / perPage) || 1,
    },
    unresolvedCount,
    showResolved,
    flash: (() => {
      const f = req.session.flash || null;
      delete req.session.flash;
      return f;
    })(),
  });
}

export async function faultsResolve(req, res) {
  const fault = await Fault.findById(req.params.id);
  if (!fault) return res.status(404).send('Fault not found');

  fault.resolved = true;
  await fault.save();

  req.session.flash = { type: 'success', message: 'Fault ditandai selesai' };
  return res.redirect('/faults');
}

export async function faultsResolveAll(req, res) {
  const result = await Fault.updateMany({ resolved: false }, { resolved: true });
  req.session.flash = {
    type: 'success',
    message: `${result.modifiedCount} fault ditandai selesai`,
  };
  return res.redirect('/faults');
}

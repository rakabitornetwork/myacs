import Preset from '../../models/Preset.js';

function parseTags(input) {
  if (!input?.trim()) return [];
  return input
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function parseConfigurations(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) {
    return JSON.parse(raw);
  }
  return [];
}

function serializePreset(p) {
  return {
    id: p._id.toString(),
    name: p.name,
    description: p.description || '',
    weight: p.weight,
    precondition: p.precondition || '',
    isEnabled: p.isEnabled,
    tags: p.tags || [],
    configurations: p.configurations || [],
    configurationsCount: p.configurations?.length || 0,
  };
}

export async function presetsIndex(req, res) {
  const presets = await Preset.find().sort({ weight: -1 }).lean();
  return req.inertia.render('Presets/Index', {
    presets: presets.map(serializePreset),
  });
}

export async function presetsCreate(req, res) {
  return req.inertia.render('Presets/Form', {
    preset: null,
    errors: {},
  });
}

export async function presetsStore(req, res) {
  const errors = {};
  const { name, description, weight, precondition, tags, isEnabled, configurations } = req.body;

  if (!name?.trim()) errors.name = 'Nama wajib diisi';

  let configs = [];
  try {
    configs = parseConfigurations(configurations);
  } catch {
    errors.configurations = 'Format konfigurasi tidak valid';
  }

  if (Object.keys(errors).length) {
    return req.inertia.render('Presets/Form', {
      preset: req.body,
      errors,
    });
  }

  try {
    await Preset.create({
      name: name.trim(),
      description: description?.trim(),
      weight: parseInt(weight || '0', 10),
      precondition: precondition?.trim(),
      tags: parseTags(tags),
      isEnabled: isEnabled === '1' || isEnabled === true || isEnabled === 'true',
      configurations: configs,
    });
  } catch (err) {
    if (err.code === 11000) {
      return req.inertia.render('Presets/Form', {
        preset: req.body,
        errors: { name: 'Nama preset sudah digunakan' },
      });
    }
    throw err;
  }

  return res.redirect('/presets');
}

export async function presetsEdit(req, res) {
  const preset = await Preset.findById(req.params.id).lean();
  if (!preset) return res.status(404).send('Preset not found');

  return req.inertia.render('Presets/Form', {
    preset: serializePreset(preset),
    errors: {},
  });
}

export async function presetsUpdate(req, res) {
  const preset = await Preset.findById(req.params.id);
  if (!preset) return res.status(404).send('Preset not found');

  const errors = {};
  const { name, description, weight, precondition, tags, isEnabled, configurations } = req.body;

  if (!name?.trim()) errors.name = 'Nama wajib diisi';

  let configs = [];
  try {
    configs = parseConfigurations(configurations);
  } catch {
    errors.configurations = 'Format konfigurasi tidak valid';
  }

  if (Object.keys(errors).length) {
    return req.inertia.render('Presets/Form', {
      preset: { ...req.body, id: preset._id.toString() },
      errors,
    });
  }

  preset.name = name.trim();
  preset.description = description?.trim();
  preset.weight = parseInt(weight || '0', 10);
  preset.precondition = precondition?.trim();
  preset.tags = parseTags(tags);
  preset.isEnabled = isEnabled === '1' || isEnabled === true || isEnabled === 'true';
  preset.configurations = configs;

  try {
    await preset.save();
  } catch (err) {
    if (err.code === 11000) {
      return req.inertia.render('Presets/Form', {
        preset: { ...req.body, id: preset._id.toString() },
        errors: { name: 'Nama preset sudah digunakan' },
      });
    }
    throw err;
  }

  return res.redirect('/presets');
}

export async function presetsDestroy(req, res) {
  await Preset.findByIdAndDelete(req.params.id);
  return res.redirect('/presets');
}

export async function presetsToggle(req, res) {
  const preset = await Preset.findById(req.params.id);
  if (!preset) return res.status(404).send('Preset not found');
  preset.isEnabled = !preset.isEnabled;
  await preset.save();
  return res.redirect('/presets');
}

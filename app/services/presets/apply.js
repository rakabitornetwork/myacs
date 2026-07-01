import Preset from '../../models/Preset.js';
import Task from '../../models/Task.js';

function presetMatches(preset, device) {
  if (!preset.isEnabled) return false;

  if (preset.tags?.length) {
    const deviceTags = device.tags || [];
    const hasTag = preset.tags.some((t) => deviceTags.includes(t));
    if (!hasTag) return false;
  }

  if (preset.precondition?.trim()) {
    try {
      const fn = new Function('device', `return !!(${preset.precondition})`);
      if (!fn(device)) return false;
    } catch {
      return false;
    }
  }

  return true;
}

async function queuePresetTask(device, preset, taskDef) {
  const existing = await Task.findOne({
    deviceId: device.deviceId,
    name: taskDef.name,
    status: { $in: ['pending', 'running'] },
  });
  if (existing) return;

  await Task.create({
    deviceId: device.deviceId,
    name: taskDef.name,
    method: taskDef.method,
    payload: taskDef.payload,
    priority: preset.weight,
  });
}

export async function applyPresetsForDevice(device) {
  const presets = await Preset.find({ isEnabled: true }).sort({ weight: -1 }).lean();
  const matched = presets.filter((p) => presetMatches(p, device));

  for (const preset of matched) {
    const configs = preset.configurations || [];

    const values = configs
      .filter((c) => c.type === 'value' && c.path)
      .map((c) => ({ name: c.path, value: c.value ?? '' }));

    if (values.length) {
      await queuePresetTask(device, preset, {
        name: `Preset: ${preset.name}`,
        method: 'SetParameterValues',
        payload: { values },
      });
    }

    for (const c of configs) {
      if (c.type === 'add_object' && c.path) {
        await queuePresetTask(device, preset, {
          name: `Preset: ${preset.name} (add ${c.path})`,
          method: 'AddObject',
          payload: { objectName: c.path },
        });
      }
      if (c.type === 'delete_object' && c.path) {
        await queuePresetTask(device, preset, {
          name: `Preset: ${preset.name} (delete ${c.path})`,
          method: 'DeleteObject',
          payload: { objectName: c.path },
        });
      }
    }
  }
}

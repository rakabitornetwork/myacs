import Device from '../../models/Device.js';
import Task from '../../models/Task.js';
import Fault from '../../models/Fault.js';
import Preset from '../../models/Preset.js';
import AcsFile from '../../models/AcsFile.js';
import { sendConnectionRequest } from '../../services/connectionRequest.js';
import { syncDevicesFromGenieacs } from '../../jobs/genieacsSync.js';
import { acsInfoForClient, isGenieacsDevice, isGenieacsNbiConfigured } from '../../helpers/acs.js';
import {
  genieacsReboot,
  genieacsFactoryReset,
  genieacsConnectionRequest,
  genieacsGetParameterValues,
  genieacsSetParameterValues,
  genieacsGetParameterNames,
  genieacsUpload,
  genieacsDownload,
} from '../../services/genieacs/nbi.js';
import { validateConfig } from '../../config/validate.js';
import config from '../../config/index.js';
import { createTaskForDevice, wakeDeviceConnection } from '../../services/tasks/queue.js';

function redirectDevice(res, device) {
  return res.redirect(`/devices/${device._id}`);
}

function flashAndRedirect(req, res, device, type, message) {
  req.session.flash = { type, message };
  return redirectDevice(res, device);
}

async function runGenieacsAction(device, req, res, action) {
  if (!isGenieacsNbiConfigured()) {
    return flashAndRedirect(
      req,
      res,
      device,
      'warning',
      'GenieACS NBI belum dikonfigurasi (GENIEACS_NBI_URL)',
    );
  }

  try {
    await action();
    return flashAndRedirect(req, res, device, 'success', 'Task berhasil dikirim ke GenieACS');
  } catch (err) {
    return flashAndRedirect(req, res, device, 'error', err.message);
  }
}

async function queueMyacsTask(req, res, device, taskData, label) {
  await createTaskForDevice(device, taskData);
  req.session.flash = {
    type: 'success',
    message: `${label} diantrikan — Connection Request dikirim agar CPE segera mengambil task`,
  };
  return redirectDevice(res, device);
}

export async function dashboard(req, res) {
  const [
    deviceCount,
    onlineCount,
    myacsCount,
    genieacsCount,
    pendingTasks,
    faultCount,
    recentDevices,
  ] = await Promise.all([
    Device.countDocuments(),
    Device.countDocuments({ isOnline: true }),
    Device.countDocuments({ $or: [{ source: 'myacs' }, { source: { $exists: false } }] }),
    Device.countDocuments({ source: 'genieacs' }),
    Task.countDocuments({ status: 'pending' }),
    Fault.countDocuments({ resolved: false }),
    Device.find().sort({ lastInform: -1 }).limit(5).lean(),
  ]);

  let system = null;
  if (req.user?.role === 'admin') {
    const validation = validateConfig({ production: config.isProduction });
    const deployNotes = [];

    if (config.acsMode === 'dual' && config.port === 3000) {
      deployNotes.push('PORT=3000 bentrok dengan GenieACS UI — set PORT=3001 di .env');
    }
    if (!config.genieacs.nbiUrl && config.acsMode === 'dual') {
      deployNotes.push('GENIEACS_NBI_URL kosong — device GenieACS tidak bisa dikontrol dari panel');
    }
    if (validation.errors.length) {
      deployNotes.push(...validation.errors);
    }

    system = {
      health: 'ok',
      mongodb: true,
      genieacsMongo: Boolean(config.genieacs.mongoUri),
      acsMode: config.acsMode,
      cwmpUrl: config.cwmp.enabled ? `${config.appUrl}${config.cwmp.path}` : null,
      port: config.port,
      appUrl: config.appUrl,
      warnings: validation.warnings,
      deployNotes,
    };
  }

  return req.inertia.render('Dashboard', {
    stats: {
      devices: deviceCount,
      online: onlineCount,
      myacsDevices: myacsCount,
      genieacsDevices: genieacsCount,
      pendingTasks,
      faults: faultCount,
      presets: await Preset.countDocuments(),
      files: await AcsFile.countDocuments(),
    },
    recentDevices: recentDevices.map((d) => ({
      id: d._id.toString(),
      deviceId: d.deviceId,
      manufacturer: d.manufacturer,
      model: d.model,
      serialNumber: d.serialNumber,
      lastInform: d.lastInform,
      isOnline: d.isOnline,
      source: d.source,
    })),
    acs: acsInfoForClient(),
    system,
    flash: (() => {
      const f = req.session.flash || null;
      delete req.session.flash;
      return f;
    })(),
  });
}

export async function devicesIndex(req, res) {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const perPage = 20;
  const source = (req.query.source || '').trim();
  const search = (req.query.search || '').trim();

  const conditions = [];
  if (source === 'myacs') {
    conditions.push({ $or: [{ source: 'myacs' }, { source: { $exists: false } }] });
  } else if (source === 'genieacs') {
    conditions.push({ source: 'genieacs' });
  }
  if (search) {
    conditions.push({
      $or: [
        { deviceId: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } },
        { manufacturer: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
      ],
    });
  }
  const filter = conditions.length ? { $and: conditions } : {};

  const [devices, total] = await Promise.all([
    Device.find(filter)
      .sort({ lastInform: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .lean(),
    Device.countDocuments(filter),
  ]);

  return req.inertia.render('Devices/Index', {
    devices: devices.map((d) => ({
      id: d._id.toString(),
      deviceId: d.deviceId,
      serialNumber: d.serialNumber,
      manufacturer: d.manufacturer,
      model: d.model,
      softwareVersion: d.softwareVersion,
      ipAddress: d.ipAddress,
      lastInform: d.lastInform,
      isOnline: d.isOnline,
      tags: d.tags || [],
      source: d.source || 'myacs',
    })),
    pagination: {
      page,
      perPage,
      total,
      lastPage: Math.ceil(total / perPage) || 1,
    },
    filters: { search, source },
    acs: acsInfoForClient(),
  });
}

export async function devicesShow(req, res) {
  const device = await Device.findById(req.params.id).lean();
  if (!device) return res.status(404).send('Device not found');

  const tasks = await Task.find({ deviceId: device.deviceId })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const parameters = device.parameters
    ? Object.fromEntries(
        device.parameters instanceof Map
          ? device.parameters
          : Object.entries(device.parameters),
      )
    : {};

  const flash = req.session.flash || null;
  delete req.session.flash;

  const firmwareFiles = await AcsFile.find({ type: 'firmware' })
    .sort({ createdAt: -1 })
    .lean();

  return req.inertia.render('Devices/Show', {
    device: {
      id: device._id.toString(),
      deviceId: device.deviceId,
      serialNumber: device.serialNumber,
      oui: device.oui,
      productClass: device.productClass,
      manufacturer: device.manufacturer,
      model: device.model,
      softwareVersion: device.softwareVersion,
      hardwareVersion: device.hardwareVersion,
      ipAddress: device.ipAddress,
      connectionRequestUrl: device.connectionRequestUrl,
      lastInform: device.lastInform,
      isOnline: device.isOnline,
      tags: device.tags || [],
      events: device.events || [],
      parameters,
      source: device.source || 'myacs',
      managedByMyacs: !isGenieacsDevice(device),
      canManage:
        !isGenieacsDevice(device) ||
        (isGenieacsDevice(device) && isGenieacsNbiConfigured()),
    },
    tasks: tasks.map((t) => ({
      id: t._id.toString(),
      name: t.name,
      method: t.method,
      status: t.status,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
    })),
    firmwareFiles: firmwareFiles.map((f) => ({
      id: f._id.toString(),
      name: f.name,
      url: f.url,
      size: f.size,
    })),
    flash,
    acs: acsInfoForClient(),
  });
}

export async function tasksIndex(req, res) {
  const tasks = await Task.find()
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return req.inertia.render('Tasks/Index', {
    tasks: tasks.map((t) => ({
      id: t._id.toString(),
      deviceId: t.deviceId,
      name: t.name,
      method: t.method,
      status: t.status,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
      fault: t.fault,
    })),
  });
}

export async function createRebootTask(req, res) {
  const device = await Device.findById(req.params.id);
  if (!device) return res.status(404).send('Device not found');

  if (isGenieacsDevice(device)) {
    return runGenieacsAction(device, req, res, () => genieacsReboot(device.deviceId));
  }

  return queueMyacsTask(req, res, device, {
    name: 'Reboot device',
    method: 'Reboot',
    payload: {},
  }, 'Reboot');
}

export async function createFactoryResetTask(req, res) {
  const device = await Device.findById(req.params.id);
  if (!device) return res.status(404).send('Device not found');

  if (isGenieacsDevice(device)) {
    return runGenieacsAction(device, req, res, () => genieacsFactoryReset(device.deviceId));
  }

  return queueMyacsTask(req, res, device, {
    name: 'Factory reset',
    method: 'FactoryReset',
    payload: {},
  }, 'Factory reset');
}

export async function createGetParamsTask(req, res) {
  const device = await Device.findById(req.params.id);
  if (!device) return res.status(404).send('Device not found');

  const raw = (req.body.names || '').trim();
  const names = raw
    ? raw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
    : ['Device.DeviceInfo.'];

  if (isGenieacsDevice(device)) {
    return runGenieacsAction(device, req, res, () =>
      genieacsGetParameterValues(device.deviceId, names),
    );
  }

  return queueMyacsTask(req, res, device, {
    name: `Get: ${names.slice(0, 2).join(', ')}${names.length > 2 ? '…' : ''}`,
    method: 'GetParameterValues',
    payload: { names },
  }, 'Get parameter');
}

export async function createSetParamsTask(req, res) {
  const device = await Device.findById(req.params.id);
  if (!device) return res.status(404).send('Device not found');

  const path = (req.body.path || '').trim();
  const value = req.body.value ?? '';

  if (!path) {
    return flashAndRedirect(req, res, device, 'error', 'Parameter path wajib diisi');
  }

  const values = [{ name: path, value }];

  if (isGenieacsDevice(device)) {
    return runGenieacsAction(device, req, res, () =>
      genieacsSetParameterValues(device.deviceId, values),
    );
  }

  return queueMyacsTask(req, res, device, {
    name: `Set: ${path}`,
    method: 'SetParameterValues',
    payload: { values },
  }, 'Set parameter');
}

export async function createGetParamNamesTask(req, res) {
  const device = await Device.findById(req.params.id);
  if (!device) return res.status(404).send('Device not found');

  const parameterPath = (req.body.path || 'Device.').trim();
  const nextLevel = req.body.nextLevel === '1' || req.body.nextLevel === true;

  if (isGenieacsDevice(device)) {
    return runGenieacsAction(device, req, res, () =>
      genieacsGetParameterNames(device.deviceId, parameterPath, nextLevel),
    );
  }

  return queueMyacsTask(req, res, device, {
    name: `Get names: ${parameterPath}`,
    method: 'GetParameterNames',
    payload: { path: parameterPath, nextLevel },
  }, 'Get parameter names');
}

export async function createUploadTask(req, res) {
  const device = await Device.findById(req.params.id);
  if (!device) return res.status(404).send('Device not found');

  const fileType = (req.body.fileType || '1 Vendor Configuration File').trim();
  const task = await Task.create({
    deviceId: device.deviceId,
    name: `Upload from CPE (${fileType})`,
    method: 'Upload',
    payload: { fileType },
  });

  const uploadUrl = `${config.appUrl}${config.cwmp.path}/upload/${task._id}`;
  task.payload = { ...task.payload, url: uploadUrl };
  await task.save();

  if (isGenieacsDevice(device)) {
    return runGenieacsAction(device, req, res, () =>
      genieacsUpload(device.deviceId, { fileType, url: uploadUrl }),
    );
  }

  await wakeDeviceConnection(device);
  req.session.flash = {
    type: 'success',
    message: 'Task upload diantrikan — Connection Request dikirim ke CPE',
  };
  return redirectDevice(res, device);
}

export async function connectionRequest(req, res) {
  const device = await Device.findById(req.params.id);
  if (!device) return res.status(404).send('Device not found');

  if (isGenieacsDevice(device)) {
    return runGenieacsAction(device, req, res, () => genieacsConnectionRequest(device.deviceId));
  }

  const params = device.parameters || {};
  const getParam = (key) => {
    if (params instanceof Map) return params.get(key);
    return params[key];
  };

  try {
    const result = await sendConnectionRequest(device.connectionRequestUrl, {
      username: getParam('Device.ManagementServer.ConnectionRequestUsername') || '',
      password: getParam('Device.ManagementServer.ConnectionRequestPassword') || '',
    });

    req.session.flash = {
      type: result.ok ? 'success' : 'warning',
      message: result.ok
        ? `Connection Request berhasil (${result.status})`
        : `Connection Request gagal (${result.status} ${result.statusText})`,
    };
  } catch (err) {
    req.session.flash = { type: 'error', message: err.message };
  }

  return res.redirect(`/devices/${device._id}`);
}

export async function createDownloadTask(req, res) {
  const device = await Device.findById(req.params.id);
  if (!device) return res.status(404).send('Device not found');

  const file = await AcsFile.findById(req.body.fileId);
  if (!file) {
    return flashAndRedirect(req, res, device, 'error', 'File firmware tidak ditemukan');
  }

  if (isGenieacsDevice(device)) {
    return runGenieacsAction(device, req, res, () =>
      genieacsDownload(device.deviceId, {
        url: file.url,
        fileType: '1 Firmware Upgrade Image',
      }),
    );
  }

  await createTaskForDevice(device, {
    name: `Firmware: ${file.name}`,
    method: 'Download',
    payload: {
      url: file.url,
      fileType: '1 Firmware Upgrade Image',
      fileSize: file.size || 0,
      targetFileName: file.filename,
    },
    priority: 10,
  });

  req.session.flash = {
    type: 'success',
    message: `Firmware "${file.name}" diantrikan — Connection Request dikirim ke CPE`,
  };
  return redirectDevice(res, device);
}

export async function tasksPendingHtml(req, res) {
  const tasks = await Task.find({ status: 'pending' }).sort({ createdAt: -1 }).lean();

  const rows = tasks.length
    ? tasks
        .map(
          (t) => `<tr>
        <td>${escapeHtml(t.name)}</td>
        <td><code>${escapeHtml(t.deviceId)}</code></td>
        <td>${escapeHtml(t.method)}</td>
        <td>${new Date(t.createdAt).toLocaleString('id-ID')}</td>
        <td>
          <form method="post" action="/tasks/${t._id}/cancel" style="display:inline"
            onsubmit="return confirm('Batalkan task ini?')">
            <button type="submit" style="color:#dc2626;border:1px solid #fecaca;padding:4px 10px;border-radius:6px;background:#fff;cursor:pointer;font-size:12px">
              Batalkan
            </button>
          </form>
        </td>
      </tr>`,
        )
        .join('')
    : '<tr><td colspan="5" style="padding:16px;color:#71717a">Tidak ada task pending</td></tr>';

  res.send(`<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8"><title>Task Pending — MyACS</title>
<style>body{font-family:system-ui,sans-serif;margin:24px;color:#18181b}table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #e4e4e7;padding:10px;text-align:left;font-size:13px}th{font-size:11px;text-transform:uppercase;color:#71717a}a{color:#2563eb}</style>
</head><body>
<h1 style="font-size:18px;margin-bottom:4px">Batalkan Task Pending</h1>
<p style="color:#71717a;font-size:13px;margin-bottom:16px">Halaman ini selalu tersedia tanpa perlu update frontend.</p>
<table><thead><tr><th>Task</th><th>Device</th><th>Method</th><th>Dibuat</th><th>Aksi</th></tr></thead>
<tbody>${rows}</tbody></table>
<p style="margin-top:20px"><a href="/tasks">← Kembali ke Tasks</a></p>
</body></html>`);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function cancelTask(req, res) {
  const task = await Task.findOne({ _id: req.params.id, status: 'pending' });

  if (!task) {
    req.session.flash = { type: 'error', message: 'Task tidak ditemukan atau sudah diproses' };
  } else {
    task.status = 'cancelled';
    task.completedAt = new Date();
    await task.save();
    req.session.flash = { type: 'success', message: 'Task dibatalkan' };
  }

  const back = req.headers.referer || '/tasks';
  return res.redirect(back);
}

export async function syncGenieacs(req, res) {
  if (!config.genieacs.syncEnabled) {
    req.session.flash = { type: 'error', message: 'Sync GenieACS tidak aktif di mode ini' };
    return res.redirect('/dashboard');
  }

  try {
    const { synced, removed } = await syncDevicesFromGenieacs();
    req.session.flash = {
      type: 'success',
      message: `Sync GenieACS — ${synced} device diperbarui, ${removed} dihapus`,
    };
  } catch (err) {
    req.session.flash = { type: 'error', message: `Sync gagal: ${err.message}` };
  }

  return res.redirect('/dashboard');
}

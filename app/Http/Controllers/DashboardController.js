import Device from '../../models/Device.js';
import Task from '../../models/Task.js';
import Fault from '../../models/Fault.js';
import CwmpSession from '../../models/CwmpSession.js';
import Preset from '../../models/Preset.js';
import AcsFile from '../../models/AcsFile.js';
import { sendConnectionRequest } from '../../services/connectionRequest.js';
import { acsInfoForClient, getCwmpPublicUrl } from '../../helpers/acs.js';
import { validateConfig } from '../../config/validate.js';
import config from '../../config/index.js';
import { createTaskForDevice, wakeDeviceConnection, queueFetchConnectionRequestCredentials, markConnectionRequestSent, retryWakeForPendingTasks } from '../../services/tasks/queue.js';
import { parametersToEntries } from '../../helpers/parameters.js';
import { extractDeviceInfo } from '../../helpers/deviceInfo.js';
import { resolveConnectedClientsForDevice } from '../../services/devices/connectedClients.js';
import { queueDeviceInfoRefresh } from '../../services/devices/infoRefresh.js';
import {
  getConnectionRequestCredentials,
  connectionRequestCredentialStatus,
  hasConnectionRequestCredentials,
} from '../../helpers/connectionRequestCreds.js';
import { aggregateDashboardCharts } from '../../helpers/dashboardCharts.js';

function redirectDevice(res, device) {
  return res.redirect(`/devices/${device._id}`);
}

function flashAndRedirect(req, res, device, type, message) {
  req.session.flash = { type, message };
  return redirectDevice(res, device);
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
    pendingTasks,
    faultCount,
    recentDevices,
    chartDevices,
  ] = await Promise.all([
    Device.countDocuments(),
    Device.countDocuments({ isOnline: true }),
    Task.countDocuments({ status: 'pending' }),
    Fault.countDocuments({ resolved: false }),
    Device.find().sort({ lastInform: -1 }).limit(5).lean(),
    Device.find({}, { manufacturer: 1, model: 1, productClass: 1, parameters: 1 }).lean(),
  ]);

  let system = null;
  if (req.user?.role === 'admin') {
    const validation = validateConfig({ production: config.isProduction });
    const deployNotes = validation.errors.length ? [...validation.errors] : [];

    system = {
      health: 'ok',
      mongodb: true,
      cwmpUrl: getCwmpPublicUrl(),
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
      pendingTasks,
      faults: faultCount,
      presets: await Preset.countDocuments(),
      files: await AcsFile.countDocuments(),
    },
    charts: aggregateDashboardCharts(chartDevices),
    recentDevices: recentDevices.map((d) => ({
      id: d._id.toString(),
      deviceId: d.deviceId,
      manufacturer: d.manufacturer,
      model: d.model,
      serialNumber: d.serialNumber,
      lastInform: d.lastInform,
      isOnline: d.isOnline,
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
  const search = (req.query.search || '').trim();

  const filter = search
    ? {
        $or: [
          { deviceId: { $regex: search, $options: 'i' } },
          { serialNumber: { $regex: search, $options: 'i' } },
          { manufacturer: { $regex: search, $options: 'i' } },
          { model: { $regex: search, $options: 'i' } },
        ],
      }
    : {};

  const [devices, total] = await Promise.all([
    Device.find(filter)
      .sort({ lastInform: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .lean(),
    Device.countDocuments(filter),
  ]);

  const flash = req.session.flash || null;
  delete req.session.flash;

  return req.inertia.render('Devices/Index', {
    devices: devices.map((d) => ({
      id: d._id.toString(),
      deviceId: d.deviceId,
      serialNumber: d.serialNumber,
      manufacturer: d.manufacturer,
      model: d.model,
      productClass: d.productClass,
      softwareVersion: d.softwareVersion,
      ipAddress: d.ipAddress,
      lastInform: d.lastInform,
      isOnline: d.isOnline,
      tags: d.tags || [],
      info: extractDeviceInfo(d),
    })),
    pagination: {
      page,
      perPage,
      total,
      lastPage: Math.ceil(total / perPage) || 1,
    },
    filters: { search },
    acs: acsInfoForClient(),
    flash,
  });
}

export async function devicesShow(req, res) {
  const device = await Device.findById(req.params.id).lean();
  if (!device) return res.status(404).send('Device not found');

  const tasks = await Task.find({ deviceId: device.deviceId })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const parameters = Object.fromEntries(parametersToEntries(device.parameters, { limit: 200 }));

  const flash = req.session.flash || null;
  delete req.session.flash;

  const firmwareFiles = await AcsFile.find({ type: 'firmware' })
    .sort({ createdAt: -1 })
    .lean();

  const connectedClients = await resolveConnectedClientsForDevice(device);

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
      info: extractDeviceInfo(device),
      connectedClients,
    },
    tasks: tasks.map((t) => ({
      id: t._id.toString(),
      name: t.name,
      method: t.method,
      status: t.status,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
      retries: t.retries || 0,
      maxRetries: t.maxRetries || 3,
    })),
    firmwareFiles: firmwareFiles.map((f) => ({
      id: f._id.toString(),
      name: f.name,
      url: f.url,
      size: f.size,
    })),
    flash,
    acs: acsInfoForClient(),
    crCredentials: connectionRequestCredentialStatus(device),
  });
}

export async function deleteDevice(req, res) {
  const device = await Device.findById(req.params.id);
  if (!device) return res.status(404).send('Device not found');

  const { deviceId } = device;

  await Promise.all([
    Task.deleteMany({ deviceId }),
    Fault.deleteMany({ deviceId }),
    CwmpSession.deleteMany({ deviceId }),
  ]);
  await Device.findByIdAndDelete(device._id);

  req.session.flash = {
    type: 'success',
    message: `Device ${deviceId} berhasil dihapus dari MyACS.`,
  };

  return res.redirect('/devices');
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
      retries: t.retries || 0,
      maxRetries: t.maxRetries || 3,
    })),
  });
}

export async function createRebootTask(req, res) {
  const device = await Device.findById(req.params.id);
  if (!device) return res.status(404).send('Device not found');

  return queueMyacsTask(req, res, device, {
    name: 'Reboot device',
    method: 'Reboot',
    payload: {},
  }, 'Reboot');
}

export async function createFactoryResetTask(req, res) {
  const device = await Device.findById(req.params.id);
  if (!device) return res.status(404).send('Device not found');

  return queueMyacsTask(req, res, device, {
    name: 'Factory reset',
    method: 'FactoryReset',
    payload: {},
  }, 'Factory reset');
}

export async function createRefreshInfoTask(req, res) {
  const device = await Device.findById(req.params.id);
  if (!device) return res.status(404).send('Device not found');

  const queued = await queueDeviceInfoRefresh(device, { force: true });
  if (!queued) {
    return flashAndRedirect(req, res, device, 'error', 'Refresh info sudah antri atau baru dijalankan');
  }

  await wakeDeviceConnection(device);
  return flashAndRedirect(req, res, device, 'success', 'Refresh info device diantrikan — tunggu beberapa detik');
}

export async function createGetParamsTask(req, res) {
  const device = await Device.findById(req.params.id);
  if (!device) return res.status(404).send('Device not found');

  const raw = (req.body.names || '').trim();
  const names = raw
    ? raw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
    : ['Device.DeviceInfo.'];

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

  try {
    const credentials = getConnectionRequestCredentials(device);

    if (!hasConnectionRequestCredentials(credentials)) {
      await queueFetchConnectionRequestCredentials(device);
      req.session.flash = {
        type: 'warning',
        message:
          'Kredensial Connection Request belum diketahui — task Get Parameter diantrikan. ' +
          'Tunggu task selesai (cek halaman Tasks), lalu klik Conn. Request lagi. ' +
          'Alternatif: set CWMP_CR_USERNAME dan CWMP_CR_PASSWORD di .env (sama dengan yang dikonfigurasi di CPE).',
      };
      return res.redirect(`/devices/${device._id}`);
    }

    const result = await sendConnectionRequest(device.connectionRequestUrl, credentials);

    if (result.ok) {
      await markConnectionRequestSent(device.deviceId);
    }

    const detail = result.hint ? ` — ${result.hint}` : '';
    req.session.flash = {
      type: result.ok ? 'success' : 'warning',
      message: result.ok
        ? `Connection Request berhasil (${result.status})`
        : `Connection Request gagal (${result.status} ${result.statusText})${detail}`,
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

export async function retryTask(req, res) {
  const task = await Task.findOne({ _id: req.params.id, status: 'pending' });

  if (!task) {
    req.session.flash = { type: 'error', message: 'Task tidak ditemukan atau sudah diproses' };
  } else {
    task.retries = Math.max(0, (task.retries || 0));
    await task.save();

    const result = await retryWakeForPendingTasks(task.deviceId);
    if (result.ok) {
      req.session.flash = { type: 'success', message: 'Connection Request dikirim ulang — menunggu CPE merespons' };
    } else {
      req.session.flash = {
        type: 'warning',
        message: `Connection Request gagal (${result.error || result.hint || result.status || 'unknown'}) — task tetap pending, akan dicoba lagi otomatis`,
      };
    }
  }

  const back = req.headers.referer || '/tasks';
  return res.redirect(back);
}

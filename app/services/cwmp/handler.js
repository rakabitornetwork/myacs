import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import Device from '../../models/Device.js';
import Task from '../../models/Task.js';
import Fault from '../../models/Fault.js';
import { applyPresetsForDevice } from '../presets/apply.js';
import { createSession, resolveDeviceId, setCwmpCookie } from './session.js';
import { buildTaskRpc, extractParameterValues, extractParameterNames, findResponseType } from './rpc.js';
import { getClientIp } from '../../helpers/clientIp.js';
import { countPendingTasks } from '../tasks/queue.js';
import { paramUpdatesFromMap } from '../../helpers/parameters.js';
import { isConnectionRequestEvent, isBootEvent } from '../../helpers/cwmpEvents.js';
import { releaseStaleRunningTasks, completeRebootTasksOnBoot } from '../tasks/lifecycle.js';
import CwmpSession from '../../models/CwmpSession.js';

const CR_DISPATCH_WINDOW_MS = parseInt(process.env.CWMP_CR_DISPATCH_WINDOW_MS || '180000', 10);

function isRecentConnectionRequest(lastAt) {
  if (!lastAt) return false;
  return Date.now() - new Date(lastAt).getTime() < CR_DISPATCH_WINDOW_MS;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
});

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  suppressEmptyNode: true,
});

function extractDeviceId(envelope) {
  const body = envelope?.Envelope?.Body;
  if (!body?.Inform) return null;

  const deviceId = body.Inform.DeviceId || {};
  const oui = deviceId.OUI || deviceId['@_OUI'] || '';
  const serial = deviceId.SerialNumber || '';
  const productClass = deviceId.ProductClass || '';

  if (!serial) return null;
  return `${oui}-${productClass}-${serial}`.replace(/^-|-$/g, '').toLowerCase();
}

function paramValue(parameters, ...keys) {
  for (const key of keys) {
    const val = parameters[key];
    if (val !== undefined && val !== null && val !== '') return val;
  }
  return '';
}

function parseInform(envelope) {
  const inform = envelope?.Envelope?.Body?.Inform;
  if (!inform) return null;

  const deviceId = inform.DeviceId || {};
  const event = inform.Event?.EventStruct;
  const events = Array.isArray(event)
    ? event.map((e) => e.EventCode)
    : event
      ? [event.EventCode]
      : [];

  const params = inform.ParameterList?.ParameterValueStruct || [];
  const paramList = Array.isArray(params) ? params : [params];
  const parameters = {};
  for (const p of paramList) {
    if (p?.Name) parameters[p.Name] = p.Value?.['#text'] ?? p.Value ?? '';
  }

  return {
    oui: deviceId.OUI || '',
    serialNumber: deviceId.SerialNumber || '',
    productClass: deviceId.ProductClass || '',
    manufacturer: deviceId.Manufacturer || '',
    events,
    parameters,
    connectionRequestUrl: paramValue(
      parameters,
      'Device.ManagementServer.ConnectionRequestURL',
      'InternetGatewayDevice.ManagementServer.ConnectionRequestURL',
    ),
    softwareVersion: paramValue(
      parameters,
      'Device.DeviceInfo.SoftwareVersion',
      'InternetGatewayDevice.DeviceInfo.SoftwareVersion',
    ),
    hardwareVersion: paramValue(
      parameters,
      'Device.DeviceInfo.HardwareVersion',
      'InternetGatewayDevice.DeviceInfo.HardwareVersion',
    ),
    model: paramValue(
      parameters,
      'Device.DeviceInfo.ModelName',
      'InternetGatewayDevice.DeviceInfo.ModelName',
    ),
  };
}

function soapResponse(bodyContent, id = '1') {
  const envelope = {
    'soap:Envelope': {
      '@_xmlns:soap': 'http://schemas.xmlsoap.org/soap/envelope/',
      '@_xmlns:cwmp': 'urn:dslforum-org:cwmp-1-0',
      'soap:Header': {
        'cwmp:ID': { '@_soap:mustUnderstand': '1', '#text': id },
      },
      'soap:Body': bodyContent,
    },
  };
  return builder.build(envelope);
}

function informResponse(id) {
  return soapResponse({ InformResponse: { MaxEnvelopes: 1 } }, id);
}

function emptyResponse(id) {
  return soapResponse({}, id);
}

function isEmptyCwmpPost(body) {
  if (!body || Object.keys(body).length === 0) return true;
  return body.Empty !== undefined;
}

async function completeRunningTask(deviceKey, update) {
  return Task.findOneAndUpdate(
    { deviceId: deviceKey, status: 'running' },
    update,
    { sort: { updatedAt: -1 }, new: true },
  );
}

async function handleCwmpResponse(deviceKey, body, res, requestId) {
  const responseType = findResponseType(body);

  if (responseType === 'Fault') {
    const fault = body.Fault || {};
    const cwmpFault = fault.detail?.Fault || fault;
    const message = cwmpFault.FaultString || fault.faultstring || 'CWMP Fault';
    const code = cwmpFault.FaultCode || fault.faultcode || '';

    await completeRunningTask(deviceKey, {
      status: 'fault',
      fault: message,
      completedAt: new Date(),
      result: body,
    });

    await Fault.create({
      deviceId: deviceKey,
      code: String(code),
      message,
      detail: body,
    });

    res.set('Content-Type', 'text/xml; charset=utf-8');
    return res.send(emptyResponse(requestId));
  }

  if (!responseType) {
    res.set('Content-Type', 'text/xml; charset=utf-8');
    return res.send(emptyResponse(requestId));
  }

  await completeRunningTask(deviceKey, {
    status: 'completed',
    completedAt: new Date(),
    result: body,
  });

  if (responseType === 'GetParameterValuesResponse') {
    const params = extractParameterValues(body);
    if (Object.keys(params).length) {
      await Device.findOneAndUpdate({ deviceId: deviceKey }, { $set: paramUpdatesFromMap(params) });
    }
  }

  if (responseType === 'GetParameterNamesResponse') {
    const names = extractParameterNames(body);
    if (names.length) {
      const device = await Device.findOne({ deviceId: deviceKey }).lean();
      const existing = device?.parameters || {};
      const updates = Object.fromEntries(
        names.map((name) => [`parameters.${name}`, existing[name] ?? '']),
      );
      await Device.findOneAndUpdate({ deviceId: deviceKey }, { $set: updates });
    }
  }

  if (responseType === 'TransferComplete') {
    const commandKey = body.TransferComplete?.CommandKey;
    if (commandKey) {
      await Task.findByIdAndUpdate(commandKey, {
        status: 'completed',
        completedAt: new Date(),
        result: body.TransferComplete,
      });
    }
  }

  res.set('Content-Type', 'text/xml; charset=utf-8');
  return res.send(emptyResponse(requestId));
}

async function dispatchNextTask(deviceKey, res, requestId) {
  await CwmpSession.updateOne({ deviceId: deviceKey }, { awaitingDispatch: false });
  await releaseStaleRunningTasks(deviceKey);

  const task = await Task.findOneAndUpdate(
    { deviceId: deviceKey, status: 'pending' },
    { status: 'running' },
    { sort: { priority: -1, createdAt: 1 }, new: true },
  );

  if (!task) {
    res.set('Content-Type', 'text/xml; charset=utf-8');
    return res.send(emptyResponse(requestId));
  }

  console.log(`[cwmp] ${deviceKey} → ${task.method} (task ${task._id})`);

  const rpcBody = buildTaskRpc(task);
  if (!rpcBody) {
    await Task.findByIdAndUpdate(task._id, {
      status: 'fault',
      fault: `Unsupported method: ${task.method}`,
      completedAt: new Date(),
    });
    res.set('Content-Type', 'text/xml; charset=utf-8');
    return res.send(emptyResponse(requestId));
  }

  res.set('Content-Type', 'text/xml; charset=utf-8');
  return res.send(soapResponse(rpcBody, requestId));
}

export async function handleCwmpRequest(req, res) {
  const raw = typeof req.body === 'string' ? req.body : req.rawBody || '';

  // CPE mengirim HTTP POST kosong setelah InformResponse — ini trigger dispatch task (TR-069)
  if (!raw || raw.trim() === '') {
    const deviceKey = await resolveDeviceId(req);
    const requestId = '1';
    if (deviceKey) {
      console.log(`[cwmp] empty HTTP POST from ${deviceKey} — dispatch task`);
      return dispatchNextTask(deviceKey, res, requestId);
    }
    console.warn('[cwmp] empty HTTP POST tanpa session device');
    res.set('Content-Type', 'text/xml; charset=utf-8');
    return res.send(emptyResponse(requestId));
  }

  let envelope;
  try {
    envelope = parser.parse(raw);
  } catch {
    await Fault.create({ message: 'Invalid XML received', detail: { ip: req.ip } });
    return res.status(400).send('Invalid XML');
  }

  const body = envelope?.Envelope?.Body;
  const header = envelope?.Envelope?.Header;
  const requestId = header?.ID?.['#text'] || header?.ID || '1';

  const clientIp = getClientIp(req);

  if (body?.Inform) {
    const deviceKey = extractDeviceId(envelope);
    const info = parseInform(envelope);

    if (deviceKey && info) {
      const existingDevice = await Device.findOne({ deviceId: deviceKey }).lean();
      const pending = await countPendingTasks(deviceKey);
      const priorSession = await CwmpSession.findOne({ deviceId: deviceKey }).lean();
      const connectionRequestInform = isConnectionRequestEvent(info.events);
      const recentConnectionRequest = isRecentConnectionRequest(existingDevice?.lastConnectionRequestAt);

      const paramUpdates = paramUpdatesFromMap(info.parameters);

      const device = await Device.findOneAndUpdate(
        { deviceId: deviceKey },
        {
          $set: {
            deviceId: deviceKey,
            serialNumber: info.serialNumber,
            oui: info.oui,
            productClass: info.productClass,
            manufacturer: info.manufacturer,
            model: info.model,
            softwareVersion: info.softwareVersion,
            hardwareVersion: info.hardwareVersion,
            connectionRequestUrl: info.connectionRequestUrl,
            ipAddress: clientIp,
            lastInform: new Date(),
            isOnline: true,
            source: 'myacs',
            events: info.events,
            ...paramUpdates,
          },
        },
        { upsert: true, new: true },
      );

      const sessionId = await createSession(deviceKey, clientIp);
      setCwmpCookie(res, sessionId);

      if (isBootEvent(info.events) && device) {
        await applyPresetsForDevice(device);
        const completed = await completeRebootTasksOnBoot(deviceKey);
        if (completed > 0) {
          console.log(`[cwmp] ${deviceKey} BOOT — marked ${completed} reboot task(s) completed`);
        }
      }

      await releaseStaleRunningTasks(deviceKey);

      if (
        pending > 0 &&
        (connectionRequestInform || priorSession?.awaitingDispatch || recentConnectionRequest)
      ) {
        const reason = connectionRequestInform
          ? 'CONNECTION REQUEST'
          : recentConnectionRequest
            ? 'post-CR Inform'
            : 'repeat Inform';
        console.log(`[cwmp] ${deviceKey} ${reason} — dispatch ${pending} pending task(s)`);
        await CwmpSession.updateOne({ deviceId: deviceKey }, { awaitingDispatch: false });
        return dispatchNextTask(deviceKey, res, requestId);
      }

      if (pending > 0) {
        await CwmpSession.updateOne({ deviceId: deviceKey }, { awaitingDispatch: true });
        console.log(`[cwmp] ${deviceKey} inform — ${pending} pending task(s), menunggu empty POST`);
      }
    }

    res.set('Content-Type', 'text/xml; charset=utf-8');
    return res.send(informResponse(requestId));
  }

  const deviceKey = await resolveDeviceId(req);

  if (findResponseType(body)) {
    if (deviceKey) {
      return handleCwmpResponse(deviceKey, body, res, requestId);
    }
    res.set('Content-Type', 'text/xml; charset=utf-8');
    return res.send(emptyResponse(requestId));
  }

  if (isEmptyCwmpPost(body)) {
    if (deviceKey) {
      return dispatchNextTask(deviceKey, res, requestId);
    }
    console.warn('[cwmp] empty POST tanpa session device — task tidak bisa dikirim');
    res.set('Content-Type', 'text/xml; charset=utf-8');
    return res.send(emptyResponse(requestId));
  }

  res.set('Content-Type', 'text/xml; charset=utf-8');
  return res.send(emptyResponse(requestId));
}

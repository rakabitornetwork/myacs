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
import { isBootEvent } from '../../helpers/cwmpEvents.js';
import { releaseStaleRunningTasks, completeRebootTasksOnBoot, completePendingRebootTasksOnBoot } from '../tasks/lifecycle.js';
import CwmpSession from '../../models/CwmpSession.js';

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

const SOAP_XML_PREFIX = '<?xml version="1.0" encoding="UTF-8"?>\n';
const DISPATCH_SESSION_MAX_AGE_MS = parseInt(process.env.CWMP_DISPATCH_SESSION_MAX_AGE_MS || '120000', 10);

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
        'cwmp:ID': { '@_soap:mustUnderstand': '1', '#text': String(id) },
      },
      'soap:Body': bodyContent,
    },
  };
  return SOAP_XML_PREFIX + builder.build(envelope);
}

function informResponse(id, maxEnvelopes) {
  return soapResponse({ InformResponse: { MaxEnvelopes: maxEnvelopes } }, id);
}

function emptyResponse(id) {
  return soapResponse({}, id);
}

function sendCwmpXml(res, xml) {
  res.set('Content-Type', 'text/xml; charset=utf-8');
  res.set('Connection', 'close');
  return res.send(xml);
}

async function shouldDispatchAfterEmptyPost(deviceKey) {
  const [session, pending] = await Promise.all([
    CwmpSession.findOne({ deviceId: deviceKey }).lean(),
    countPendingTasks(deviceKey),
  ]);

  if (!pending) return false;
  if (!session?.awaitingDispatch) return false;

  const ageMs = Date.now() - new Date(session.lastSeen || 0).getTime();
  return ageMs <= DISPATCH_SESSION_MAX_AGE_MS;
}

async function finishEmptyPost(deviceKey, res, requestId) {
  if (deviceKey && (await shouldDispatchAfterEmptyPost(deviceKey))) {
    console.log(`[cwmp] empty POST from ${deviceKey} — dispatch task`);
    return dispatchNextTask(deviceKey, res, requestId);
  }

  if (deviceKey) {
    await CwmpSession.updateOne({ deviceId: deviceKey }, { awaitingDispatch: false });
    console.log(`[cwmp] empty POST from ${deviceKey} — sesi selesai (tanpa task)`);
  }

  return sendCwmpXml(res, emptyResponse(requestId));
}

function isEmptyCwmpPost(body) {
  if (!body || Object.keys(body).length === 0) return true;
  if (body.Empty !== undefined) return true;
  const keys = Object.keys(body).filter((k) => !k.startsWith('@_'));
  return keys.length === 0;
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

    return sendCwmpXml(res, emptyResponse(requestId));
  }

  if (!responseType) {
    return sendCwmpXml(res, emptyResponse(requestId));
  }

  await completeRunningTask(deviceKey, {
    status: 'completed',
    completedAt: new Date(),
    result: body,
  });

  if (responseType === 'RebootResponse' || responseType === 'FactoryResetResponse') {
    return sendCwmpXml(res, emptyResponse(requestId));
  }

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

  return sendCwmpXml(res, emptyResponse(requestId));
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
    return sendCwmpXml(res, emptyResponse(requestId));
  }

  console.log(`[cwmp] ${deviceKey} → ${task.method} (task ${task._id})`);

  const rpcBody = buildTaskRpc(task);
  if (!rpcBody) {
    await Task.findByIdAndUpdate(task._id, {
      status: 'fault',
      fault: `Unsupported method: ${task.method}`,
      completedAt: new Date(),
    });
    return sendCwmpXml(res, emptyResponse(requestId));
  }

  return sendCwmpXml(res, soapResponse(rpcBody, requestId));
}

export async function handleCwmpRequest(req, res) {
  const raw = typeof req.body === 'string' ? req.body : (req.rawBody ?? '');
  const bodyPreview = raw.trim().slice(0, 80).replace(/\s+/g, ' ');

  if (!raw || raw.trim() === '') {
    const deviceKey = await resolveDeviceId(req);
    console.log(`[cwmp] empty raw POST device=${deviceKey || 'unknown'}`);
    return finishEmptyPost(deviceKey, res, '1');
  }

  let envelope;
  try {
    envelope = parser.parse(raw);
  } catch {
    console.warn(`[cwmp] invalid XML (${raw.length} bytes) from ${getClientIp(req)}`);
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
    let pendingCount = 0;

    if (deviceKey && info) {
      pendingCount = await countPendingTasks(deviceKey);

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
        const completedRunning = await completeRebootTasksOnBoot(deviceKey);
        const completedPending = await completePendingRebootTasksOnBoot(deviceKey);
        const totalCompleted = completedRunning + completedPending;
        if (totalCompleted > 0) {
          console.log(`[cwmp] ${deviceKey} BOOT — marked ${totalCompleted} reboot task(s) completed`);
        }
      }

      await releaseStaleRunningTasks(deviceKey);
      pendingCount = await countPendingTasks(deviceKey);

      // TR-069: MaxEnvelopes MUST be >= 1. Nilai 0 membuat beberapa ONU (CMHI) gagal Manual Inform.
      if (pendingCount > 0) {
        await CwmpSession.updateOne({ deviceId: deviceKey }, { awaitingDispatch: true });
      } else {
        await CwmpSession.updateOne({ deviceId: deviceKey }, { awaitingDispatch: false });
      }

      console.log(
        `[cwmp] ${deviceKey} inform [${(info.events || []).join(', ')}] pending=${pendingCount}`,
      );

      return sendCwmpXml(res, informResponse(requestId, 1));
    }

    console.warn(`[cwmp] inform tanpa deviceKey (${raw.length} bytes): ${bodyPreview}`);
    return sendCwmpXml(res, informResponse(requestId, 1));
  }

  const deviceKey = await resolveDeviceId(req);

  if (findResponseType(body)) {
    if (deviceKey) {
      return handleCwmpResponse(deviceKey, body, res, requestId);
    }
    return sendCwmpXml(res, emptyResponse(requestId));
  }

  if (isEmptyCwmpPost(body)) {
    if (deviceKey) {
      return finishEmptyPost(deviceKey, res, requestId);
    }
    console.warn('[cwmp] empty SOAP POST tanpa session device');
    return sendCwmpXml(res, emptyResponse(requestId));
  }

  console.warn(`[cwmp] unhandled SOAP from ${deviceKey || 'unknown'}: ${bodyPreview}`);
  return sendCwmpXml(res, emptyResponse(requestId));
}

import crypto from 'crypto';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import Device from '../../models/Device.js';
import Task from '../../models/Task.js';
import Fault from '../../models/Fault.js';
import { applyPresetsForDevice } from '../presets/apply.js';
import { resolveDeviceId, setCwmpCookie } from './session.js';
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

const INFORM_RAW_RE = /<(?:[\w-]+:)?Inform\b/i;

function getEnvelopeRoot(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  if (parsed.Envelope) return parsed.Envelope;
  const key = Object.keys(parsed).find((k) => !k.startsWith('@_') && !k.startsWith('?') && /envelope/i.test(k));
  return key ? parsed[key] : null;
}

function getSoapBody(envelope) {
  const root = getEnvelopeRoot(envelope);
  if (!root) return null;
  if (root.Body) return root.Body;
  const key = Object.keys(root).find((k) => !k.startsWith('@_') && /body/i.test(k));
  return key ? root[key] : null;
}

function getSoapHeader(envelope) {
  const root = getEnvelopeRoot(envelope);
  if (!root) return null;
  if (root.Header) return root.Header;
  const key = Object.keys(root).find((k) => !k.startsWith('@_') && /header/i.test(k));
  return key ? root[key] : null;
}

function getInformNode(body) {
  if (!body || typeof body !== 'object') return null;
  if (body.Inform) return body.Inform;
  const key = Object.keys(body).find((k) => !k.startsWith('@_') && /^inform$/i.test(k));
  return key ? body[key] : null;
}

function isRawInform(raw) {
  return INFORM_RAW_RE.test(raw);
}

function extractRequestId(header, raw) {
  const fromHeader = header?.ID?.['#text'] ?? header?.ID;
  if (fromHeader) return String(fromHeader);
  const match = raw.match(/<(?:[\w-]+:)?ID[^>]*>([^<]+)<\/(?:[\w-]+:)?ID>/i);
  return match?.[1]?.trim() || '1';
}

function extractDeviceId(envelope) {
  const inform = getInformNode(getSoapBody(envelope));
  if (!inform) return null;

  const deviceId = inform.DeviceId || {};
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
  const inform = getInformNode(getSoapBody(envelope));
  if (!inform) return null;
  return parseInformNode(inform);
}

function parseInformNode(inform) {
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
    'soap-env:Envelope': {
      '@_xmlns:soap-env': 'http://schemas.xmlsoap.org/soap/envelope/',
      '@_xmlns:cwmp': 'urn:dslforum-org:cwmp-1-0',
      'soap-env:Header': {
        'cwmp:ID': { '@_soap-env:mustUnderstand': '1', '#text': String(id) },
      },
      'soap-env:Body': bodyContent,
    },
  };
  return SOAP_XML_PREFIX + builder.build(envelope);
}

function informResponse(id, maxEnvelopes = 1) {
  return soapResponse({
    'cwmp:InformResponse': {
      MaxEnvelopes: maxEnvelopes,
    },
  }, id);
}

function emptyResponse(id) {
  return soapResponse({}, id);
}

function sendCwmpXml(res, xml) {
  res.set('Content-Type', 'text/xml; charset=utf-8');
  return res.send(xml);
}

async function processInformBackground(deviceKey, info, clientIp, sessionId) {
  try {
    await CwmpSession.findOneAndUpdate(
      { deviceId: deviceKey },
      { sessionId, deviceId: deviceKey, ipAddress: clientIp, lastSeen: new Date() },
      { upsert: true },
    );

    const pendingCount = await countPendingTasks(deviceKey);
    await CwmpSession.updateOne({ deviceId: deviceKey }, { awaitingDispatch: pendingCount > 0 });

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
  } catch (err) {
    console.error(`[cwmp] ${deviceKey} inform background error:`, err.message);
  }
}

function replyInform(req, res, envelope, raw, clientIp) {
  const body = getSoapBody(envelope);
  const header = getSoapHeader(envelope);
  const informNode = getInformNode(body);
  const isInform = informNode || isRawInform(raw);

  if (!isInform) return false;

  const requestId = extractRequestId(header, raw);
  const deviceKey = extractDeviceId(envelope);
  const info = informNode ? parseInformNode(informNode) : null;
  const sessionId = crypto.randomBytes(16).toString('hex');

  console.log(`[cwmp] inform received from ${clientIp} (${raw.length} bytes) keys=${Object.keys(body || {}).join(',') || 'raw'}`);

  setCwmpCookie(res, sessionId, req);
  sendCwmpXml(res, informResponse(requestId, 1));

  if (deviceKey && info) {
    console.log(`[cwmp] ${deviceKey} inform [${(info.events || []).join(', ')}] — InformResponse sent`);
    setImmediate(() => processInformBackground(deviceKey, info, clientIp, sessionId));
  } else {
    console.warn(`[cwmp] inform tanpa deviceKey (${raw.length} bytes) — InformResponse sent anyway`);
  }

  return true;
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

  sendCwmpXml(res, emptyResponse(requestId));

  if (deviceKey) {
    CwmpSession.updateOne({ deviceId: deviceKey }, { awaitingDispatch: false }).catch(() => {});
    console.log(`[cwmp] empty POST from ${deviceKey} — sesi selesai (tanpa task)`);
  }
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
  const clientIp = getClientIp(req);

  console.log(`[cwmp] handle POST ${raw.length}b from ${clientIp} proto=${req.headers['x-forwarded-proto'] || '-'}`);

  if (!raw || raw.trim() === '') {
    const deviceKey = await resolveDeviceId(req);
    console.log(`[cwmp] empty raw POST device=${deviceKey || 'unknown'}`);
    return finishEmptyPost(deviceKey, res, '1');
  }

  let envelope;
  try {
    envelope = parser.parse(raw);
  } catch {
    if (isRawInform(raw)) {
      const requestId = extractRequestId(null, raw);
      console.warn(`[cwmp] invalid XML but Inform detected (${raw.length}b) — sending InformResponse`);
      sendCwmpXml(res, informResponse(requestId, 1));
      return;
    }
    console.warn(`[cwmp] invalid XML (${raw.length} bytes) from ${clientIp}: ${bodyPreview}`);
    return res.status(400).send('Invalid XML');
  }

  if (replyInform(req, res, envelope, raw, clientIp)) return;

  const body = getSoapBody(envelope);
  const header = getSoapHeader(envelope);
  const requestId = extractRequestId(header, raw);

  console.log(`[cwmp] non-inform SOAP keys=${Object.keys(body || {}).join(',') || 'none'} preview=${bodyPreview}`);

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

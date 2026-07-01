import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import Device from '../../models/Device.js';
import Task from '../../models/Task.js';
import Fault from '../../models/Fault.js';
import { applyPresetsForDevice } from '../presets/apply.js';
import { createSession, resolveDeviceId, setCwmpCookie } from './session.js';
import { buildTaskRpc, extractParameterValues, extractParameterNames, findResponseType } from './rpc.js';
import { getClientIp } from '../../helpers/clientIp.js';
import { countPendingTasks, wakeDeviceConnection } from '../tasks/queue.js';
import { paramUpdatesFromMap } from '../../helpers/parameters.js';
import { isConnectionRequestEvent, isBootEvent } from '../../helpers/cwmpEvents.js';
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

async function shouldDispatchAfterEmptyPost(deviceKey) {
  const [session, pending] = await Promise.all([
    CwmpSession.findOne({ deviceId: deviceKey }).lean(),
    countPendingTasks(deviceKey),
  ]);

  if (!pending) return false;

  // If awaitingDispatch is set, always dispatch
  if (session?.awaitingDispatch) return true;

  // Even if awaitingDispatch wasn't set, dispatch if session is recent
  // This handles CPEs that send empty POST without prior Inform in the same session
  if (session) {
    const ageMs = Date.now() - new Date(session.lastSeen || 0).getTime();
    if (ageMs <= 300_000) return true; // 5 minute window
  }

  // No session but has pending tasks — still try to dispatch
  return true;
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

  res.set('Content-Type', 'text/xml; charset=utf-8');
  return res.send(emptyResponse(requestId));
}

function emptyResponse(id) {
  return soapResponse({}, id);
}

function isEmptyCwmpPost(body) {
  if (!body || Object.keys(body).length === 0) return true;
  if (body.Empty !== undefined) return true;
  // Beberapa CPE kirim Body kosong tanpa child element
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

  // After RebootResponse, the CPE will reboot — no point sending more RPCs.
  // The task is already marked completed above. Just close the session.
  if (responseType === 'RebootResponse' || responseType === 'FactoryResetResponse') {
    res.set('Content-Type', 'text/xml; charset=utf-8');
    return res.send(emptyResponse(requestId));
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
  const raw = typeof req.body === 'string' ? req.body : (req.rawBody ?? '');

  // CPE mengirim HTTP POST kosong setelah InformResponse — ini trigger dispatch task (TR-069)
  // Some CPEs send empty body, empty XML, or zero-length content
  if (!raw || raw.trim() === '') {
    const deviceKey = await resolveDeviceId(req);
    console.log(`[cwmp] empty raw POST received, deviceKey=${deviceKey || 'unknown'}`);
    return finishEmptyPost(deviceKey, res, '1');
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
    let pendingCount = 0;

    if (deviceKey && info) {
      pendingCount = await countPendingTasks(deviceKey);
      const connectionRequestInform = isConnectionRequestEvent(info.events);

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
          console.log(`[cwmp] ${deviceKey} BOOT — marked ${totalCompleted} reboot task(s) completed (running=${completedRunning}, pending=${completedPending})`);
        }
      }

      console.log(
        `[cwmp] ${deviceKey} inform [${(info.events || []).join(', ')}] pending=${pendingCount}`,
      );

      await releaseStaleRunningTasks(deviceKey);

      // Recount pending tasks — BOOT event may have completed some
      pendingCount = await countPendingTasks(deviceKey);

      if (pendingCount > 0) {
        // Connection Request Inform: CPE came because of our request.
        // Dispatch task directly — CPE expects work to be sent.
        if (connectionRequestInform) {
          console.log(`[cwmp] ${deviceKey} CONNECTION REQUEST — dispatching task directly (${pendingCount} pending)`);
          return dispatchNextTask(deviceKey, res, requestId);
        }

        // Periodic/Boot Inform with pending tasks:
        // Some CPEs (ONU CMHI) REQUIRE InformResponse before accepting RPC
        // and do NOT send empty POST after InformResponse.
        // Strategy: send InformResponse, then immediately re-send Connection Request
        // so CPE reconnects and we dispatch via Connection Request Inform.
        await CwmpSession.updateOne({ deviceId: deviceKey }, { awaitingDispatch: true });
        console.log(`[cwmp] ${deviceKey} inform with ${pendingCount} pending — sending InformResponse + scheduling immediate CR`);

        res.set('Content-Type', 'text/xml; charset=utf-8');
        res.send(informResponse(requestId));

        // Schedule Connection Request after response is sent (non-blocking)
        setTimeout(async () => {
          try {
            const result = await wakeDeviceConnection(device);
            if (result.ok) {
              console.log(`[cwmp] ${deviceKey} immediate CR sent after InformResponse`);
            } else if (!result.skipped) {
              console.log(`[cwmp] ${deviceKey} immediate CR failed: ${result.error || result.hint || result.status}`);
            }
          } catch (err) {
            console.warn(`[cwmp] ${deviceKey} immediate CR error:`, err.message);
          }
        }, 500);
        return;
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
      return finishEmptyPost(deviceKey, res, requestId);
    }
    console.warn('[cwmp] empty SOAP POST tanpa session device');
    res.set('Content-Type', 'text/xml; charset=utf-8');
    return res.send(emptyResponse(requestId));
  }

  res.set('Content-Type', 'text/xml; charset=utf-8');
  return res.send(emptyResponse(requestId));
}

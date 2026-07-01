export function buildTaskRpc(task) {
  const key = task._id.toString();

  switch (task.method) {
    case 'GetParameterValues':
      return {
        GetParameterValues: {
          ParameterNames: {
            string: task.payload?.names || ['Device.DeviceInfo.'],
          },
        },
      };

    case 'GetParameterNames':
      return {
        GetParameterNames: {
          ParameterPath: task.payload?.path || 'Device.',
          NextLevel: task.payload?.nextLevel ?? false,
        },
      };

    case 'Reboot':
      return { Reboot: { CommandKey: key } };

    case 'FactoryReset':
      return { FactoryReset: { CommandKey: key } };

    case 'SetParameterValues': {
      const values = (task.payload?.values || []).map((v) => ({
        Name: v.name,
        Value: { '@_xsi:type': v.type || 'xsd:string', '#text': String(v.value ?? '') },
      }));
      return {
        SetParameterValues: {
          ParameterList: { ParameterValueStruct: values },
          ParameterKey: key,
        },
      };
    }

    case 'AddObject':
      return {
        AddObject: {
          ObjectName: task.payload?.objectName,
          ParameterKey: key,
        },
      };

    case 'DeleteObject':
      return {
        DeleteObject: {
          ObjectName: task.payload?.objectName,
          ParameterKey: key,
        },
      };

    case 'Download':
      return {
        Download: {
          CommandKey: key,
          FileType: task.payload?.fileType || '1 Firmware Upgrade Image',
          URL: task.payload?.url || '',
          Username: task.payload?.username || '',
          Password: task.payload?.password || '',
          FileSize: task.payload?.fileSize || 0,
          TargetFileName: task.payload?.targetFileName || '',
          DelaySeconds: task.payload?.delaySeconds || 0,
          SuccessURL: '',
          FailureURL: '',
        },
      };

    case 'Upload':
      return {
        Upload: {
          CommandKey: key,
          FileType: task.payload?.fileType || '1 Vendor Configuration File',
          URL: task.payload?.url || '',
          Username: task.payload?.username || '',
          Password: task.payload?.password || '',
          DelaySeconds: task.payload?.delaySeconds || 0,
        },
      };

    default:
      return null;
  }
}

export function extractParameterValues(body) {
  const list = body?.GetParameterValuesResponse?.ParameterList?.ParameterValueStruct;
  if (!list) return {};
  const items = Array.isArray(list) ? list : [list];
  const params = {};
  for (const p of items) {
    if (p?.Name) params[p.Name] = p.Value?.['#text'] ?? p.Value ?? '';
  }
  return params;
}

export function extractParameterNames(body) {
  const list = body?.GetParameterNamesResponse?.ParameterList?.ParameterInfoStruct;
  if (!list) return [];
  const items = Array.isArray(list) ? list : [list];
  return items.map((p) => p?.Name).filter(Boolean);
}

export const RESPONSE_METHODS = [
  'GetParameterValuesResponse',
  'SetParameterValuesResponse',
  'GetParameterNamesResponse',
  'RebootResponse',
  'DownloadResponse',
  'UploadResponse',
  'TransferComplete',
  'AddObjectResponse',
  'DeleteObjectResponse',
  'FactoryResetResponse',
];

export function findResponseType(body) {
  if (!body) return null;
  return RESPONSE_METHODS.find((m) => body[m]) || (body.Fault ? 'Fault' : null);
}

import config from '../../config/index.js';
import { flattenParameterMap } from '../../helpers/parameters.js';
import { pickHostParameters } from '../../helpers/genieacsParams.js';
import { extractConnectedClients } from '../../helpers/connectedClients.js';
import { fetchGenieacsDeviceDoc } from '../genieacs/importParams.js';

export async function resolveConnectedClientsForDevice(device) {
  const params = flattenParameterMap(device?.parameters);

  const hasGenieacs = Boolean(config.genieacs.mongoUri || config.genieacs.nbiUrl?.trim());
  if (hasGenieacs && device?.deviceId) {
    try {
      const doc = await fetchGenieacsDeviceDoc(device.deviceId);
      if (doc) {
        Object.assign(params, pickHostParameters(doc));
      }
    } catch {
      // fallback ke parameter lokal MyACS
    }
  }

  return extractConnectedClients({ parameters: params });
}

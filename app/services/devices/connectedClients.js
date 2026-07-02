import { flattenParameterMap } from '../../helpers/parameters.js';
import { extractConnectedClients } from '../../helpers/connectedClients.js';

export async function resolveConnectedClientsForDevice(device) {
  const params = flattenParameterMap(device?.parameters);
  return extractConnectedClients({ parameters: params });
}

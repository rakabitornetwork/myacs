import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getConnectionRequestCredentials } from '../app/helpers/connectionRequestCreds.js';

describe('getConnectionRequestCredentials', () => {
  it('reads InternetGatewayDevice CR credentials', () => {
    const creds = getConnectionRequestCredentials({
      parameters: {
        InternetGatewayDevice: {
          ManagementServer: {
            ConnectionRequestUsername: 'acs',
            ConnectionRequestPassword: 'secret',
          },
        },
      },
    });

    assert.equal(creds.username, 'acs');
    assert.equal(creds.password, 'secret');
  });

  it('reads flat Device.* credentials as fallback', () => {
    const creds = getConnectionRequestCredentials({
      parameters: {
        'Device.ManagementServer.ConnectionRequestUsername': 'user1',
        'Device.ManagementServer.ConnectionRequestPassword': 'pass1',
      },
    });

    assert.equal(creds.username, 'user1');
    assert.equal(creds.password, 'pass1');
  });
});

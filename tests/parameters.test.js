import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  flattenParameterMap,
  normalizeParamScalar,
  parametersToEntries,
} from '../app/helpers/parameters.js';

describe('normalizeParamScalar', () => {
  it('extracts #text from CWMP typed value', () => {
    assert.equal(normalizeParamScalar({ '#text': 'V2.0.1', '@_type': 'xsd:string' }), 'V2.0.1');
  });

  it('returns empty for typed placeholder without text', () => {
    assert.equal(normalizeParamScalar({ '@_type': 'xsd:string' }), '');
  });
});

describe('flattenParameterMap', () => {
  it('flattens InternetGatewayDevice tree', () => {
    const flat = flattenParameterMap({
      InternetGatewayDevice: {
        DeviceInfo: {
          SoftwareVersion: 'V2.0.1',
          HardwareVersion: '1',
        },
        ManagementServer: {
          ConnectionRequestURL: 'http://10.0.0.1:7547/tr69',
        },
      },
    });

    assert.equal(flat['InternetGatewayDevice.DeviceInfo.SoftwareVersion'], 'V2.0.1');
    assert.equal(flat['InternetGatewayDevice.ManagementServer.ConnectionRequestURL'], 'http://10.0.0.1:7547/tr69');
    assert.equal(flat.InternetGatewayDevice, undefined);
  });

  it('keeps flat scalar parameters', () => {
    const flat = flattenParameterMap({
      'InternetGatewayDevice.DeviceInfo.SoftwareVersion': 'V2.0.1',
    });
    assert.equal(flat['InternetGatewayDevice.DeviceInfo.SoftwareVersion'], 'V2.0.1');
  });
});

describe('parametersToEntries', () => {
  it('sorts paths alphabetically', () => {
    const entries = parametersToEntries({
      b: '2',
      a: '1',
    });
    assert.deepEqual(entries[0], ['a', '1']);
  });
});

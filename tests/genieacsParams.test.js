import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { flattenGenieacsDocument, pickInfoParameters, categorizeInfoPaths } from '../app/helpers/genieacsParams.js';
import { extractDeviceInfo } from '../app/helpers/deviceInfo.js';

describe('genieacsParams', () => {
  const sampleDoc = {
    _id: '20968a-mjm-01-cmhi202b8e62',
    _lastInform: new Date('2026-07-01'),
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username': {
      _value: 'demo@xpon',
      _type: 'xsd:string',
    },
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID': {
      _value: 'CMHI-WiFi',
      _type: 'xsd:string',
    },
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.WPAKeyPassphrase': {
      _value: 'wifi1234',
      _type: 'xsd:string',
    },
    'InternetGatewayDevice.WANDevice.1.X_CMHI_GponInterfaceConfig.RxPower': {
      _value: '-23.1',
      _type: 'xsd:string',
    },
    'VirtualParameters.wifipassword': {
      _value: 'from-provision',
      _type: 'xsd:string',
    },
    'InternetGatewayDevice.DeviceInfo.Manufacturer': {
      _value: 'CMHI',
      _type: 'xsd:string',
    },
  };

  it('flattens GenieACS document values', () => {
    const flat = flattenGenieacsDocument(sampleDoc);
    assert.equal(flat['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username'], 'demo@xpon');
    assert.equal(flat['VirtualParameters.wifipassword'], 'from-provision');
    assert.equal(flat['InternetGatewayDevice.DeviceInfo.Manufacturer'], 'CMHI');
  });

  it('picks info-related parameters only', () => {
    const picked = pickInfoParameters(sampleDoc);
    assert.ok(picked['InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID']);
    assert.equal(picked['InternetGatewayDevice.DeviceInfo.Manufacturer'], undefined);
  });

  it('extracts device info from GenieACS-style parameters', () => {
    const info = extractDeviceInfo({
      manufacturer: 'CMHI',
      model: 'MJM-01',
      parameters: pickInfoParameters(sampleDoc),
    });
    assert.equal(info.pppoeUsername, 'demo@xpon');
    assert.equal(info.ssid, 'CMHI-WiFi');
    assert.equal(info.rxPower, '-23.10 dBm');
  });

  it('categorizes paths for inspection script', () => {
    const cats = categorizeInfoPaths(pickInfoParameters(sampleDoc));
    assert.ok(cats.ssid.length >= 1);
    assert.ok(cats.rxPower.length >= 1);
  });
});

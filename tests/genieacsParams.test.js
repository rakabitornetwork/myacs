import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { flattenGenieacsDocument, pickInfoParameters, categorizeInfoPaths } from '../app/helpers/genieacsParams.js';
import { extractDeviceInfo, formatRxPower, formatTemperature } from '../app/helpers/deviceInfo.js';

describe('genieacsParams', () => {
  const nestedDoc = {
    _id: '20968A-MJM-01-CMHI202B8E62',
    InternetGatewayDevice: {
      WANDevice: {
        1: {
          WANConnectionDevice: {
            1: {
              WANPPPConnection: {
                1: {
                  Username: { _value: 'demo@xpon', _type: 'xsd:string' },
                  Password: { _value: '', _type: 'xsd:string' },
                },
              },
            },
          },
          X_CMCC_EponInterfaceConfig: {
            RXPower: { _value: 191, _type: 'xsd:int' },
            TransceiverTemperature: { _value: 14183, _type: 'xsd:int' },
          },
        },
      },
      LANDevice: {
        1: {
          WLANConfiguration: {
            1: {
              Enable: { _value: true, _type: 'xsd:boolean' },
              SSID: { _value: 'DEMO XPON', _type: 'xsd:string' },
              PreSharedKey: {
                1: {
                  KeyPassphrase: { _value: '', _type: 'xsd:string' },
                },
              },
            },
          },
        },
      },
    },
    VirtualParameters: {
      RXPower: { _value: '-17.18', _type: 'xsd:string' },
      gettemp: { _value: 55, _type: 'xsd:int' },
      pppoeUsername: { _value: 'demo@xpon', _type: 'xsd:string' },
    },
  };

  it('flattens nested GenieACS NBI document', () => {
    const flat = flattenGenieacsDocument(nestedDoc);
    assert.equal(flat['InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID'], 'DEMO XPON');
    assert.equal(flat['VirtualParameters.RXPower'], '-17.18');
    assert.equal(flat['InternetGatewayDevice.WANDevice.1.X_CMCC_EponInterfaceConfig.RXPower'], '191');
  });

  it('picks info-related parameters only', () => {
    const picked = pickInfoParameters(nestedDoc);
    assert.ok(picked['InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID']);
    assert.ok(picked['VirtualParameters.RXPower']);
  });

  it('extracts CMHI MJM-01 info from GenieACS-style parameters', () => {
    const info = extractDeviceInfo({
      manufacturer: 'CMHI',
      model: 'MJM-01',
      parameters: pickInfoParameters(nestedDoc),
    });
    assert.equal(info.pppoeUsername, 'demo@xpon');
    assert.equal(info.ssid, 'DEMO XPON');
    assert.equal(info.rxPower, '-17.18 dBm');
    assert.equal(info.temperature, '55.0 °C');
  });

  it('converts CMCC raw optical values', () => {
    assert.equal(formatRxPower('191'), '-17.16 dBm');
    assert.equal(formatTemperature('14183'), '55.4 °C');
  });

  it('categorizes paths for inspection script', () => {
    const cats = categorizeInfoPaths(pickInfoParameters(nestedDoc));
    assert.ok(cats.ssid.length >= 1);
    assert.ok(cats.rxPower.length >= 1);
    assert.ok(cats.temperature.length >= 1);
  });
});

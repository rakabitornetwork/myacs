import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractDeviceInfo, maskSecret, formatRxPower } from '../app/helpers/deviceInfo.js';

describe('extractDeviceInfo', () => {
  it('reads PPPoE and WiFi from InternetGatewayDevice paths', () => {
    const info = extractDeviceInfo({
      manufacturer: 'CMHI',
      model: 'MJM-01',
      productClass: 'MJM-01',
      parameters: {
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username': 'user@test',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Password': 'secret123',
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID': 'MyWiFi',
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase': 'wifipass',
        'InternetGatewayDevice.WANDevice.1.X_CMHI_GponInterfaceConfig.RXPower': '-21.5',
        'InternetGatewayDevice.DeviceInfo.Temperature': '45',
      },
    });

    assert.equal(info.brand, 'CMHI');
    assert.equal(info.onuType, 'MJM-01');
    assert.equal(info.pppoeUsername, 'user@test');
    assert.equal(info.pppoePassword, 'secret123');
    assert.equal(info.ssid, 'MyWiFi');
    assert.equal(info.ssidPassword, 'wifipass');
    assert.equal(info.rxPower, '-21.50 dBm');
    assert.equal(info.temperature, '45.0 °C');
  });

  it('masks secrets', () => {
    assert.equal(maskSecret('secret123').startsWith('s'), true);
    assert.equal(maskSecret(''), '');
  });

  it('formats rx power', () => {
    assert.equal(formatRxPower('-21.5'), '-21.50 dBm');
  });
});

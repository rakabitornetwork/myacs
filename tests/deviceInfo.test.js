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
    assert.equal(info.rxPower, `-21.50\u00A0dBm`);
    assert.equal(info.temperature, `45.0\u00A0°C`);
    assert.equal(info.rxPowerStatus.level, 'normal');
    assert.equal(info.temperatureStatus.level, 'normal');
  });

  it('masks secrets', () => {
    assert.equal(maskSecret('secret123').startsWith('s'), true);
    assert.equal(maskSecret(''), '');
  });

  it('finds SSID by suffix scan when path differs', () => {
    const info = extractDeviceInfo({
      manufacturer: 'CMHI',
      model: 'MJM-01',
      parameters: {
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID': 'WiFi-CMHI',
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.Enable': '1',
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.WPAKeyPassphrase': 'pass1234',
        'InternetGatewayDevice.WANDevice.1.X_CMHI_GponInterfaceConfig.RxPower': '-22.3',
      },
    });
    assert.equal(info.ssid, 'WiFi-CMHI');
    assert.equal(info.ssidPassword, 'pass1234');
    assert.equal(info.rxPower, `-22.30\u00A0dBm`);
  });

  it('fetch paths use subtrees only', async () => {
    const { getDeviceInfoFetchPaths } = await import('../app/helpers/deviceInfo.js');
    const paths = getDeviceInfoFetchPaths();
    assert.ok(paths.length <= 20);
    assert.ok(paths.every((p) => p.endsWith('.')));
    assert.ok(paths.some((p) => p.includes('X_CMCC_EponInterfaceConfig')));
  });

  it('reads ZICG F650 style PPP on WANConnectionDevice.2 and GPON optical', () => {
    const info = extractDeviceInfo({
      manufacturer: 'ZICG',
      model: 'F650',
      parameters: {
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID': 'ABADI',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Username': 'user@ppp',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Enable': '1',
        'InternetGatewayDevice.WANDevice.1.X_GponInterfaceConfig.RXPower': '-19.5',
        'InternetGatewayDevice.WANDevice.1.X_GponInterfaceConfig.TransceiverTemperature': '42',
      },
    });

    assert.equal(info.pppoeUsername, 'user@ppp');
    assert.equal(info.ssid, 'ABADI');
    assert.ok(info.rxPower.includes('dBm'));
    assert.equal(info.temperature, '42.0\u00A0°C');
  });
});

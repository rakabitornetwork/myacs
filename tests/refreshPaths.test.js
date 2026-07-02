import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveDeviceRefreshFetchPaths } from '../app/helpers/refreshPaths.js';

test('CMHI device excludes CMCC and TR-181 paths', () => {
  const paths = resolveDeviceRefreshFetchPaths({
    parameters: {
      'InternetGatewayDevice.WANDevice.1.X_CMHI_GponInterfaceConfig.RXPower': '-18',
      'InternetGatewayDevice.LANDevice.1.Hosts.Host.1.MACAddress': 'aa:bb',
      'InternetGatewayDevice.DeviceInfo.SerialNumber': 'SN1',
    },
  });

  assert.ok(paths.some((p) => p.includes('X_CMHI')));
  assert.ok(!paths.some((p) => /X_CMCC/i.test(p)));
  assert.ok(!paths.some((p) => p.startsWith('Device.')));
});

test('CMCC device excludes CMHI paths', () => {
  const paths = resolveDeviceRefreshFetchPaths({
    parameters: {
      'InternetGatewayDevice.WANDevice.1.X_CMCC_EponInterfaceConfig.RXPower': '-20',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID': 'wifi',
    },
  });

  assert.ok(paths.some((p) => /X_CMCC/i.test(p)));
  assert.ok(!paths.some((p) => /X_CMHI/i.test(p)));
});

test('empty device uses minimal IGD bootstrap paths', () => {
  const paths = resolveDeviceRefreshFetchPaths({ parameters: {} });
  assert.ok(paths.includes('InternetGatewayDevice.DeviceInfo.'));
  assert.ok(!paths.some((p) => /X_CMCC|X_CMHI/i.test(p)));
});

test('TR-181 device model uses Device paths only', () => {
  const paths = resolveDeviceRefreshFetchPaths({
    parameters: {
      'Device.DeviceInfo.SerialNumber': 'SN2',
      'Device.Hosts.Host.1.Hostname': 'phone',
    },
  });

  assert.ok(paths.some((p) => p.startsWith('Device.')));
  assert.ok(!paths.some((p) => p.startsWith('InternetGatewayDevice.')));
});

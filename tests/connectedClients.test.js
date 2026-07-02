import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractConnectedClients,
  getConnectedClientsFetchPaths,
} from '../app/helpers/connectedClients.js';

describe('extractConnectedClients', () => {
  it('parses LAN host table entries', () => {
    const result = extractConnectedClients({
      parameters: {
        'InternetGatewayDevice.LANDevice.1.Hosts.HostNumberOfEntries': '2',
        'InternetGatewayDevice.LANDevice.1.Hosts.Host.1.Active': '1',
        'InternetGatewayDevice.LANDevice.1.Hosts.Host.1.HostName': 'android-tv',
        'InternetGatewayDevice.LANDevice.1.Hosts.Host.1.IPAddress': '192.168.1.10',
        'InternetGatewayDevice.LANDevice.1.Hosts.Host.1.MACAddress': 'AA:BB:CC:DD:EE:01',
        'InternetGatewayDevice.LANDevice.1.Hosts.Host.1.InterfaceType': '802.11',
        'InternetGatewayDevice.LANDevice.1.Hosts.Host.2.Active': '1',
        'InternetGatewayDevice.LANDevice.1.Hosts.Host.2.HostName': 'laptop',
        'InternetGatewayDevice.LANDevice.1.Hosts.Host.2.IPAddress': '192.168.1.20',
        'InternetGatewayDevice.LANDevice.1.Hosts.Host.2.MACAddress': 'AA-BB-CC-DD-EE-02',
        'InternetGatewayDevice.LANDevice.1.Hosts.Host.2.InterfaceType': 'Ethernet',
      },
    });

    assert.equal(result.count, 2);
    assert.equal(result.clients.length, 2);
    assert.equal(result.clients[0].hostName, 'android-tv');
    assert.equal(result.clients[0].macAddress, 'AA:BB:CC:DD:EE:01');
    assert.equal(result.clients[1].interfaceType, 'LAN');
  });

  it('parses WLAN associated devices and dedupes by MAC', () => {
    const result = extractConnectedClients({
      parameters: {
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID': 'DEMO XPON',
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Enable': 'true',
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.AssociatedDevice.1.AssociatedDeviceMACAddress': '11:22:33:44:55:66',
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.AssociatedDevice.1.AssociatedDeviceIPAddress': '192.168.1.50',
        'InternetGatewayDevice.LANDevice.1.Hosts.Host.1.MACAddress': '11:22:33:44:55:66',
        'InternetGatewayDevice.LANDevice.1.Hosts.Host.1.HostName': 'phone',
        'InternetGatewayDevice.LANDevice.1.Hosts.Host.1.IPAddress': '192.168.1.50',
      },
    });

    assert.equal(result.clients.length, 1);
    assert.equal(result.clients[0].hostName, 'phone');
    assert.equal(result.clients[0].interfaceType, 'WiFi');
    assert.equal(result.count, 1);
  });

  it('formats interface type and lease text', async () => {
    const { formatInterfaceType, formatLeaseTimeRemaining } = await import('../app/helpers/connectedClients.js');
    assert.equal(formatInterfaceType('802.11'), 'WiFi');
    assert.equal(formatInterfaceType('WIFI'), 'WiFi');
    assert.equal(
      formatLeaseTimeRemaining('Remaining lease term23Hour48Minute33Second'),
      'Sisa lease: 23 jam 48 menit 33 detik',
    );
  });

  it('ignores N/A host names but keeps IP/MAC', () => {
    const result = extractConnectedClients({
      parameters: {
        'InternetGatewayDevice.LANDevice.1.Hosts.Host.1.HostName': 'N/A',
        'InternetGatewayDevice.LANDevice.1.Hosts.Host.1.IPAddress': '192.168.1.2',
        'InternetGatewayDevice.LANDevice.1.Hosts.Host.1.MACAddress': '86:35:ED:6D:07:DC',
        'InternetGatewayDevice.LANDevice.1.Hosts.Host.1.InterfaceType': '802.11',
      },
    });

    assert.equal(result.clients.length, 1);
    assert.equal(result.clients[0].hostName, '—');
    assert.equal(result.clients[0].ipAddress, '192.168.1.2');
    assert.equal(result.clients[0].macAddress, '86:35:ED:6D:07:DC');
    assert.equal(result.clients[0].interfaceType, 'WiFi');
  });

  it('falls back to TotalAssociations when list is empty', () => {
    const result = extractConnectedClients({
      parameters: {
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Enable': 'true',
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.TotalAssociations': '3',
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.Enable': 'false',
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.TotalAssociations': '9',
      },
    });

    assert.equal(result.count, 3);
    assert.equal(result.clients.length, 0);
    assert.equal(result.countSource, 'wlanTotal');
    assert.equal(result.wifiAssociationTotal, 3);
  });

  it('exposes fetch subtrees for TR-069 refresh', () => {
    const paths = getConnectedClientsFetchPaths();
    assert.ok(paths.some((p) => p.includes('Hosts')));
    assert.ok(paths.every((p) => p.endsWith('.')));
  });
});

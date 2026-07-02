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
    assert.equal(formatInterfaceType('WLAN'), 'WiFi');
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

  it('parses sparse Host indexes with WLAN interface (CU/CMHI)', () => {
    const result = extractConnectedClients({
      parameters: {
        'InternetGatewayDevice.LANDevice.1.Hosts.Host.3.HostName': 'vivo-Y17',
        'InternetGatewayDevice.LANDevice.1.Hosts.Host.3.IPAddress': '192.168.1.6',
        'InternetGatewayDevice.LANDevice.1.Hosts.Host.3.MACAddress': 'b8:d4:3e:d4:f5:9d',
        'InternetGatewayDevice.LANDevice.1.Hosts.Host.3.InterfaceType': 'WLAN',
        'InternetGatewayDevice.LANDevice.1.Hosts.Host.3.AddressSource': 'DHCP',
        'InternetGatewayDevice.LANDevice.1.Hosts.Host.4.HostName': 'OPPO-A3x',
        'InternetGatewayDevice.LANDevice.1.Hosts.Host.4.IPAddress': '192.168.1.2',
        'InternetGatewayDevice.LANDevice.1.Hosts.Host.4.MACAddress': '46:94:62:ed:ad:9f',
        'InternetGatewayDevice.LANDevice.1.Hosts.Host.4.InterfaceType': 'WLAN',
        'InternetGatewayDevice.LANDevice.1.Hosts.Host.4.X_CU_Hosttype': 'Phone',
      },
    });

    assert.equal(result.count, 2);
    assert.equal(result.clients.length, 2);
    const vivo = result.clients.find((c) => c.hostName === 'vivo-Y17');
    const oppo = result.clients.find((c) => c.hostName === 'OPPO-A3x');
    assert.equal(vivo?.ipAddress, '192.168.1.6');
    assert.equal(vivo?.macAddress, 'B8:D4:3E:D4:F5:9D');
    assert.equal(vivo?.interfaceType, 'WiFi');
    assert.equal(vivo?.addressSource, 'DHCP');
    assert.equal(oppo?.interfaceType, 'Phone');
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

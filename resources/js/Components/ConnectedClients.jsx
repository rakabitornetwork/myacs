import Badge from '@/Components/Badge';

function cell(value) {
  return value && String(value).trim() && value !== '—' ? value : '—';
}

function activeLabel(client) {
  if (client.active === true) return 'Aktif';
  if (client.active === false) return 'Nonaktif';
  return '—';
}

function LanConfigSummary({ lanConfig }) {
  if (!lanConfig) return null;

  const rows = [
    ['DHCP Server', lanConfig.dhcpServerEnable],
    ['DHCP Lease', lanConfig.dhcpLeaseTimeFormatted || lanConfig.dhcpLeaseTime],
    ['Gateway', lanConfig.ipRouters],
    ['DNS', lanConfig.dnsServers],
    ['Domain', lanConfig.domainName],
    ['Rentang IP', lanConfig.minAddress && lanConfig.maxAddress
      ? `${lanConfig.minAddress} – ${lanConfig.maxAddress}`
      : ''],
    ['Subnet Mask', lanConfig.subnetMask],
    ['Passthrough Lease', lanConfig.passthroughLeaseFormatted || lanConfig.passthroughLease],
  ].filter(([, value]) => value && String(value).trim());

  if (!rows.length) return null;

  return (
    <dl className="mb-3 grid grid-cols-1 gap-2 rounded-lg border border-zinc-100 bg-zinc-50/80 px-3.5 py-3 sm:grid-cols-2 md:mb-2 md:gap-x-4 md:px-3 md:py-2">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="ui-label">{label}</dt>
          <dd className="mt-0.5 ui-mono text-[14px] text-zinc-800 md:text-[13px]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function ConnectedClients({ data }) {
  const clients = data?.clients || [];
  const count = data?.count ?? clients.length;
  const hasDetails = data?.hasDetails ?? clients.length > 0;
  const lanConfig = data?.lanConfig;

  return (
    <div>
      <LanConfigSummary lanConfig={lanConfig} />

      <div className="mb-3 flex flex-wrap items-center gap-2 md:mb-2">
        <Badge status={count > 0 ? 'Online' : 'Offline'} dot>
          {count} terhubung
        </Badge>
        {!hasDetails && count > 0 && (
          <span className="ui-caption">
            ONU melaporkan {count} koneksi — detail belum tersedia. Klik <strong>Refresh</strong> atau <strong>Import GenieACS</strong>.
          </span>
        )}
        {!hasDetails && count === 0 && (
          <span className="ui-caption">
            Belum ada perangkat terdeteksi. Klik <strong>Refresh</strong> / <strong>Import GenieACS</strong> setelah ada klien WiFi/LAN.
          </span>
        )}
      </div>

      {hasDetails ? (
        <>
          <div className="md:hidden">
            {clients.map((client, index) => (
              <div key={`${client.macAddress}-${index}`} className="ui-connected-card">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-zinc-900">{cell(client.hostName)}</p>
                  {client.active !== undefined && client.active !== null && (
                    <Badge status={client.isActive ? 'Online' : 'Offline'} dot>
                      {activeLabel(client)}
                    </Badge>
                  )}
                </div>
                <dl className="mt-2 grid grid-cols-1 gap-2 text-[14px] md:text-[13px]">
                  <div>
                    <dt className="ui-label">IP Address</dt>
                    <dd className="ui-mono mt-0.5 break-all">{cell(client.ipAddress)}</dd>
                  </div>
                  <div>
                    <dt className="ui-label">MAC Address</dt>
                    <dd className="ui-mono mt-0.5 break-all">{cell(client.macAddress)}</dd>
                  </div>
                  <div>
                    <dt className="ui-label">Device Type</dt>
                    <dd className="mt-0.5">{cell(client.interfaceType)}</dd>
                  </div>
                  {client.addressSource && client.addressSource !== '—' && (
                    <div>
                      <dt className="ui-label">Address Source</dt>
                      <dd className="mt-0.5">{cell(client.addressSource)}</dd>
                    </div>
                  )}
                  {client.leaseTimeRemaining && (
                    <div>
                      <dt className="ui-label">Lease</dt>
                      <dd className="mt-0.5 whitespace-nowrap">{client.leaseTimeRemaining}</dd>
                    </div>
                  )}
                </dl>
              </div>
            ))}
          </div>

          <div className="ui-table-wrap hidden md:block">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Device Name</th>
                  <th>IP Address</th>
                  <th>MAC Address</th>
                  <th>Device Type</th>
                  <th>Active</th>
                  <th>Source</th>
                  <th>Lease</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client, index) => (
                  <tr key={`${client.macAddress}-${index}`}>
                    <td>{cell(client.hostName)}</td>
                    <td className="ui-mono whitespace-nowrap">{cell(client.ipAddress)}</td>
                    <td className="ui-mono whitespace-nowrap">{cell(client.macAddress)}</td>
                    <td>{cell(client.interfaceType)}</td>
                    <td>{activeLabel(client)}</td>
                    <td>{cell(client.addressSource)}</td>
                    <td className="text-zinc-600 whitespace-nowrap">{cell(client.leaseTimeRemaining) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

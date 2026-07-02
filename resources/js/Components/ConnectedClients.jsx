import Badge from '@/Components/Badge';

function cell(value) {
  return value && String(value).trim() && value !== '—' ? value : '—';
}

export default function ConnectedClients({ data }) {
  const clients = data?.clients || [];
  const count = data?.count ?? clients.length;
  const hasDetails = data?.hasDetails ?? clients.length > 0;

  return (
    <div>
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
                <p className="font-medium text-zinc-900">{cell(client.hostName)}</p>
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
                  {client.leaseTimeRemaining && (
                    <div>
                      <dt className="ui-label">Status</dt>
                      <dd className="mt-0.5">{client.leaseTimeRemaining}</dd>
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
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client, index) => (
                  <tr key={`${client.macAddress}-${index}`}>
                    <td>{cell(client.hostName)}</td>
                    <td className="ui-mono whitespace-nowrap">{cell(client.ipAddress)}</td>
                    <td className="ui-mono whitespace-nowrap">{cell(client.macAddress)}</td>
                    <td>{cell(client.interfaceType)}</td>
                    <td className="text-zinc-600">{cell(client.leaseTimeRemaining) || '—'}</td>
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

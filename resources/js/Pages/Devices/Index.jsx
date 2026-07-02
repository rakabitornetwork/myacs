import { Head, Link, router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/Components/AppLayout';
import Badge from '@/Components/Badge';
import { Panel, PanelHeader } from '@/Components/Panel';
import Flash from '@/Components/Flash';
import DeviceInfoCells from '@/Components/DeviceInfo';

function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DevicesIndex({ devices, pagination, filters, acs, flash }) {
  const [search, setSearch] = useState(filters.search || '');

  const handleSearch = (e) => {
    e.preventDefault();
    router.get('/devices', { search, page: 1 }, { preserveState: true });
  };

  return (
    <AppLayout
      title="Devices"
      actions={
        <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-zinc-500">
          {pagination.total} total
        </span>
      }
    >
      <Head title="Devices" />
      <Flash flash={flash} />

      <Panel className="mb-2">
        <form onSubmit={handleSearch} className="flex items-center gap-1.5 p-2">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Device ID, serial, manufacturer..."
              className="ui-input pl-7"
            />
          </div>
          <button type="submit" className="ui-btn-primary shrink-0">
            Cari
          </button>
        </form>
      </Panel>

      <Panel>
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Device ID</th>
                <th>Serial</th>
                <th>Manufacturer / Model</th>
                <th>Merk</th>
                <th>Model</th>
                <th>PPPoE</th>
                <th>Pass PPPoE</th>
                <th>SSID</th>
                <th>Pass WiFi</th>
                <th>RX</th>
                <th>Suhu</th>
                <th>IP TR069</th>
                <th>Firmware</th>
                <th>IP</th>
                <th>Status</th>
                <th>Last Inform</th>
              </tr>
            </thead>
            <tbody>
              {devices.length === 0 ? (
                <tr>
                  <td colSpan={16} className="ui-empty">
                    Tidak ada device ditemukan
                  </td>
                </tr>
              ) : (
                devices.map((device) => (
                  <tr key={device.id}>
                    <td>
                      <Link href={`/devices/${device.id}`} className="ui-link ui-mono">
                        {device.deviceId}
                      </Link>
                    </td>
                    <td className="ui-mono text-zinc-500">{device.serialNumber || '—'}</td>
                    <td>
                      <span className="text-zinc-800">{device.manufacturer || '—'}</span>
                      {(device.info?.modelName || device.model) && (
                        <span className="text-zinc-400"> / {device.info?.modelName || device.model}</span>
                      )}
                    </td>
                    <DeviceInfoCells info={device.info} />
                    <td className="ui-mono text-zinc-500">{device.softwareVersion || '—'}</td>
                    <td className="ui-mono">{device.ipAddress || '—'}</td>
                    <td>
                      <Badge status={device.isOnline ? 'Online' : 'Offline'} dot>
                        {device.isOnline ? 'Online' : 'Offline'}
                      </Badge>
                    </td>
                    <td className="tabular-nums text-zinc-500">{formatDate(device.lastInform)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {pagination.lastPage > 1 && (
        <div className="mt-2 flex items-center justify-between px-1 text-[13px] text-zinc-500">
          <span className="tabular-nums">
            {pagination.page}/{pagination.lastPage} · {pagination.total} devices
          </span>
          <div className="flex gap-1">
            {pagination.page > 1 && (
              <Link
                href={`/devices?page=${pagination.page - 1}&search=${filters.search || ''}`}
                className="ui-btn-secondary"
              >
                Prev
              </Link>
            )}
            {pagination.page < pagination.lastPage && (
              <Link
                href={`/devices?page=${pagination.page + 1}&search=${filters.search || ''}`}
                className="ui-btn-secondary"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}

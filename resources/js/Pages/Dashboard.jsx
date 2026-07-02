import { Head, Link } from '@inertiajs/react';
import { Router, Wifi, ListTodo, AlertTriangle, Settings2, FileBox } from 'lucide-react';
import AppLayout from '@/Components/AppLayout';
import StatCard from '@/Components/StatCard';
import Badge from '@/Components/Badge';
import Flash from '@/Components/Flash';
import { Panel, PanelHeader } from '@/Components/Panel';
import DashboardCharts from '@/Components/DashboardCharts';

function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Dashboard({ stats, charts, recentDevices, acs, system, flash }) {
  const onlineRate =
    stats.devices > 0 ? Math.round((stats.online / stats.devices) * 100) : 0;

  return (
    <AppLayout title="Dashboard">
      <Head title="Dashboard" />

      <Flash flash={flash} />

      {system && (
        <Panel className="mb-2 p-3">
          <PanelHeader title="System Status" subtitle="Admin — kesehatan layanan & deploy" />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="ui-mini-card">
              <p className="ui-label">Health</p>
              <p className="mt-0.5 text-sm font-semibold capitalize text-zinc-900">{system.health}</p>
            </div>
            <div className="ui-mini-card">
              <p className="ui-label">MongoDB</p>
              <p className="mt-0.5 text-sm font-semibold text-zinc-900">
                {system.mongodb ? 'Connected' : 'Disconnected'}
              </p>
            </div>
            <div className="ui-mini-card">
              <p className="ui-label">Panel URL</p>
              <p className="ui-mono mt-0.5 text-[13px] text-zinc-800">
                :{system.port} → {system.appUrl}
              </p>
            </div>
            <div className="ui-mini-card">
              <p className="ui-label">CWMP (CPE)</p>
              <p className="ui-mono mt-0.5 break-all text-[11px] text-zinc-700">
                {system.cwmpUrl || '—'}
              </p>
            </div>
          </div>
          {(system.deployNotes?.length > 0 || system.warnings?.length > 0) && (
            <ul className="mt-2 space-y-1 text-[13px] text-amber-800">
              {[...(system.deployNotes || []), ...(system.warnings || [])].map((note) => (
                <li key={note} className="rounded border border-amber-100 bg-amber-50 px-2 py-1">
                  ⚠ {note}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[11px] text-zinc-400">
            Health API:{' '}
            <a href="/health" target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
              /health
            </a>
            {' · '}
            Deploy manual: <code className="ui-mono">.\scripts\package-release.ps1</code>
          </p>
        </Panel>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 md:gap-2">
        <StatCard label="Total Devices" value={stats.devices} icon={Router} />
        <StatCard
          label="Online"
          value={stats.online}
          icon={Wifi}
          color="green"
          sub={`${onlineRate}%`}
        />
        <StatCard label="Pending" value={stats.pendingTasks} icon={ListTodo} color="amber" />
        <StatCard label="Faults" value={stats.faults} icon={AlertTriangle} color="red" />
        <StatCard label="Presets" value={stats.presets} icon={Settings2} />
        <StatCard label="Files" value={stats.files} icon={FileBox} />
      </div>

      <DashboardCharts charts={charts} />

      <Panel className="mt-2">
        <PanelHeader
          title="Recent Devices"
          action={
            <Link href="/devices" className="text-[13px] font-medium text-brand-600 hover:underline">
              View all →
            </Link>
          }
        />
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Device ID</th>
                <th>Manufacturer</th>
                <th>Model</th>
                <th>Status</th>
                <th>Last Inform</th>
              </tr>
            </thead>
            <tbody>
              {recentDevices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="ui-empty">
                    Belum ada device. CPE → Inform ke {acs?.cwmpUrl || '/cwmp'}.
                  </td>
                </tr>
              ) : (
                recentDevices.map((device) => (
                  <tr key={device.id}>
                    <td>
                      <Link href={`/devices/${device.id}`} className="ui-link ui-mono">
                        {device.deviceId}
                      </Link>
                    </td>
                    <td>{device.manufacturer || '—'}</td>
                    <td className="text-zinc-500">{device.model || '—'}</td>
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
    </AppLayout>
  );
}

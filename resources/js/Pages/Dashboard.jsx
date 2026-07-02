import { Head, Link, router } from '@inertiajs/react';
import { Router, Wifi, ListTodo, AlertTriangle, Settings2, FileBox, RefreshCw } from 'lucide-react';
import AppLayout from '@/Components/AppLayout';
import StatCard from '@/Components/StatCard';
import Badge from '@/Components/Badge';
import AcsBadge from '@/Components/AcsBadge';
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

function DualAcsBanner({ acs }) {
  if (acs?.mode !== 'dual') return null;

  return (
    <div className="mb-2 rounded-lg border border-violet-300 px-3 py-2 text-xs text-violet-950 shadow-sm"
      style={{ background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 45%, #e0e7ff 100%)' }}
    >
      <strong className="text-violet-800">Mode Dual ACS</strong> — CPE terpisah:
      <div className="mt-1.5 grid gap-1 sm:grid-cols-2">
        <div className="rounded border border-violet-200 px-2 py-1"
          style={{ background: 'linear-gradient(145deg, #faf5ff 0%, #f3e8ff 100%)' }}
        >
          <span className="font-medium text-violet-700">CPE lama → GenieACS</span>
          <p className="ui-mono mt-0.5 text-[11px] text-zinc-500">
            {acs.genieacsCwmpUrl || 'http://VPS:7547'}
          </p>
        </div>
        <div className="rounded border border-sky-200 px-2 py-1"
          style={{ background: 'linear-gradient(145deg, #f0f9ff 0%, #e0f2fe 100%)' }}
        >
          <span className="font-medium text-sky-700">CPE baru → MyACS</span>
          <p className="ui-mono mt-0.5 break-all text-[11px] text-zinc-500">
            {acs.cwmpUrl || '—'}
          </p>
          <p className="mt-0.5 text-[9px] text-zinc-400">Isi URL ini di ONU (TR-069 ACS)</p>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({ stats, charts, recentDevices, acs, system, flash }) {
  const onlineRate =
    stats.devices > 0 ? Math.round((stats.online / stats.devices) * 100) : 0;

  return (
    <AppLayout title="Dashboard">
      <Head title="Dashboard" />

      <DualAcsBanner acs={acs} />
      {acs?.mode === 'genieacs-panel' && (
        <div className="mb-2 rounded-lg border border-sky-300 px-3 py-2 text-xs text-sky-950 shadow-sm"
          style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #dbeafe 50%, #e0e7ff 100%)' }}
        >
          Mode panel GenieACS — CWMP hanya di GenieACS. Device disinkronkan dari database{' '}
          <code className="ui-mono">genieacs</code>.
        </div>
      )}

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

      <div className="grid grid-cols-2 gap-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Total Devices" value={stats.devices} icon={Router} />
        {acs?.mode === 'dual' ? (
          <>
            <StatCard label="MyACS" value={stats.myacsDevices} icon={Router} color="brand" />
            <StatCard label="GenieACS" value={stats.genieacsDevices} icon={Router} color="amber" />
          </>
        ) : (
          <StatCard
            label="Online"
            value={stats.online}
            icon={Wifi}
            color="green"
            sub={`${onlineRate}%`}
          />
        )}
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
            <div className="flex items-center gap-2">
              {acs?.syncEnabled && (
                <button
                  type="button"
                  onClick={() => router.post('/sync/genieacs')}
                  className="ui-btn-secondary"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Sync GenieACS
                </button>
              )}
              <Link href="/devices" className="text-[13px] font-medium text-brand-600 hover:underline">
                View all →
              </Link>
            </div>
          }
        />
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>ACS</th>
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
                  <td colSpan={6} className="ui-empty">
                    Belum ada device. CPE MyACS → Inform ke {acs?.cwmpUrl || '/cwmp'}.
                  </td>
                </tr>
              ) : (
                recentDevices.map((device) => (
                  <tr key={device.id}>
                    <td>
                      <AcsBadge source={device.source} />
                    </td>
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

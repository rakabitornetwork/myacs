import { Head, Link, router, usePage } from '@inertiajs/react';
import { AlertTriangle, CheckCheck } from 'lucide-react';
import AppLayout from '@/Components/AppLayout';
import Badge from '@/Components/Badge';
import Flash from '@/Components/Flash';
import { Panel, PanelHeader } from '@/Components/Panel';

function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function FaultsIndex({ faults, pagination, unresolvedCount, showResolved, flash }) {
  const { auth } = usePage().props;
  const canWrite = auth?.canWrite !== false;
  const canManage = auth?.canManage === true;
  return (
    <AppLayout
      title="Faults"
      actions={
        <div className="flex items-center gap-1.5">
          {unresolvedCount > 0 && (
            <span className="rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-rose-700 ring-1 ring-rose-500/20">
              {unresolvedCount} aktif
            </span>
          )}
          {canManage && unresolvedCount > 0 && (
            <button
              type="button"
              onClick={() => router.post('/faults/resolve-all')}
              className="ui-btn-secondary"
            >
              <CheckCheck className="h-3 w-3" />
              Resolve all
            </button>
          )}
          <Link
            href={showResolved ? '/faults' : '/faults?resolved=1'}
            className="ui-btn-secondary"
          >
            {showResolved ? 'Hanya aktif' : 'Tampilkan semua'}
          </Link>
        </div>
      }
    >
      <Head title="Faults" />
      <Flash flash={flash} />

      <Panel>
        <PanelHeader
          title="CWMP & System Faults"
          subtitle="Error dari sesi TR-069 dan operasi sistem"
        />
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Device</th>
                <th>Code</th>
                <th>Pesan</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {faults.length === 0 ? (
                <tr>
                  <td colSpan={6} className="ui-empty">
                    <AlertTriangle className="mx-auto mb-1 h-4 w-4 text-zinc-300" />
                    Tidak ada fault
                  </td>
                </tr>
              ) : (
                faults.map((fault) => (
                  <tr key={fault.id}>
                    <td className="tabular-nums text-zinc-500">{formatDate(fault.createdAt)}</td>
                    <td className="ui-mono text-zinc-600">{fault.deviceId || '—'}</td>
                    <td className="ui-mono text-zinc-500">{fault.code || '—'}</td>
                    <td className="max-w-md truncate text-zinc-800" title={fault.message}>
                      {fault.message}
                    </td>
                    <td>
                      <Badge status={fault.resolved ? 'completed' : 'fault'}>
                        {fault.resolved ? 'resolved' : 'active'}
                      </Badge>
                    </td>
                    <td className="text-right">
                      {!fault.resolved && canWrite && (
                        <button
                          type="button"
                          onClick={() => router.post(`/faults/${fault.id}/resolve`)}
                          className="ui-btn-secondary text-[10px]"
                        >
                          Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.lastPage > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-100 px-3 py-2">
            <p className="text-[10px] text-zinc-500">
              Halaman {pagination.page} / {pagination.lastPage}
            </p>
            <div className="flex gap-1">
              {pagination.page > 1 && (
                <Link
                  href={`/faults?page=${pagination.page - 1}${showResolved ? '&resolved=1' : ''}`}
                  className="ui-btn-secondary text-[10px]"
                >
                  Prev
                </Link>
              )}
              {pagination.page < pagination.lastPage && (
                <Link
                  href={`/faults?page=${pagination.page + 1}${showResolved ? '&resolved=1' : ''}`}
                  className="ui-btn-secondary text-[10px]"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </Panel>
    </AppLayout>
  );
}

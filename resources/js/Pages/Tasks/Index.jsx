import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Components/AppLayout';
import Badge from '@/Components/Badge';
import { Panel, PanelHeader } from '@/Components/Panel';

function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TasksIndex({ tasks }) {
  const { auth } = usePage().props;
  const canCancel = Boolean(auth?.user) && auth?.canWrite !== false;
  const counts = tasks.reduce(
    (acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    },
    {},
  );

  return (
    <AppLayout
      title="Tasks"
      actions={
        <div className="flex gap-1">
          {['pending', 'running', 'completed', 'fault'].map((s) =>
            counts[s] ? (
              <span
                key={s}
                className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium capitalize tabular-nums text-zinc-500"
              >
                {s}: {counts[s]}
              </span>
            ) : null,
          )}
        </div>
      }
    >
      <Head title="Tasks" />

      <Panel>
        <PanelHeader title="Task Queue" />
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Device</th>
                <th>Method</th>
                <th>Status</th>
                <th>Created</th>
                <th>Completed</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="ui-empty">
                    Belum ada task dalam antrian
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id}>
                    <td className="font-medium text-zinc-900">{task.name}</td>
                    <td className="ui-mono text-zinc-500">{task.deviceId}</td>
                    <td className="ui-mono text-zinc-600">{task.method}</td>
                    <td>
                      <Badge status={task.status}>{task.status}</Badge>
                    </td>
                    <td className="tabular-nums text-zinc-500">{formatDate(task.createdAt)}</td>
                    <td className="tabular-nums text-zinc-500">{formatDate(task.completedAt)}</td>
                    <td className="text-right">
                      {canCancel && task.status === 'pending' ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Batalkan task ini?')) {
                              router.post(`/tasks/${task.id}/cancel`);
                            }
                          }}
                          className="ui-btn-secondary text-[10px] text-red-600 hover:text-red-700"
                        >
                          Batalkan
                        </button>
                      ) : (
                        <span className="text-[10px] text-zinc-300">—</span>
                      )}
                    </td>
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

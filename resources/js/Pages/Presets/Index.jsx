import { Head, Link, router } from '@inertiajs/react';
import { Plus, Pencil, Trash2, Power } from 'lucide-react';
import AppLayout from '@/Components/AppLayout';
import Badge from '@/Components/Badge';
import { Panel } from '@/Components/Panel';

export default function PresetsIndex({ presets }) {
  return (
    <AppLayout
      title="Presets"
      actions={
        <Link href="/presets/create" className="ui-btn-primary">
          <Plus className="h-3 w-3" />
          New Preset
        </Link>
      }
    >
      <Head title="Presets" />

      {presets.length === 0 ? (
        <Panel className="ui-empty border-dashed">
          Belum ada preset.{' '}
          <Link href="/presets/create" className="ui-link">
            Buat preset pertama
          </Link>
        </Panel>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {presets.map((preset) => (
            <Panel key={preset.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="truncate text-xs font-semibold text-zinc-900">{preset.name}</h3>
                <Badge variant={preset.isEnabled ? 'active' : 'disabled'}>
                  {preset.isEnabled ? 'On' : 'Off'}
                </Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-zinc-500">
                {preset.description || 'No description'}
              </p>
              <div className="mt-2 flex items-center gap-3 border-t border-zinc-100 pt-2 text-[10px] text-zinc-400">
                <span className="tabular-nums">W:{preset.weight}</span>
                <span className="tabular-nums">{preset.configurationsCount} cfg</span>
                {preset.tags?.length > 0 && <span className="truncate">{preset.tags.join(', ')}</span>}
              </div>
              <div className="mt-2 flex gap-1">
                <Link href={`/presets/${preset.id}/edit`} className="ui-btn-secondary flex-1">
                  <Pencil className="h-3 w-3" />
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => router.post(`/presets/${preset.id}/toggle`)}
                  className="ui-btn-secondary"
                  title="Toggle"
                >
                  <Power className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Hapus preset "${preset.name}"?`)) {
                      router.delete(`/presets/${preset.id}`);
                    }
                  }}
                  className="ui-btn-secondary text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

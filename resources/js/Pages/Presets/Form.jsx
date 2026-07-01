import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import AppLayout from '@/Components/AppLayout';
import { Panel } from '@/Components/Panel';

const emptyConfig = { type: 'value', path: '', value: '' };

export default function PresetsForm({ preset, errors = {} }) {
  const isEdit = Boolean(preset?.id);

  const { data, setData, post, put, processing, transform } = useForm({
    name: preset?.name || '',
    description: preset?.description || '',
    weight: preset?.weight ?? 0,
    precondition: preset?.precondition || '',
    tags: (preset?.tags || []).join(', '),
    isEnabled: preset?.isEnabled !== false,
    configurations: preset?.configurations?.length
      ? preset.configurations
      : [{ ...emptyConfig }],
  });

  const submit = (e) => {
    e.preventDefault();
    transform((form) => ({
      ...form,
      configurations: JSON.stringify(form.configurations),
      isEnabled: form.isEnabled ? '1' : '0',
    }));

    if (isEdit) {
      put(`/presets/${preset.id}`);
    } else {
      post('/presets');
    }
  };

  const updateConfig = (index, field, value) => {
    const next = [...data.configurations];
    next[index] = { ...next[index], [field]: value };
    setData('configurations', next);
  };

  const addConfig = () => setData('configurations', [...data.configurations, { ...emptyConfig }]);

  const removeConfig = (index) => {
    setData(
      'configurations',
      data.configurations.filter((_, i) => i !== index),
    );
  };

  return (
    <AppLayout
      title={isEdit ? 'Edit Preset' : 'New Preset'}
      actions={
        <Link href="/presets" className="ui-btn-secondary">
          <ArrowLeft className="h-3 w-3" />
          Back
        </Link>
      }
    >
      <Head title={isEdit ? 'Edit Preset' : 'New Preset'} />

      <Panel className="mx-auto max-w-3xl p-4">
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[11px] font-medium text-zinc-600">Nama *</label>
              <input
                className="ui-input"
                value={data.name}
                onChange={(e) => setData('name', e.target.value)}
              />
              {errors.name && <p className="mt-1 text-[11px] text-red-600">{errors.name}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[11px] font-medium text-zinc-600">Deskripsi</label>
              <textarea
                className="ui-input min-h-[60px] resize-y"
                value={data.description}
                onChange={(e) => setData('description', e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-zinc-600">Weight</label>
              <input
                type="number"
                className="ui-input"
                value={data.weight}
                onChange={(e) => setData('weight', parseInt(e.target.value, 10) || 0)}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-zinc-600">Tags (comma)</label>
              <input
                className="ui-input"
                placeholder="default, ont"
                value={data.tags}
                onChange={(e) => setData('tags', e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[11px] font-medium text-zinc-600">
                Precondition (JS expression, optional)
              </label>
              <input
                className="ui-input ui-mono"
                placeholder="device.productClass === 'IGD'"
                value={data.precondition}
                onChange={(e) => setData('precondition', e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                id="isEnabled"
                type="checkbox"
                checked={data.isEnabled}
                onChange={(e) => setData('isEnabled', e.target.checked)}
                className="rounded border-zinc-300"
              />
              <label htmlFor="isEnabled" className="text-xs text-zinc-700">
                Preset aktif
              </label>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Konfigurasi Parameter
              </label>
              <button type="button" onClick={addConfig} className="ui-btn-secondary">
                <Plus className="h-3 w-3" />
                Add
              </button>
            </div>
            {errors.configurations && (
              <p className="mb-2 text-[11px] text-red-600">{errors.configurations}</p>
            )}
            <div className="space-y-2">
              {data.configurations.map((cfg, i) => (
                <div key={i} className="grid gap-2 rounded-md border border-zinc-100 bg-zinc-50/50 p-2 sm:grid-cols-12">
                  <select
                    className="ui-input sm:col-span-2"
                    value={cfg.type}
                    onChange={(e) => updateConfig(i, 'type', e.target.value)}
                  >
                    <option value="value">value</option>
                  </select>
                  <input
                    className="ui-input ui-mono sm:col-span-5"
                    placeholder="Device. path"
                    value={cfg.path}
                    onChange={(e) => updateConfig(i, 'path', e.target.value)}
                  />
                  <input
                    className="ui-input sm:col-span-4"
                    placeholder="Value"
                    value={cfg.value}
                    onChange={(e) => updateConfig(i, 'value', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeConfig(i)}
                    className="ui-btn-secondary sm:col-span-1"
                    disabled={data.configurations.length === 1}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3">
            <Link href="/presets" className="ui-btn-secondary">
              Batal
            </Link>
            <button type="submit" disabled={processing} className="ui-btn-primary">
              {processing ? 'Menyimpan...' : isEdit ? 'Update' : 'Simpan'}
            </button>
          </div>
        </form>
      </Panel>
    </AppLayout>
  );
}

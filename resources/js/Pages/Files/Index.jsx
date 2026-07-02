import { Head, router } from '@inertiajs/react';
import { Upload, FileBox, Trash2 } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/Components/AppLayout';
import Flash from '@/Components/Flash';
import { Panel, PanelHeader } from '@/Components/Panel';

function formatSize(bytes) {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(1)} ${units[i]}`;
}

export default function FilesIndex({ files, uploadMaxMb, flash }) {
  const [showUpload, setShowUpload] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('firmware');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    formData.append('type', type);

    setUploading(true);
    router.post('/files', formData, {
      forceFormData: true,
      onFinish: () => {
        setUploading(false);
        setShowUpload(false);
        setFile(null);
        setName('');
      },
    });
  };

  return (
    <AppLayout
      title="Files"
      actions={
        <button type="button" onClick={() => setShowUpload(!showUpload)} className="ui-btn-primary">
          <Upload className="h-3.5 w-3.5" />
          Upload
        </button>
      }
    >
      <Head title="Files" />
      <Flash flash={flash} />

      {showUpload && (
        <Panel className="mb-2 p-3">
          <form onSubmit={handleUpload} className="grid gap-2 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-[13px] font-medium text-zinc-600">Nama</label>
              <input
                className="ui-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Firmware v1.2"
              />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-zinc-600">Tipe</label>
              <select className="ui-input" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="firmware">Firmware</option>
                <option value="config">Config</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-zinc-600">
                File (max {uploadMaxMb}MB)
              </label>
              <input
                type="file"
                className="ui-input py-1"
                accept=".bin,.img,.trx,.zip,.fw"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="flex items-end gap-1">
              <button type="submit" disabled={!file || uploading} className="ui-btn-primary flex-1">
                {uploading ? 'Uploading...' : 'Simpan'}
              </button>
              <button type="button" onClick={() => setShowUpload(false)} className="ui-btn-secondary">
                Batal
              </button>
            </div>
          </form>
        </Panel>
      )}

      <Panel>
        <PanelHeader title="Firmware & Config Files" />
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Size</th>
                <th>URL</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {files.length === 0 ? (
                <tr>
                  <td colSpan={5} className="ui-empty">
                    <FileBox className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
                    Belum ada file diunggah
                  </td>
                </tr>
              ) : (
                files.map((f) => (
                  <tr key={f.id}>
                    <td className="font-medium text-zinc-900">{f.name}</td>
                    <td>
                      <span className="rounded bg-zinc-100 px-1 py-0.5 text-[11px] font-medium uppercase text-zinc-600">
                        {f.type}
                      </span>
                    </td>
                    <td className="tabular-nums text-zinc-500">{formatSize(f.size)}</td>
                    <td className="ui-mono max-w-xs truncate text-brand-600">{f.url || '—'}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Hapus file "${f.name}"?`)) {
                            router.delete(`/files/${f.id}`);
                          }
                        }}
                        className="ui-btn-secondary text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
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

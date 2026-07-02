import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, RotateCcw, Zap, Download, Settings2, Search, AlertTriangle, ListTree, Upload } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/Components/AppLayout';
import Badge from '@/Components/Badge';
import AcsBadge from '@/Components/AcsBadge';
import Flash from '@/Components/Flash';
import { Panel, PanelHeader } from '@/Components/Panel';
import { DeviceInfoGrid } from '@/Components/DeviceInfo';

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

function formatParamValue(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default function DevicesShow({ device, tasks, firmwareFiles = [], flash, acs, crCredentials }) {
  const { auth } = usePage().props;
  const [selectedFirmware, setSelectedFirmware] = useState(firmwareFiles[0]?.id || '');
  const [getNames, setGetNames] = useState('InternetGatewayDevice.DeviceInfo.');
  const [paramNamesPath, setParamNamesPath] = useState('InternetGatewayDevice.');
  const [paramNamesNextLevel, setParamNamesNextLevel] = useState(false);
  const [uploadFileType, setUploadFileType] = useState('1 Vendor Configuration File');
  const [setPath, setSetPath] = useState('');
  const [setValue, setSetValue] = useState('');
  const paramEntries = Object.entries(device.parameters || {});
  const canManage = device.canManage !== false;
  const canWrite = auth?.canWrite !== false;
  const canAct = canManage && canWrite;
  const isGenieacs = device.source === 'genieacs';

  const pushFirmware = () => {
    if (!selectedFirmware || !canAct) return;
    router.post(`/devices/${device.id}/firmware`, { fileId: selectedFirmware });
  };

  const submitGetParams = (e) => {
    e.preventDefault();
    if (!canAct) return;
    router.post(`/devices/${device.id}/tasks/get-parameters`, { names: getNames });
  };

  const submitGetParamNames = (e) => {
    e.preventDefault();
    if (!canAct) return;
    router.post(`/devices/${device.id}/tasks/get-parameter-names`, {
      path: paramNamesPath,
      nextLevel: paramNamesNextLevel ? '1' : '0',
    });
  };

  const submitUpload = (e) => {
    e.preventDefault();
    if (!canAct) return;
    router.post(`/devices/${device.id}/tasks/upload`, { fileType: uploadFileType });
  };

  const submitSetParams = (e) => {
    e.preventDefault();
    if (!canAct || !setPath.trim()) return;
    router.post(`/devices/${device.id}/tasks/set-parameters`, {
      path: setPath.trim(),
      value: setValue,
    });
  };

  return (
    <AppLayout
      title={device.deviceId}
      actions={
        <>
          <Link href="/devices" className="ui-btn-secondary">
            <ArrowLeft className="h-3 w-3" />
            Back
          </Link>
          {canAct ? (
            <>
              <button
                type="button"
                onClick={() => router.post(`/devices/${device.id}/connection-request`)}
                className="ui-btn-secondary"
                disabled={!isGenieacs && !device.connectionRequestUrl}
              >
                <Zap className="h-3 w-3" />
                Conn. Request
              </button>
              <button
                type="button"
                onClick={() => router.post(`/devices/${device.id}/refresh-info`)}
                className="ui-btn-secondary"
              >
                <Search className="h-3 w-3" />
                Refresh Info
              </button>
              {acs?.genieacsMongoConfigured && device.managedByMyacs ? (
                <button
                  type="button"
                  onClick={() => router.post(`/devices/${device.id}/import-genieacs`)}
                  className="ui-btn-secondary"
                >
                  <Download className="h-3 w-3" />
                  Import GenieACS
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => router.post(`/devices/${device.id}/reboot`)}
                className="ui-btn-danger"
              >
                <RotateCcw className="h-3 w-3" />
                Reboot
              </button>
            </>
          ) : null}
        </>
      }
    >
      <Head title={device.deviceId} />
      <Flash flash={flash} />

      {!isGenieacs && device.connectionRequestUrl && crCredentials && !crCredentials.ready && (
        <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <strong>Connection Request</strong> memerlukan username/password CPE yang belum tersimpan.
          Klik <strong>Conn. Request</strong> untuk mengantrikan Get Parameter otomatis, atau set{' '}
          <code className="rounded bg-amber-100 px-1">CWMP_CR_USERNAME</code> /{' '}
          <code className="rounded bg-amber-100 px-1">CWMP_CR_PASSWORD</code> di <code>.env</code>{' '}
          VPS (harus sama dengan kredensial di modem).
        </div>
      )}

      {!canWrite && (
        <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Akun <strong>viewer</strong> — hanya bisa melihat, tidak bisa menjalankan task.
        </div>
      )}

      {isGenieacs && (
        <div className="mb-2 rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-800">
          Device ini dikelola oleh <strong>GenieACS</strong>
          {acs?.genieacsCwmpUrl ? ` (${acs.genieacsCwmpUrl})` : ''}.
          {canManage
            ? ' Aksi dikirim via GenieACS NBI.'
            : ' Konfigurasi GENIEACS_NBI_URL untuk mengontrol dari panel ini.'}
        </div>
      )}

      <div className="grid gap-2 lg:grid-cols-3">
        <div className="space-y-2 lg:col-span-2">
          <Panel className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="ui-mono text-sm font-semibold text-zinc-900">{device.deviceId}</p>
                  <AcsBadge source={device.source} />
                </div>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  {device.manufacturer} {device.model}
                </p>
              </div>
              <Badge status={device.isOnline ? 'Online' : 'Offline'} dot>
                {device.isOnline ? 'Online' : 'Offline'}
              </Badge>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
              {[
                ['Serial', device.serialNumber],
                ['OUI', device.oui],
                ['Product Class', device.productClass],
                ['Software', device.softwareVersion],
                ['Hardware', device.hardwareVersion],
                ['IP Address', device.ipAddress],
                ['Last Inform', formatDate(device.lastInform)],
                ['Events', (device.events || []).join(', ') || '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    {label}
                  </dt>
                  <dd className="mt-0.5 break-all text-[11px] text-zinc-800">{value || '—'}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-3 border-t border-zinc-100 pt-3">
              <PanelHeader title="Info ONU" subtitle="PPPoE, WiFi, optical — dari parameter TR-069" />
              <DeviceInfoGrid info={device.info} showSecrets={canWrite} />
              {(!device.info?.ssid || !device.info?.rxPowerRaw) && (
                <p className="mt-2 text-[11px] text-zinc-500">
                  WiFi/optical belum lengkap? Klik <strong>Refresh Info</strong>, tunggu ~30 detik, lalu muat ulang halaman.
                </p>
              )}
            </div>

            {device.connectionRequestUrl && (
              <div className="mt-2 rounded-md bg-zinc-50 px-2 py-1.5 ring-1 ring-zinc-100">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Connection Request URL
                </p>
                <p className="ui-mono mt-0.5 break-all text-[10px] text-zinc-600">
                  {device.connectionRequestUrl}
                </p>
              </div>
            )}

            {canAct && firmwareFiles.length > 0 && (
              <div className="mt-2 flex items-end gap-1.5 rounded-md border border-zinc-100 bg-zinc-50/50 p-2">
                <div className="min-w-0 flex-1">
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    Push Firmware
                  </label>
                  <select
                    className="ui-input"
                    value={selectedFirmware}
                    onChange={(e) => setSelectedFirmware(e.target.value)}
                  >
                    {firmwareFiles.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="button" onClick={pushFirmware} className="ui-btn-primary shrink-0">
                  <Download className="h-3 w-3" />
                  Queue
                </button>
              </div>
            )}
          </Panel>

          {canAct && (
            <Panel className="p-3">
              <PanelHeader title="Manual Tasks" subtitle="Get / Set parameter, upload & factory reset" />
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <form onSubmit={submitGetParams} className="space-y-1.5 rounded-md border border-zinc-100 p-2">
                  <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    <Search className="h-3 w-3" />
                    Get Parameter Values
                  </div>
                  <textarea
                    className="ui-input min-h-[4rem] font-mono text-[11px]"
                    value={getNames}
                    onChange={(e) => setGetNames(e.target.value)}
                    placeholder="InternetGatewayDevice.DeviceInfo."
                  />
                  <button type="submit" className="ui-btn-secondary w-full">
                    Queue Get
                  </button>
                </form>

                <form onSubmit={submitGetParamNames} className="space-y-1.5 rounded-md border border-zinc-100 p-2">
                  <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    <ListTree className="h-3 w-3" />
                    Get Parameter Names
                  </div>
                  <input
                    className="ui-input font-mono text-[11px]"
                    value={paramNamesPath}
                    onChange={(e) => setParamNamesPath(e.target.value)}
                    placeholder="InternetGatewayDevice."
                  />
                  <label className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                    <input
                      type="checkbox"
                      checked={paramNamesNextLevel}
                      onChange={(e) => setParamNamesNextLevel(e.target.checked)}
                    />
                    Next level only
                  </label>
                  <button type="submit" className="ui-btn-secondary w-full">
                    Queue Get Names
                  </button>
                </form>

                <form onSubmit={submitSetParams} className="space-y-1.5 rounded-md border border-zinc-100 p-2">
                  <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    <Settings2 className="h-3 w-3" />
                    Set Parameter Value
                  </div>
                  <input
                    className="ui-input font-mono text-[11px]"
                    value={setPath}
                    onChange={(e) => setSetPath(e.target.value)}
                    placeholder="Device.ManagementServer.PeriodicInformInterval"
                  />
                  <input
                    className="ui-input font-mono text-[11px]"
                    value={setValue}
                    onChange={(e) => setSetValue(e.target.value)}
                    placeholder="Value"
                  />
                  <button type="submit" className="ui-btn-secondary w-full" disabled={!setPath.trim()}>
                    Queue Set
                  </button>
                </form>
              </div>

              <form
                onSubmit={submitUpload}
                className="mt-2 flex flex-wrap items-end gap-1.5 rounded-md border border-zinc-100 p-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    <Upload className="h-3 w-3" />
                    Upload dari CPE
                  </div>
                  <select
                    className="ui-input"
                    value={uploadFileType}
                    onChange={(e) => setUploadFileType(e.target.value)}
                  >
                    <option value="1 Vendor Configuration File">Vendor Configuration File</option>
                    <option value="2 Vendor Log File">Vendor Log File</option>
                  </select>
                </div>
                <button type="submit" className="ui-btn-secondary shrink-0">
                  Queue Upload
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Factory reset akan mengembalikan CPE ke pengaturan pabrik. Lanjutkan?')) {
                    router.post(`/devices/${device.id}/factory-reset`);
                  }
                }}
                className="ui-btn-danger mt-2 w-full sm:w-auto"
              >
                <AlertTriangle className="h-3 w-3" />
                Factory Reset
              </button>
            </Panel>
          )}

          <Panel>
            <PanelHeader title={`Parameters (${paramEntries.length})`} />
            <div className="max-h-[28rem] overflow-y-auto">
              {paramEntries.length === 0 ? (
                <p className="ui-empty">Belum ada parameter</p>
              ) : (
                <table className="ui-table">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th className="w-[45%]">Path</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paramEntries.map(([key, value]) => (
                      <tr key={key}>
                        <td className="ui-mono text-zinc-500">{key}</td>
                        <td className="break-all text-zinc-800">{formatParamValue(value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Panel>
        </div>

        <Panel>
          <PanelHeader title="Recent Tasks" />
          <div className="divide-y divide-zinc-50">
            {tasks.length === 0 ? (
              <p className="ui-empty">Belum ada task</p>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className="px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-medium text-zinc-800">{task.name}</p>
                    <div className="flex items-center gap-1.5">
                      {task.status === 'pending' && task.retries > 0 && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                          retry {task.retries}/{task.maxRetries}
                        </span>
                      )}
                      <Badge status={task.status}>{task.status}</Badge>
                    </div>
                  </div>
                  <p className="ui-mono mt-0.5 text-[10px] text-zinc-500">{task.method}</p>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="text-[10px] tabular-nums text-zinc-400">{formatDate(task.createdAt)}</p>
                    {canAct && task.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => router.post(`/tasks/${task.id}/retry`)}
                          className="shrink-0 text-[10px] font-medium text-blue-600 hover:text-blue-700"
                        >
                          Retry
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Batalkan task ini?')) {
                              router.post(`/tasks/${task.id}/cancel`);
                            }
                          }}
                          className="shrink-0 text-[10px] font-medium text-red-600 hover:text-red-700"
                        >
                          Batalkan
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>
    </AppLayout>
  );
}

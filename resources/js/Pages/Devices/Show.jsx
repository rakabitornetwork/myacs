import { Head, Link, router, usePage } from '@inertiajs/react';
import {
  ArrowLeft,
  RotateCcw,
  Zap,
  Download,
  Settings2,
  Search,
  AlertTriangle,
  ListTree,
  Upload,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/Components/AppLayout';
import Badge from '@/Components/Badge';
import AcsBadge from '@/Components/AcsBadge';
import Flash from '@/Components/Flash';
import { Panel, PanelHeader } from '@/Components/Panel';
import { DeviceInfoGrid } from '@/Components/DeviceInfo';
import ConnectedClients from '@/Components/ConnectedClients';

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

function DeviceActions({ device, canAct, canDelete, isGenieacs, acs, layout = 'desktop' }) {
  const mobile = layout === 'mobile';
  const btn = mobile ? 'ui-btn-secondary w-full justify-center' : 'ui-btn-secondary';
  const danger = mobile ? 'ui-btn-danger w-full justify-center' : 'ui-btn-danger';
  const icon = 'h-4 w-4 shrink-0 md:h-3.5 md:w-3.5';

  const handleDelete = () => {
    const msg = isGenieacs
      ? `Hapus "${device.deviceId}" dari MyACS?\n\nDevice masih ada di GenieACS bisa muncul lagi saat sync.`
      : `Hapus permanen "${device.deviceId}" dari MyACS?\n\nTask dan riwayat terkait juga dihapus.`;
    if (window.confirm(msg)) {
      router.delete(`/devices/${device.id}`);
    }
  };

  return (
    <>
      <Link href="/devices" className={mobile ? 'ui-btn-secondary col-span-2 w-full justify-center' : 'ui-btn-secondary'}>
        <ArrowLeft className={icon} />
        Back
      </Link>
      {canAct ? (
        <>
          <button
            type="button"
            onClick={() => router.post(`/devices/${device.id}/connection-request`)}
            className={btn}
            disabled={!isGenieacs && !device.connectionRequestUrl}
          >
            <Zap className={icon} />
            {mobile ? 'Conn.' : 'Conn. Request'}
          </button>
          <button
            type="button"
            onClick={() => router.post(`/devices/${device.id}/refresh-info`)}
            className={btn}
          >
            <Search className={icon} />
            Refresh
          </button>
          {acs?.genieacsMongoConfigured && device.managedByMyacs ? (
            <button
              type="button"
              onClick={() => router.post(`/devices/${device.id}/import-genieacs`)}
              className={btn}
            >
              <Download className={icon} />
              {mobile ? 'Import' : 'Import GenieACS'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => router.post(`/devices/${device.id}/reboot`)}
            className={danger}
          >
            <RotateCcw className={icon} />
            Reboot
          </button>
        </>
      ) : null}
      {canDelete ? (
        <button
          type="button"
          onClick={handleDelete}
          className={mobile ? 'ui-btn-danger col-span-2 w-full justify-center' : 'ui-btn-danger'}
        >
          <Trash2 className={icon} />
          {mobile ? 'Hapus' : 'Delete'}
        </button>
      ) : null}
    </>
  );
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

  const shortTitle = device.serialNumber || device.productClass || device.deviceId;

  return (
    <AppLayout
      title={shortTitle}
      actions={
        <div className="hidden md:contents">
          <DeviceActions
            device={device}
            canAct={canAct}
            canDelete={auth?.canManage}
            isGenieacs={isGenieacs}
            acs={acs}
            layout="desktop"
          />
        </div>
      }
    >
      <Head title={device.deviceId} />
      <Flash flash={flash} />

      <div className="ui-device-action-grid">
        <DeviceActions
          device={device}
          canAct={canAct}
          canDelete={auth?.canManage}
          isGenieacs={isGenieacs}
          acs={acs}
          layout="mobile"
        />
      </div>

      {!isGenieacs && device.connectionRequestUrl && crCredentials && !crCredentials.ready && (
        <div className="ui-alert-amber">
          <strong>Connection Request</strong> memerlukan username/password CPE yang belum tersimpan.
          Klik <strong>Conn.</strong> untuk mengantrikan Get Parameter otomatis, atau set{' '}
          <code className="rounded bg-amber-100 px-1">CWMP_CR_USERNAME</code> /{' '}
          <code className="rounded bg-amber-100 px-1">CWMP_CR_PASSWORD</code> di <code>.env</code> VPS.
        </div>
      )}

      {!canWrite && (
        <div className="ui-alert-amber">
          Akun <strong>viewer</strong> — hanya bisa melihat, tidak bisa menjalankan task.
        </div>
      )}

      {isGenieacs && (
        <div className="ui-alert-violet">
          Device ini dikelola oleh <strong>GenieACS</strong>
          {acs?.genieacsCwmpUrl ? ` (${acs.genieacsCwmpUrl})` : ''}.
          {canManage
            ? ' Aksi dikirim via GenieACS NBI.'
            : ' Konfigurasi GENIEACS_NBI_URL untuk mengontrol dari panel ini.'}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-3 lg:gap-2">
        <div className="space-y-3 lg:col-span-2 lg:space-y-2">
          <Panel className="p-3.5 md:p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="ui-mono break-all text-sm font-semibold text-zinc-900 md:break-normal">
                    {device.deviceId}
                  </p>
                  <AcsBadge source={device.source} />
                </div>
                <p className="mt-1 ui-meta">
                  {[device.manufacturer, device.model].filter(Boolean).join(' ') || '—'}
                </p>
              </div>
              <Badge status={device.isOnline ? 'Online' : 'Offline'} dot>
                {device.isOnline ? 'Online' : 'Offline'}
              </Badge>
            </div>

            <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-4 lg:gap-y-2">
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
                  <dt className="ui-label">{label}</dt>
                  <dd className="mt-0.5 break-all ui-text">{value || '—'}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-4 border-t border-zinc-100 pt-4 md:mt-3 md:pt-3">
              <PanelHeader title="Info ONU" subtitle="PPPoE, WiFi, optical — dari parameter TR-069" />
              <DeviceInfoGrid info={device.info} showSecrets={canWrite} />
              {(!device.info?.ssid || !device.info?.rxPowerRaw) && (
                <p className="mt-2 ui-meta">
                  WiFi/optical belum lengkap? Klik <strong>Refresh</strong>, tunggu ~30 detik, lalu muat ulang halaman.
                </p>
              )}
            </div>

            <div className="mt-4 border-t border-zinc-100 pt-4 md:mt-3 md:pt-3">
              <PanelHeader
                title="Perangkat Terhubung"
                subtitle="Hosts.Host, LAN DHCP — dari TR-069 GenieACS/MyACS"
              />
              <ConnectedClients data={device.connectedClients} />
            </div>

            {device.connectionRequestUrl && (
              <div className="mt-3 ui-mini-card md:mt-2">
                <p className="ui-label">Connection Request URL</p>
                <p className="ui-mono mt-1 break-all text-[13px] text-zinc-600 md:mt-0.5 md:text-[11px]">
                  {device.connectionRequestUrl}
                </p>
              </div>
            )}

            {canAct && firmwareFiles.length > 0 && (
              <div className="mt-3 flex flex-col gap-2 ui-inset-card sm:mt-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label className="ui-label mb-1 block">Push Firmware</label>
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
                <button type="button" onClick={pushFirmware} className="ui-btn-primary w-full sm:w-auto sm:shrink-0">
                  <Download className="h-4 w-4 md:h-3.5 md:w-3.5" />
                  Queue
                </button>
              </div>
            )}
          </Panel>

          {canAct && (
            <Panel className="p-3.5 md:p-3">
              <PanelHeader title="Manual Tasks" subtitle="Get / Set parameter, upload & factory reset" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-2">
                <form onSubmit={submitGetParams} className="space-y-2 ui-inset-card md:space-y-1.5">
                  <div className="flex items-center gap-1.5 ui-label">
                    <Search className="h-4 w-4 md:h-3.5 md:w-3.5" />
                    Get Parameter Values
                  </div>
                  <textarea
                    className="ui-input min-h-[5rem] font-mono md:min-h-[4rem]"
                    value={getNames}
                    onChange={(e) => setGetNames(e.target.value)}
                    placeholder="InternetGatewayDevice.DeviceInfo."
                  />
                  <button type="submit" className="ui-btn-secondary w-full">
                    Queue Get
                  </button>
                </form>

                <form onSubmit={submitGetParamNames} className="space-y-2 ui-inset-card md:space-y-1.5">
                  <div className="flex items-center gap-1.5 ui-label">
                    <ListTree className="h-4 w-4 md:h-3.5 md:w-3.5" />
                    Get Parameter Names
                  </div>
                  <input
                    className="ui-input font-mono"
                    value={paramNamesPath}
                    onChange={(e) => setParamNamesPath(e.target.value)}
                    placeholder="InternetGatewayDevice."
                  />
                  <label className="flex items-center gap-2 ui-meta">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={paramNamesNextLevel}
                      onChange={(e) => setParamNamesNextLevel(e.target.checked)}
                    />
                    Next level only
                  </label>
                  <button type="submit" className="ui-btn-secondary w-full">
                    Queue Get Names
                  </button>
                </form>

                <form onSubmit={submitSetParams} className="space-y-2 ui-inset-card sm:col-span-2 lg:col-span-1 md:space-y-1.5">
                  <div className="flex items-center gap-1.5 ui-label">
                    <Settings2 className="h-4 w-4 md:h-3.5 md:w-3.5" />
                    Set Parameter Value
                  </div>
                  <input
                    className="ui-input font-mono"
                    value={setPath}
                    onChange={(e) => setSetPath(e.target.value)}
                    placeholder="Device.ManagementServer.PeriodicInformInterval"
                  />
                  <input
                    className="ui-input font-mono"
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
                className="mt-3 flex flex-col gap-2 ui-inset-card sm:mt-2 sm:flex-row sm:flex-wrap sm:items-end"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-1.5 ui-label">
                    <Upload className="h-4 w-4 md:h-3.5 md:w-3.5" />
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
                <button type="submit" className="ui-btn-secondary w-full sm:w-auto sm:shrink-0">
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
                className="ui-btn-danger mt-3 w-full sm:mt-2 sm:w-auto"
              >
                <AlertTriangle className="h-4 w-4 md:h-3.5 md:w-3.5" />
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
                <>
                  <div className="md:hidden">
                    {paramEntries.map(([key, value]) => (
                      <div key={key} className="ui-param-card">
                        <p className="ui-mono break-all text-[12px] text-zinc-500">{key}</p>
                        <p className="mt-1.5 break-all ui-text">{formatParamValue(value)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="ui-table-wrap hidden md:block">
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
                  </div>
                </>
              )}
            </div>
          </Panel>
        </div>

        <Panel className="h-fit">
          <PanelHeader title="Recent Tasks" />
          <div className="divide-y divide-zinc-100">
            {tasks.length === 0 ? (
              <p className="ui-empty">Belum ada task</p>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className="ui-task-item">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="min-w-0 text-sm font-medium text-zinc-800 md:text-xs">{task.name}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {task.status === 'pending' && task.retries > 0 && (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                          retry {task.retries}/{task.maxRetries}
                        </span>
                      )}
                      <Badge status={task.status}>{task.status}</Badge>
                    </div>
                  </div>
                  <p className="ui-mono mt-1 text-[13px] text-zinc-500 md:mt-0.5 md:text-[11px]">{task.method}</p>
                  <div className="mt-2 flex flex-col gap-2 sm:mt-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="ui-meta tabular-nums">{formatDate(task.createdAt)}</p>
                    {canAct && task.status === 'pending' && (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => router.post(`/tasks/${task.id}/retry`)}
                          className="min-h-[44px] text-sm font-medium text-blue-600 hover:text-blue-700 md:min-h-0 md:text-[11px]"
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
                          className="min-h-[44px] text-sm font-medium text-red-600 hover:text-red-700 md:min-h-0 md:text-[11px]"
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

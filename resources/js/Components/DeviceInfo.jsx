function cell(value) {
  return value && String(value).trim() ? value : '—';
}

function OpticalValue({ value, status }) {
  if (!value || !String(value).trim()) {
    return <span className="text-zinc-400">—</span>;
  }

  const cls = status?.textClass || 'text-zinc-800';
  return (
    <span className={`ui-optical-value tabular-nums ${cls}`} title={status?.label || undefined}>
      {value}
    </span>
  );
}

export default function DeviceInfoCells({ info, showSecrets = false }) {
  const i = info || {};
  return (
    <>
      <td>{cell(i.brand)}</td>
      <td>{cell(i.onuType)}</td>
      <td className="ui-mono">{cell(i.pppoeUsername)}</td>
      <td className="ui-mono">{showSecrets ? cell(i.pppoePassword) : cell(i.pppoePasswordMasked)}</td>
      <td className="ui-mono">{cell(i.ssid)}</td>
      <td className="ui-mono">{showSecrets ? cell(i.ssidPassword) : cell(i.ssidPasswordMasked)}</td>
      <td className="whitespace-nowrap">
        <OpticalValue value={i.rxPower} status={i.rxPowerStatus} />
      </td>
      <td className="whitespace-nowrap">
        <OpticalValue value={i.temperature} status={i.temperatureStatus} />
      </td>
    </>
  );
}

export function DeviceInfoGrid({ info, showSecrets = true }) {
  const i = info || {};
  const rows = [
    ['Merk ONU', i.brand, '', null],
    ['Type ONU', i.onuType, '', null],
    ['PPPoE Username', i.pppoeUsername, i.pppoeUsernameNote, null],
    [
      'PPPoE Password',
      showSecrets ? i.pppoePassword : i.pppoePasswordMasked,
      i.pppoePasswordNote,
      null,
    ],
    ['SSID', i.ssid, '', null],
    ['Password SSID', showSecrets ? i.ssidPassword : i.ssidPasswordMasked, i.ssidPasswordNote, null],
    ['RX Power', i.rxPower, i.rxPowerNote, i.rxPowerStatus],
    ['Temperature', i.temperature, '', i.temperatureStatus],
  ];

  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-2 md:gap-x-4 md:gap-y-2 lg:grid-cols-4">
      {rows.map(([label, value, note, status]) => (
        <div key={label}>
          <dt className="ui-label">{label}</dt>
          <dd className={`mt-0.5 ui-text ${label === 'RX Power' || label === 'Temperature' ? 'whitespace-nowrap' : 'break-all'}`}>
            {label === 'RX Power' || label === 'Temperature' ? (
              <OpticalValue value={value} status={status} />
            ) : (
              cell(value)
            )}
          </dd>
          {note && !value && (
            <p className="mt-0.5 ui-caption">{note}</p>
          )}
          {status?.label && value && (
            <p className={`mt-0.5 text-[11px] md:text-[10px] ${status.textClass}`}>
              {status.label}
            </p>
          )}
        </div>
      ))}
    </dl>
  );
}

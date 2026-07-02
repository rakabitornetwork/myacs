function cell(value) {
  return value && String(value).trim() ? value : '—';
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
      <td className="tabular-nums">{cell(i.rxPower)}</td>
      <td className="tabular-nums">{cell(i.temperature)}</td>
    </>
  );
}

export function DeviceInfoGrid({ info, showSecrets = true }) {
  const i = info || {};
  const rows = [
    ['Merk ONU', i.brand],
    ['Type ONU', i.onuType],
    ['PPPoE Username', i.pppoeUsername],
    ['PPPoE Password', showSecrets ? i.pppoePassword : i.pppoePasswordMasked],
    ['SSID', i.ssid],
    ['Password SSID', showSecrets ? i.ssidPassword : i.ssidPasswordMasked],
    ['RX Power', i.rxPower],
    ['Temperature', i.temperature],
  ];

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{label}</dt>
          <dd className="mt-0.5 break-all text-[11px] text-zinc-800">{cell(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

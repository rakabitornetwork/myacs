import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Panel, PanelHeader } from '@/Components/Panel';

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] shadow-sm">
      <p className="font-medium text-zinc-800">{item.name}</p>
      <p className="tabular-nums text-zinc-500">{item.count} device</p>
    </div>
  );
}

function BarChartPanel({ title, subtitle, data, emptyHint }) {
  const hasData = data?.some((d) => d.count > 0);

  return (
    <Panel className="flex min-h-[17rem] flex-col">
      <PanelHeader title={title} subtitle={subtitle} />
      <div className="flex-1 px-2 pb-3 pt-1">
        {!hasData ? (
          <p className="ui-empty py-10">{emptyHint}</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#71717a' }}
                interval={0}
                angle={-18}
                textAnchor="end"
                height={56}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#71717a' }} width={28} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Panel>
  );
}

function DonutChartPanel({ title, subtitle, data, emptyHint }) {
  const total = data?.reduce((sum, item) => sum + item.count, 0) || 0;

  return (
    <Panel className="flex min-h-[17rem] flex-col">
      <PanelHeader title={title} subtitle={subtitle} />
      <div className="flex flex-1 flex-col items-center justify-center px-3 pb-3 pt-1">
        {!total ? (
          <p className="ui-empty py-10">{emptyHint}</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={2}
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-1 flex w-full flex-wrap justify-center gap-x-3 gap-y-1">
              {data.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-[11px] text-zinc-600">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.name}</span>
                  <span className="tabular-nums text-zinc-400">({item.count})</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Panel>
  );
}

export default function DashboardCharts({ charts }) {
  if (!charts) return null;

  const { byBrand, rxPower, temperature, ponMode, totals } = charts;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
        <div>
          <h2 className="text-sm font-semibold text-zinc-800">Analitik Device</h2>
          <p className="ui-meta">
            {totals.devices} device · {totals.withRx} dengan RX · {totals.withTemp} dengan suhu
          </p>
        </div>
      </div>

      <div className="grid gap-2 lg:grid-cols-2">
        <BarChartPanel
          title="Merk ONU"
          subtitle="Distribusi manufacturer"
          data={byBrand}
          emptyHint="Belum ada data merk — tunggu Inform atau Import GenieACS"
        />
        <DonutChartPanel
          title="PON Mode"
          subtitle="EPON / GPON / Ethernet"
          data={ponMode}
          emptyHint="Belum ada data PON mode"
        />
        <BarChartPanel
          title="RX Power"
          subtitle="Kualitas sinyal optik (dBm)"
          data={rxPower}
          emptyHint="Belum ada data RX — klik Refresh Info / Import GenieACS"
        />
        <BarChartPanel
          title="Temperature"
          subtitle="Suhu transceiver ONU"
          data={temperature}
          emptyHint="Belum ada data suhu"
        />
      </div>
    </div>
  );
}

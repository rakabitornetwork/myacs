export default function StatCard({ label, value, icon: Icon, color = 'brand', sub }) {
  const tones = {
    brand: {
      card: 'ui-stat-brand',
      icon: 'text-brand-800 bg-white/55 ring-1 ring-brand-300/50',
    },
    green: {
      card: 'ui-stat-green',
      icon: 'text-emerald-800 bg-white/55 ring-1 ring-emerald-300/50',
    },
    amber: {
      card: 'ui-stat-amber',
      icon: 'text-amber-900 bg-white/55 ring-1 ring-amber-300/50',
    },
    red: {
      card: 'ui-stat-red',
      icon: 'text-red-800 bg-white/55 ring-1 ring-red-300/50',
    },
  };

  const tone = tones[color] || tones.brand;

  return (
    <div className={`ui-stat ${tone.card}`}>
      {Icon && (
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${tone.icon}`}>
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-zinc-700">{label}</p>
        <p className="text-xl font-semibold tabular-nums tracking-tight text-zinc-900">{value}</p>
        {sub && <p className="text-[11px] font-medium text-zinc-600">{sub}</p>}
      </div>
    </div>
  );
}

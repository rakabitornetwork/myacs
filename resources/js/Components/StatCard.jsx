export default function StatCard({ label, value, icon: Icon, color = 'brand', sub }) {
  const tones = {
    brand: {
      card: 'ui-stat-brand',
      icon: 'text-brand-950 bg-white/70 ring-2 ring-brand-600/40 shadow-sm',
      label: 'text-brand-950',
    },
    green: {
      card: 'ui-stat-green',
      icon: 'text-emerald-950 bg-white/70 ring-2 ring-emerald-600/40 shadow-sm',
      label: 'text-emerald-950',
    },
    amber: {
      card: 'ui-stat-amber',
      icon: 'text-amber-950 bg-white/70 ring-2 ring-amber-600/40 shadow-sm',
      label: 'text-amber-950',
    },
    red: {
      card: 'ui-stat-red',
      icon: 'text-red-950 bg-white/70 ring-2 ring-red-600/40 shadow-sm',
      label: 'text-red-950',
    },
  };

  const tone = tones[color] || tones.brand;

  return (
    <div className={`ui-stat ${tone.card}`}>
      {Icon && (
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md md:h-8 md:w-8 ${tone.icon}`}>
          <Icon className="h-5 w-5 md:h-4 md:w-4" strokeWidth={2.5} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className={`ui-stat-label ${tone.label}`}>{label}</p>
        <p className="ui-stat-value">{value}</p>
        {sub && <p className="text-sm font-semibold text-zinc-800 md:text-[11px]">{sub}</p>}
      </div>
    </div>
  );
}

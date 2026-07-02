export default function StatCard({ label, value, icon: Icon, color = 'brand', sub }) {
  const tones = {
    brand: {
      card: 'ui-stat-brand',
      icon: 'text-brand-600 bg-brand-500/10',
      label: 'text-zinc-500',
    },
    green: {
      card: 'ui-stat-green',
      icon: 'text-emerald-600 bg-emerald-500/10',
      label: 'text-zinc-500',
    },
    amber: {
      card: 'ui-stat-amber',
      icon: 'text-amber-600 bg-amber-500/10',
      label: 'text-zinc-500',
    },
    red: {
      card: 'ui-stat-red',
      icon: 'text-red-600 bg-red-500/10',
      label: 'text-zinc-500',
    },
  };

  const tone = tones[color] || tones.brand;

  return (
    <div className={`ui-stat ${tone.card}`}>
      {Icon && (
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md md:h-8 md:w-8 ${tone.icon}`}>
          <Icon className="h-5 w-5 md:h-4 md:w-4" strokeWidth={2.25} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className={`ui-stat-label ${tone.label}`}>{label}</p>
        <p className="ui-stat-value">{value}</p>
        {sub && <p className="text-sm text-zinc-400 md:text-[11px]">{sub}</p>}
      </div>
    </div>
  );
}

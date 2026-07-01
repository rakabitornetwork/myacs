export default function StatCard({ label, value, icon: Icon, color = 'brand', sub }) {
  const iconColors = {
    brand: 'text-brand-600 bg-brand-500/10',
    green: 'text-emerald-600 bg-emerald-500/10',
    amber: 'text-amber-600 bg-amber-500/10',
    red: 'text-red-600 bg-red-500/10',
  };

  return (
    <div className="ui-stat">
      {Icon && (
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${iconColors[color]}`}>
          <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-medium uppercase tracking-wider text-zinc-500">{label}</p>
        <p className="text-lg font-semibold tabular-nums tracking-tight text-zinc-900">{value}</p>
        {sub && <p className="text-[10px] text-zinc-400">{sub}</p>}
      </div>
    </div>
  );
}

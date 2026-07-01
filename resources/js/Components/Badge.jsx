const variants = {
  online: 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20',
  offline: 'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200',
  pending: 'bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20',
  running: 'bg-sky-500/10 text-sky-700 ring-1 ring-sky-500/20',
  completed: 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20',
  fault: 'bg-red-500/10 text-red-700 ring-1 ring-red-500/20',
  cancelled: 'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200',
  active: 'bg-brand-500/10 text-brand-700 ring-1 ring-brand-500/20',
  disabled: 'bg-zinc-100 text-zinc-400 ring-1 ring-zinc-200',
};

const statusMap = {
  Online: 'online',
  Offline: 'offline',
  pending: 'pending',
  running: 'running',
  completed: 'completed',
  fault: 'fault',
  cancelled: 'cancelled',
};

export default function Badge({ children, variant, status, dot = false }) {
  const key = variant || statusMap[status] || statusMap[children] || 'offline';
  const style = variants[key] || variants.offline;

  return (
    <span className={`ui-badge ${style}`}>
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            key === 'online' || key === 'completed' || key === 'active'
              ? 'bg-emerald-500'
              : key === 'pending' || key === 'running'
                ? 'bg-amber-500'
                : key === 'fault'
                  ? 'bg-red-500'
                  : 'bg-zinc-400'
          }`}
        />
      )}
      {children}
    </span>
  );
}

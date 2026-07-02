export default function Flash({ flash }) {
  if (!flash?.message) return null;

  const styles = {
    success: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-700 ring-amber-500/20',
    error: 'bg-red-500/10 text-red-700 ring-red-500/20',
  };

  return (
    <div
      className={`mb-3 rounded-md px-3 py-2 text-[13px] ring-1 ${styles[flash.type] || styles.success}`}
    >
      {flash.message}
    </div>
  );
}

export default function Flash({ flash }) {
  if (!flash?.message) return null;

  const styles = {
    success: 'border-emerald-300 text-emerald-900',
    warning: 'border-amber-300 text-amber-900',
    error: 'border-red-300 text-red-900',
  };

  const backgrounds = {
    success: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
    warning: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
    error: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
  };

  const type = flash.type || 'success';

  return (
    <div
      className={`mb-3 rounded-lg border px-3 py-2 text-[13px] shadow-sm ${styles[type] || styles.success}`}
      style={{ background: backgrounds[type] || backgrounds.success }}
    >
      {flash.message}
    </div>
  );
}

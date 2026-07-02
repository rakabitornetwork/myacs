export default function Flash({ flash }) {
  if (!flash?.message) return null;

  const styles = {
    success: 'ui-flash-success',
    warning: 'ui-flash-warning',
    error: 'ui-flash-error',
  };

  return (
    <div className={styles[flash.type] || styles.success}>
      {flash.message}
    </div>
  );
}

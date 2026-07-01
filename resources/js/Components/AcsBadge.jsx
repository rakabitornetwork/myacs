export default function AcsBadge({ source = 'myacs' }) {
  if (source === 'genieacs') {
    return (
      <span className="ui-badge bg-violet-500/10 text-violet-700 ring-violet-500/20">GenieACS</span>
    );
  }
  return (
    <span className="ui-badge bg-brand-500/10 text-brand-700 ring-brand-500/20">MyACS</span>
  );
}

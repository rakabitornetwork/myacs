export function Panel({ children, className = '' }) {
  return <div className={`ui-panel ${className}`}>{children}</div>;
}

export function PanelHeader({ title, subtitle, action, children }) {
  return (
    <div className="ui-panel-header">
      {title ? (
        <div>
          <h2 className="ui-panel-title">{title}</h2>
          {subtitle ? <p className="text-[10px] text-zinc-400">{subtitle}</p> : null}
        </div>
      ) : (
        children
      )}
      {action}
    </div>
  );
}

export function PanelBody({ children, className = '', noPad = false }) {
  return <div className={noPad ? className : `p-0 ${className}`}>{children}</div>;
}

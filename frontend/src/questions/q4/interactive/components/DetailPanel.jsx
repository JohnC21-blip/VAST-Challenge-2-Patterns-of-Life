export default function DetailPanel({detail, className = ""}) {
  const safeDetail = detail ?? {title: "Chart summary", rows: [{label: "Status", value: "Preparing"}]};

  return (
    <div className={`q4DetailPanel ${className}`.trim()} aria-live="polite">
      <div className="q4DetailTitle">{safeDetail.title}</div>
      <div className="q4DetailRows">
        {safeDetail.rows.map((row) => (
          <div className="q4DetailRow" key={row.label}>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

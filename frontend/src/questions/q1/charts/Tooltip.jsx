export default function Tooltip({title, rows = [], className = ""}) {
    const hasContent = Boolean(title || rows.length);
    const tooltipClassName = className.includes("Tooltip") ? `tooltip ${className}` : `tooltip hoverTooltip ${className}`.trim();

    return (
        <div className={tooltipClassName}>

            <div className={`tooltipContent ${hasContent ? "isVisible" : ""}`}>

                {title ? <div className="tooltipTitle">{title}</div> : null}
                {rows.map((row) => (

                    <div key={row.label} className="tooltipRow">

            <span className="tooltipKey">
                {row.color ? (
                    <svg viewBox="0 0 10 10" aria-hidden="true">
                        <rect width="10" height="10" fill={row.color}/>
                    </svg>
                ) : null}

                {row.label}
            </span>

                        <strong>{row.value}</strong>
                    </div>

                ))}

            </div>

        </div>
    );
}

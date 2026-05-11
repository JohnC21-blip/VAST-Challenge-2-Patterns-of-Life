export default function Dashboard({
  children,
  className = "",
  isExpanded = false,
  isHidden = false,
  onToggle,
  title,
}) {
  const classes = [
    "card",
    className,
    isExpanded ? "isExpanded" : "",
    isHidden ? "isHidden" : "",
  ].filter(Boolean).join(" ");

  return (
    <section className={classes}>
      {title ? (
        <h2 className="cardTitle">
          {onToggle ? (
            <button
              type="button"
              className="cardTitleButton"
              aria-pressed={isExpanded}
              onClick={onToggle}
            >
              {title}
            </button>
          ) : title}
        </h2>
      ) : null}
      <div className="cardBody">{children}</div>
    </section>
  );
}

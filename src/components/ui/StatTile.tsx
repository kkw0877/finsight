export interface StatTileProps {
  label: string;
  value: string;
  delta?: { value: string; direction: "up" | "down" };
  className?: string;
}

export function StatTile({ label, value, delta, className }: StatTileProps) {
  const classes = ["rounded-md border border-hairline bg-surface p-6", className]
    .filter(Boolean)
    .join(" ");
  const deltaClasses = delta?.direction === "up" ? "text-positive" : "text-negative";

  return (
    <div className={classes}>
      <p className="text-sm font-medium text-ink-subtle">{label}</p>
      <p className="mt-2 font-mono text-[15px] leading-[1.4] font-medium text-ink tabular-nums">
        {value}
      </p>
      {delta && (
        <p
          className={`mt-1 font-mono text-[15px] leading-[1.4] font-medium tabular-nums ${deltaClasses}`}
        >
          {delta.direction === "up" ? "+" : "–"}
          {delta.value}
        </p>
      )}
    </div>
  );
}

import type { HTMLAttributes } from "react";

export function Tag({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  const classes = [
    "inline-flex items-center rounded-pill border border-hairline bg-surface-raised px-3 py-1 text-xs font-medium text-ink-subtle",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <span className={classes} {...props} />;
}

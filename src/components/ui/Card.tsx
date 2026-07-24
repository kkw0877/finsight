import type { HTMLAttributes } from "react";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const classes = ["rounded-md border border-hairline bg-surface p-6", className]
    .filter(Boolean)
    .join(" ");
  return <div className={classes} {...props} />;
}

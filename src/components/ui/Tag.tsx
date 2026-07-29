import type { HTMLAttributes } from "react";

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "neutral" | "pro";
}

const variantClasses: Record<NonNullable<TagProps["variant"]>, string> = {
  neutral: "border border-hairline bg-surface-raised text-ink-subtle",
  pro: "border border-primary bg-primary-tint text-primary-active",
};

export function Tag({
  variant = "neutral",
  className,
  ...props
}: TagProps) {
  const classes = [
    "inline-flex items-center rounded-pill px-3 py-1 text-xs font-medium",
    variantClasses[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <span className={classes} {...props} />;
}

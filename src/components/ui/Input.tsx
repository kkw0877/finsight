import type { InputHTMLAttributes } from "react";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const classes = [
    "rounded-sm bg-surface border border-hairline px-4 py-3 text-ink placeholder:text-ink-disabled focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <input className={classes} {...props} />;
}

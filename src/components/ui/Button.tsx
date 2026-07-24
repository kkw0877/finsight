import type { ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "text";
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "rounded-pill bg-primary text-on-primary px-5 py-2.5 text-sm font-medium hover:bg-primary-hover active:bg-primary-active active:scale-[0.97] transition-[150ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus",
  text: "text-ink-subtle hover:text-ink transition-[150ms] text-sm font-medium",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  const classes = [variantClasses[variant], className]
    .filter(Boolean)
    .join(" ");
  return <button className={classes} {...props} />;
}

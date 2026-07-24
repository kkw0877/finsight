import { AlertCircle, CheckCircle2, Info } from "lucide-react";

export interface ToastProps {
  message: string;
  variant?: "default" | "positive" | "negative";
  className?: string;
}

const icons = {
  default: Info,
  positive: CheckCircle2,
  negative: AlertCircle,
};

const iconToneClasses: Record<NonNullable<ToastProps["variant"]>, string> = {
  default: "text-ink-subtle",
  positive: "text-positive",
  negative: "text-negative",
};

export function Toast({ message, variant = "default", className }: ToastProps) {
  const Icon = icons[variant];
  const classes = [
    "flex items-center gap-3 rounded-md border border-hairline bg-surface-raised p-4 shadow-toast",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div role="status" className={classes}>
      <Icon
        aria-hidden="true"
        strokeWidth={1.5}
        className={`h-5 w-5 shrink-0 ${iconToneClasses[variant]}`}
      />
      <span className="text-sm text-ink">{message}</span>
    </div>
  );
}

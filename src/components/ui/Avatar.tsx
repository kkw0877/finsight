interface AvatarProps {
  name: string;
  src?: string;
  className?: string;
}

export function Avatar({ name, src, className }: AvatarProps) {
  const classes = [
    "inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-pill bg-surface-raised text-sm font-medium text-ink-subtle",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className={`${classes} object-cover`} />;
  }

  return (
    <span className={classes} role="img" aria-label={name}>
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

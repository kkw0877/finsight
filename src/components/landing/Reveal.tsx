"use client";

import type { ReactNode } from "react";
import { useInView } from "@/hooks/useInView";

export interface RevealProps {
  children: ReactNode;
  className?: string;
}

export function Reveal({ children, className }: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const classes = [
    "transition-all duration-300 ease-out motion-reduce:transition-none motion-reduce:transform-none",
    inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={ref} className={classes}>
      {children}
    </div>
  );
}

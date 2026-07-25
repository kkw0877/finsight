"use client";

import { useInView } from "@/hooks/useInView";
import { useCountUp } from "@/hooks/useCountUp";

export interface CountUpValueProps {
  target: number;
  format?: (value: number) => string;
  durationMs?: number;
  className?: string;
}

function defaultFormat(value: number): string {
  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

export function CountUpValue({ target, format = defaultFormat, durationMs, className }: CountUpValueProps) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const value = useCountUp(target, { active: inView, durationMs });

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}

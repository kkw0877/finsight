"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export interface UseCountUpOptions {
  active: boolean;
  durationMs?: number;
}

export function useCountUp(target: number, options: UseCountUpOptions): number {
  const { active, durationMs = 800 } = options;
  const reducedMotion = usePrefersReducedMotion();
  // 서버/클라이언트 첫 렌더가 항상 일치하도록 0에서 시작하고(hydration 불일치 방지),
  // 실제로 뷰포트에 들어와 active가 true가 될 때만 목표값까지 올린다.
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    if (reducedMotion) {
      setValue(target);
      return;
    }

    let frame: number;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);
      setValue(Math.round(target * progress));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, reducedMotion, target, durationMs]);

  return value;
}

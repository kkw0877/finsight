"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export interface UseInViewOptions {
  threshold?: number;
}

export function useInView<T extends HTMLElement>(
  options: UseInViewOptions = {},
): { ref: RefObject<T | null>; inView: boolean } {
  const ref = useRef<T | null>(null);
  // 서버와 클라이언트의 첫 렌더(hydration 이전)가 항상 일치하도록 초기값은 false로 고정하고,
  // 환경 감지(IntersectionObserver 미지원 등)는 클라이언트 전용인 effect 안에서만 수행한다.
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: options.threshold ?? 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [options.threshold]);

  return { ref, inView };
}

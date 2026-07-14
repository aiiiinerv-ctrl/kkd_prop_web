"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Content is visible by default (no opacity-0 in the SSR-rendered class) so
 * SSR, no-JS and crawler renders always show it. Only once hydrated do we
 * check whether the element starts below the fold and, if so, arm the
 * hidden -> revealed transition and observe it into view. A safety timeout
 * force-reveals in case the IntersectionObserver never fires, so content
 * can never end up permanently invisible.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"visible" | "hidden" | "revealed">("visible");

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const rect = el.getBoundingClientRect();
    const belowFold = rect.top >= window.innerHeight;
    if (!belowFold) return;

    // Hide (synchronously, before paint) only elements that start below the
    // viewport, then animate them in as the user scrolls to them.
    setState("hidden");

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("revealed");
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);

    // Safety net: never leave content permanently hidden if the observer
    // fails to fire.
    const safety = window.setTimeout(() => {
      setState("revealed");
      observer.disconnect();
    }, 1800);

    return () => {
      observer.disconnect();
      window.clearTimeout(safety);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn(state !== "visible" && "reveal", state === "revealed" && "is-visible", className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

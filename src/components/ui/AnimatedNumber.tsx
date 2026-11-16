"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionValue, useSpring, useReducedMotion } from "framer-motion";

interface AnimatedNumberProps {
  /** Fully formatted display value, e.g. "₹5,00,000", "7.2 mo", "82%". */
  value: string;
  className?: string;
}

/**
 * Extracts the first numeric run from a formatted string (handling thousands
 * separators) so it can be tweened, while the surrounding prefix/suffix and
 * formatting (currency symbol, unit, %) stay static text.
 */
function parseNumeric(display: string): { prefix: string; number: number; suffix: string; decimals: number } | null {
  const match = display.match(/^([^\d]*)([\d,]+(?:\.\d+)?)(.*)$/);
  if (!match) return null;
  const [, prefix, numStr, suffix] = match;
  const clean = numStr.replace(/,/g, "");
  const decimals = clean.includes(".") ? clean.split(".")[1].length : 0;
  return { prefix, number: parseFloat(clean), suffix, decimals };
}

function formatWithCommas(n: number, decimals: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Tweens numeric KPI values on mount and whenever the value changes. */
export function AnimatedNumber({ value, className = "" }: AnimatedNumberProps) {
  const parsed = parseNumeric(value);
  const prefersReducedMotion = useReducedMotion();
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 90, damping: 20, mass: 0.6 });
  const [display, setDisplay] = useState(parsed ? formatWithCommas(0, parsed.decimals) : value);
  const initialized = useRef(false);

  useEffect(() => {
    if (!parsed) {
      setDisplay(value);
      return;
    }
    if (prefersReducedMotion) {
      setDisplay(formatWithCommas(parsed.number, parsed.decimals));
      return;
    }
    motionVal.set(initialized.current ? motionVal.get() : 0);
    motionVal.set(parsed.number);
    initialized.current = true;
    const unsub = spring.on("change", latest => {
      setDisplay(formatWithCommas(latest, parsed.decimals));
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!parsed) return <span className={className}>{value}</span>;

  return (
    <span className={className}>
      {parsed.prefix}
      {display}
      {parsed.suffix}
    </span>
  );
}

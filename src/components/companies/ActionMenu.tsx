"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";

export interface MenuAction {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
  /** Draws a divider above this item */
  separated?: boolean;
}

/**
 * A "more actions" button with a small menu. The menu is drawn on top of the page (not inside the card) so a card's
 * rounded, clipped edges never cut it off.
 */
export function ActionMenu({ label, actions }: { label: string; actions: MenuAction[] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const place = () => {
      const r = buttonRef.current!.getBoundingClientRect();
      const width = 208;
      const height = menuRef.current?.offsetHeight || 0;
      const below = r.bottom + 6 + height <= window.innerHeight - 8;
      setPos({
        top: below ? r.bottom + 6 : Math.max(8, r.top - 6 - height),
        left: Math.min(Math.max(8, r.right - width), window.innerWidth - width - 8),
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !buttonRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className={`p-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface-2 cursor-pointer ${open ? "bg-surface-2 text-text" : ""}`}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
            className="fixed z-[10000] w-52 rounded-lg border border-line bg-surface shadow-lg py-1"
          >
            {actions.map(a => (
              <React.Fragment key={a.label}>
                {a.separated && <div className="my-1 border-t border-line" />}
                <button
                  type="button"
                  role="menuitem"
                  disabled={a.disabled}
                  onClick={() => {
                    setOpen(false);
                    a.onSelect();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-left cursor-pointer disabled:opacity-40 disabled:cursor-default ${
                    a.danger ? "text-rust hover:bg-rust/10" : "text-text hover:bg-surface-2"
                  }`}
                >
                  {a.icon && <span className={`shrink-0 ${a.danger ? "" : "text-text-muted"}`}>{a.icon}</span>}
                  {a.label}
                </button>
              </React.Fragment>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}

"use client";

import { useEffect } from "react";

/**
 * Locks page scrolling whenever a full-screen overlay (modal, drawer, sheet,
 * command palette) is on screen, on every page. Overlays are detected from the
 * DOM, so individual modals do not each need their own scroll-lock code.
 */
const OVERLAY_SELECTOR = '[class*="fixed"][class*="inset-0"]';

function hasOpenOverlay(): boolean {
  const nodes = document.querySelectorAll<HTMLElement>(OVERLAY_SELECTOR);
  for (const el of Array.from(nodes)) {
    if (el.className.toString().includes("-z-")) continue;
    const style = window.getComputedStyle(el);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.pointerEvents === "none" ||
      Number(style.opacity) === 0
    ) {
      continue;
    }
    const rect = el.getBoundingClientRect();
    if (rect.width >= window.innerWidth * 0.9 && rect.height >= window.innerHeight * 0.9) {
      return true;
    }
  }
  return false;
}

export function ScrollLockObserver() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    let locked = false;
    let saved = { html: "", body: "", padding: "" };
    let frame = 0;

    const lock = () => {
      if (locked) return;
      locked = true;
      const scrollbarWidth = window.innerWidth - html.clientWidth;
      saved = {
        html: html.style.overflow,
        body: body.style.overflow,
        padding: body.style.paddingRight,
      };
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
      if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    };

    const unlock = () => {
      if (!locked) return;
      locked = false;
      html.style.overflow = saved.html;
      body.style.overflow = saved.body;
      body.style.paddingRight = saved.padding;
    };

    const check = () => {
      frame = 0;
      if (hasOpenOverlay()) lock();
      else unlock();
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };

    const observer = new MutationObserver(schedule);
    observer.observe(body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    window.addEventListener("resize", schedule);
    schedule();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
      unlock();
    };
  }, []);

  return null;
}

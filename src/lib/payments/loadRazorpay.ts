/**
 * Loads the official Razorpay Checkout SDK dynamically.
 * Guaranteed idempotent and returns true once window.Razorpay is available.
 * Injects a light translucent liquid-glass blur backdrop (no dark overlay).
 */

export function enableRazorpayBackdropBlur() {
  if (typeof document === "undefined") return;

  const styleId = "razorpay-backdrop-blur-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = `
      .razorpay-container {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 2147483647 !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        background-color: rgba(255, 255, 255, 0.12) !important;
        backdrop-filter: blur(14px) saturate(150%) !important;
        -webkit-backdrop-filter: blur(14px) saturate(150%) !important;
      }
      .razorpay-container .razorpay-checkout-frame,
      iframe.razorpay-checkout-frame,
      iframe[name^="razorpay"],
      iframe[src*="razorpay.com"] {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        border: none !important;
        transform: none !important;
        color-scheme: light !important;
        background: transparent !important;
      }
      .razorpay-backdrop {
        background-color: rgba(255, 255, 255, 0.12) !important;
        backdrop-filter: blur(14px) saturate(150%) !important;
        -webkit-backdrop-filter: blur(14px) saturate(150%) !important;
      }
      body.razorpay-modal-active main,
      body.razorpay-modal-active header,
      body.razorpay-modal-active #app-root,
      body.razorpay-modal-active > div:not(.razorpay-container):not(#portal-root) {
        filter: blur(10px) saturate(140%) !important;
        transition: filter 0.25s ease-out !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Blur the page only while Razorpay's window is actually on screen. Razorpay keeps its container in the page
  // after closing (just hidden), so whether it exists says nothing; whether it is shown does.
  //
  // Only two things are watched, so nothing here can trigger itself: the page's direct children (to notice the
  // container being added) and the container's own style (to notice it being shown or hidden). The page's own
  // class is never watched, because this code changes it.
  if (typeof window !== "undefined" && !(window as any).__rzpActiveObserverAttached) {
    (window as any).__rzpActiveObserverAttached = true;
    let watched: Element | null = null;
    const containerObserver = new MutationObserver(syncRazorpayBackdrop);
    const watchContainer = () => {
      const container = document.querySelector(".razorpay-container");
      if (container && container !== watched) {
        containerObserver.disconnect();
        containerObserver.observe(container, { attributes: true, attributeFilter: ["style", "class"] });
        watched = container;
      }
      syncRazorpayBackdrop();
    };
    new MutationObserver(watchContainer).observe(document.body, { childList: true });
    watchContainer();
  }
}

/** True while Razorpay's checkout window is shown. */
function razorpayVisible(): boolean {
  const container = document.querySelector(".razorpay-container") as HTMLElement | null;
  if (!container) return false;
  const style = window.getComputedStyle(container);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
  const box = container.getBoundingClientRect();
  return box.width > 0 && box.height > 0;
}

/** Adds or removes the page blur to match Razorpay's window, and only touches the page when that changes. */
function syncRazorpayBackdrop() {
  const shouldBlur = razorpayVisible();
  if (document.body.classList.contains("razorpay-modal-active") !== shouldBlur) {
    document.body.classList.toggle("razorpay-modal-active", shouldBlur);
  }
}

/**
 * Removes the page blur after checkout closes (paid, failed or dismissed). Razorpay hides its window with a short
 * animation, so it is checked again a moment later as well.
 */
export function clearRazorpayBackdrop() {
  if (typeof document === "undefined") return;
  document.body.classList.remove("razorpay-modal-active");
  window.setTimeout(syncRazorpayBackdrop, 400);
}

export function loadRazorpaySDK(): Promise<boolean> {
  enableRazorpayBackdropBlur();
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if ((window as any).Razorpay) {
      enableRazorpayBackdropBlur();
      resolve(true);
      return;
    }

    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => {
        enableRazorpayBackdropBlur();
        resolve(true);
      });
      existingScript.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      enableRazorpayBackdropBlur();
      resolve(true);
    };
    script.onerror = () => {
      console.warn("[Razorpay] Failed to load external checkout script from CDN.");
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

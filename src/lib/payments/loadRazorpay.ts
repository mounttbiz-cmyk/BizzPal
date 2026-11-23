/**
 * Ensures Razorpay checkout frame renders dynamic full screen across desktop, tablet, and mobile devices.
 * Automatically adapts dynamically to any screen resolution and device orientation.
 */

function calculateRazorpayScale(): number {
  if (typeof window === "undefined") return 1;
  const w = window.innerWidth;
  const h = window.innerHeight;

  // On mobile screens (<= 768px), Razorpay uses native 100% full screen
  if (w <= 768) {
    return 1;
  }

  // Base dimensions of Razorpay's desktop card (760px width x 505px height)
  const baseW = 760;
  const baseH = 505;

  // We scale the card dynamically so it occupies ~92-94% of the viewport,
  // creating a rich, prominent full-screen payment experience on every laptop, monitor, and tablet.
  const targetW = w * 0.94;
  const targetH = h * 0.92;

  const scaleW = targetW / baseW;
  const scaleH = targetH / baseH;

  // Fit nicely without cutting off edges, capped safely between 1.0 and 2.5
  const scale = Math.max(1, Math.min(scaleW, scaleH, 2.5));
  return Number(scale.toFixed(3));
}

export function updateRazorpayScale() {
  if (typeof document === "undefined") return;
  const scale = calculateRazorpayScale();
  document.documentElement.style.setProperty("--rzp-scale", String(scale));

  const frame = document.querySelector(
    ".razorpay-checkout-frame, iframe[name^='razorpay'], iframe[src*='razorpay.com']"
  ) as HTMLIFrameElement | null;

  if (frame && typeof window !== "undefined") {
    if (window.innerWidth <= 768) {
      frame.style.setProperty("width", "100%", "important");
      frame.style.setProperty("height", "100%", "important");
      frame.style.setProperty("min-height", "100dvh", "important");
      frame.style.setProperty("transform", "none", "important");
      frame.style.setProperty("border-radius", "0", "important");
    } else {
      frame.style.setProperty("width", "760px", "important");
      frame.style.setProperty("height", "505px", "important");
      frame.style.setProperty("min-width", "760px", "important");
      frame.style.setProperty("min-height", "505px", "important");
      frame.style.setProperty("max-width", "760px", "important");
      frame.style.setProperty("max-height", "505px", "important");
      frame.style.setProperty("transform", `scale(${scale})`, "important");
      frame.style.setProperty("transform-origin", "center center", "important");
      frame.style.setProperty("border-radius", "16px", "important");
    }
  }
}

export function enableRazorpayDynamicFullscreen() {
  if (typeof document === "undefined") return;

  const styleId = "razorpay-fullscreen-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = `
      :root {
        --rzp-scale: 1;
      }

      /* Container fills whole viewport as an elegant backdrop */
      .razorpay-container {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        max-width: 100vw !important;
        max-height: 100vh !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        background-color: rgba(8, 9, 12, 0.82) !important;
        backdrop-filter: blur(12px) !important;
        -webkit-backdrop-filter: blur(12px) !important;
      }

      /* Desktop & Tablet: Dynamically scaled full-size checkout */
      @media screen and (min-width: 769px) {
        .razorpay-container .razorpay-checkout-frame,
        iframe.razorpay-checkout-frame,
        iframe[name^="razorpay"],
        iframe[src*="razorpay.com"] {
          position: relative !important;
          top: auto !important;
          left: auto !important;
          right: auto !important;
          bottom: auto !important;
          width: 760px !important;
          height: 505px !important;
          min-width: 760px !important;
          min-height: 505px !important;
          max-width: 760px !important;
          max-height: 505px !important;
          margin: auto !important;
          border: none !important;
          border-radius: 16px !important;
          box-shadow: 0 35px 90px -15px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.12) !important;
          transform: scale(var(--rzp-scale, 1)) !important;
          transform-origin: center center !important;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
          color-scheme: light !important;
          background: transparent !important;
        }
      }

      /* Mobile screens: 100% full screen responsive */
      @media screen and (max-width: 768px) {
        .razorpay-container {
          background-color: transparent !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          display: block !important;
          padding: 0 !important;
        }
        .razorpay-container .razorpay-checkout-frame,
        iframe.razorpay-checkout-frame,
        iframe[name^="razorpay"],
        iframe[src*="razorpay.com"] {
          position: fixed !important;
          inset: 0 !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          width: 100% !important;
          height: 100% !important;
          min-width: 100% !important;
          min-height: 100% !important;
          min-height: 100dvh !important;
          max-height: 100dvh !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          transform: none !important;
          margin: 0 !important;
          border: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Calculate initial scale
  updateRazorpayScale();

  // Resize listener to adapt dynamically on window resize or rotation
  if (typeof window !== "undefined" && !(window as any).__rzpResizeAttached) {
    (window as any).__rzpResizeAttached = true;
    window.addEventListener("resize", updateRazorpayScale, { passive: true });
    window.addEventListener("orientationchange", updateRazorpayScale, { passive: true });
  }

  // Setup observer to ensure styles remain applied as Razorpay updates the DOM
  if (typeof window !== "undefined" && !(window as any).__rzpFullscreenObserverAttached) {
    (window as any).__rzpFullscreenObserverAttached = true;
    const observer = new MutationObserver(() => {
      const container = document.querySelector(".razorpay-container") as HTMLElement | null;
      if (container) {
        container.style.setProperty("position", "fixed", "important");
        container.style.setProperty("inset", "0", "important");
        container.style.setProperty("width", "100vw", "important");
        container.style.setProperty("height", "100vh", "important");
        container.style.setProperty("max-width", "100vw", "important");
        container.style.setProperty("max-height", "100vh", "important");
        container.style.setProperty("z-index", "2147483647", "important");

        // Allow clicking the backdrop outside the frame to close
        if (!container.dataset.backdropListenerAttached) {
          container.dataset.backdropListenerAttached = "true";
          container.addEventListener("click", (e) => {
            if (e.target === container) {
              const esc = new KeyboardEvent("keydown", { key: "Escape", code: "Escape", keyCode: 27, bubbles: true });
              document.dispatchEvent(esc);
              window.dispatchEvent(esc);
            }
          });
        }
      }

      updateRazorpayScale();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"],
    });
  }
}

/**
 * Loads the official Razorpay Checkout SDK dynamically.
 * Guaranteed idempotent and returns true once window.Razorpay is available.
 */
export function loadRazorpaySDK(): Promise<boolean> {
  enableRazorpayDynamicFullscreen();
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if ((window as any).Razorpay) {
      updateRazorpayScale();
      resolve(true);
      return;
    }

    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => {
        updateRazorpayScale();
        resolve(true);
      });
      existingScript.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      updateRazorpayScale();
      resolve(true);
    };
    script.onerror = () => {
      console.warn("[Razorpay] Failed to load external checkout script from CDN.");
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

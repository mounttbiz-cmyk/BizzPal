/**
 * Ensures Razorpay checkout frame renders dynamic full screen across desktop, tablet, and mobile devices.
 */
export function enableRazorpayDynamicFullscreen() {
  if (typeof document === "undefined") return;

  const styleId = "razorpay-fullscreen-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = `
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
        background-color: rgba(8, 9, 12, 0.78) !important;
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
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
        max-width: 100vw !important;
        max-height: 100vh !important;
        min-width: 100vw !important;
        min-height: 100vh !important;
        border: none !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        transform: none !important;
        color-scheme: light !important;
      }
      @media screen and (max-width: 768px) {
        .razorpay-container .razorpay-checkout-frame,
        iframe.razorpay-checkout-frame {
          width: 100% !important;
          height: 100% !important;
          min-height: 100dvh !important;
          max-height: 100dvh !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Setup observer to continuously override any inline width/height applied by Razorpay's script
  if (typeof window !== "undefined" && !(window as any).__rzpFullscreenObserverAttached) {
    (window as any).__rzpFullscreenObserverAttached = true;
    const observer = new MutationObserver(() => {
      const container = document.querySelector(".razorpay-container") as HTMLElement | null;
      if (container) {
        container.style.setProperty("width", "100vw", "important");
        container.style.setProperty("height", "100vh", "important");
        container.style.setProperty("max-width", "100vw", "important");
        container.style.setProperty("max-height", "100vh", "important");
      }
      const frame = document.querySelector(".razorpay-checkout-frame, iframe[name^='razorpay'], iframe[src*='razorpay.com']") as HTMLIFrameElement | null;
      if (frame) {
        frame.style.setProperty("position", "fixed", "important");
        frame.style.setProperty("top", "0", "important");
        frame.style.setProperty("left", "0", "important");
        frame.style.setProperty("right", "0", "important");
        frame.style.setProperty("bottom", "0", "important");
        frame.style.setProperty("width", "100vw", "important");
        frame.style.setProperty("height", "100vh", "important");
        frame.style.setProperty("max-width", "100vw", "important");
        frame.style.setProperty("max-height", "100vh", "important");
        frame.style.setProperty("min-width", "100vw", "important");
        frame.style.setProperty("min-height", "100vh", "important");
        frame.style.setProperty("border", "none", "important");
        frame.style.setProperty("border-radius", "0", "important");
        frame.style.setProperty("box-shadow", "none", "important");
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });
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
      resolve(true);
      return;
    }

    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true));
      existingScript.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn("[Razorpay] Failed to load external checkout script from CDN.");
      resolve(false);
    };
    document.body.appendChild(script);
  });
}


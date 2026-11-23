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
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
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
    `;
    document.head.appendChild(style);
  }
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

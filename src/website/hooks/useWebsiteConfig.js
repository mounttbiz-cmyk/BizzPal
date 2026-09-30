import { useState, useEffect } from 'react';

export const DEFAULT_WEBSITE_STATE = {
  sections: {
    hero: { enabled: true, title: "Hero Section" },
    sceneAwakening: { enabled: true, title: "Scene 01 — Awakening" },
    sceneConnection: { enabled: true, title: "Scene 02 — Connection" },
    sceneIntelligence: { enabled: true, title: "Scene 03 — Intelligence" },
    sceneBizzPal: { enabled: true, title: "Scene 04 — This is BizzPal" },
    about: { enabled: true, title: "About Section" },
    sceneExpansion: { enabled: true, title: "Scene 05 — Expansion" },
    solutions: { enabled: true, title: "Solutions & Capabilities" },
    stats: { enabled: true, title: "Impact & Stats" },
    sceneHuman: { enabled: true, title: "Scene 06 — Human + AI" },
    vision: { enabled: true, title: "Vision Section" },
    sceneFuture: { enabled: true, title: "Scene 07 — Future" },
    contact: { enabled: true, title: "Contact & Onboarding" },
    footer: { enabled: true, title: "Site Footer" },
  },
  nav: {
    brand: "BizzPal",
    links: [
      { label: "About", href: "#about" },
      { label: "Intelligence", href: "#s03" },
      { label: "Solutions", href: "#solutions" },
      { label: "Vision", href: "#vision" },
      { label: "Contact", href: "#contact" },
      { label: "Pricing", href: "/subscription" },
    ],
    ctaText: "Start a Conversation",
    ctaHref: "#contact",
  },
  vision: {
    label: "The next interface is intelligence",
    words: ["Understand.", "Predict.", "Adapt.", "Create.", "Evolve.", "BizzPal."],
  },
  announcement: {
    enabled: false,
    text: "🚀 BizzPal Enterprise Platform v2.0 is now live for all partners.",
    linkText: "Read announcement",
    linkUrl: "#s01",
  },
  hero: {
    eyebrow: "Artificial Intelligence · For Business",
    word: "BizzPal™",
    subtitle: "Your Business. Powered by Intelligence.",
    primaryCtaText: "Explore BizzPal",
    primaryCtaHref: "#s01",
    secondaryCtaText: "Discover Our Intelligence",
    secondaryCtaHref: "#s03",
  },
  scenes: {
    s01: {
      eyebrow: "Scene 01 — Awakening",
      headline: "Every breakthrough begins with a signal.",
    },
    s02: {
      eyebrow: "Scene 02 — Connection",
      headline: "We connect data, intelligence and possibility.",
    },
    s03: {
      eyebrow: "Scene 03 — Intelligence",
      headline: "Turning complexity into intelligence.",
    },
    s04: {
      headline: "This is BizzPal.",
      lead: "Building intelligent systems for a rapidly evolving world.",
    },
    s05: {
      eyebrow: "Scene 05 — Expansion",
      headline: "One intelligence. Infinite possibilities.",
    },
    s06: {
      eyebrow: "Scene 06 — Human + AI",
      headline: "AI doesn't replace possibility. It expands it.",
      lead: "Technology should amplify human potential — not stand in for it.",
    },
    s07: {
      eyebrow: "Scene 07 — Future",
      headline: "The future isn't coming. We're engineering it.",
      ctaText: "Build the Future with BizzPal",
      ctaHref: "/login",
    },
  },
  about: {
    eyebrow: "About BizzPal",
    headline: "We build intelligence that moves the world forward.",
    p1: "BizzPal uses artificial intelligence to automate tasks, analyse data, and help businesses make smarter, faster decisions for growth.",
    p2: "We work at the point where information becomes understanding — designing systems that read complexity, find the signal inside it, and turn that signal into a decision a business can act on today.",
    approach: [
      { label: "Understand the problem", num: "01" },
      { label: "Model the intelligence", num: "02" },
      { label: "Engineer the system", num: "03" },
      { label: "Scale what works", num: "04" },
    ],
  },
  solutions: {
    eyebrow: "Solutions",
    headline: "Capabilities, engineered.",
    subtitle: "Each capability is a system, not a feature — built around the problem it is meant to solve.",
    cards: [
      { id: "c1", num: "01", fx: "ai", title: "AI & Machine Intelligence", desc: "Systems that transform complex information into actionable intelligence." },
      { id: "c2", num: "02", fx: "auto", title: "Intelligent Automation", desc: "Smarter workflows designed to reduce friction and increase scale." },
      { id: "c3", num: "03", fx: "data", title: "Data & Analytics", desc: "Turning data into clarity, prediction and strategic advantage." },
      { id: "c4", num: "04", fx: "digital", title: "Digital Intelligence", desc: "Building intelligent digital experiences for modern organisations." },
      { id: "c5", num: "05", fx: "custom", title: "Custom AI Systems", desc: "Purpose-built intelligence designed around specific business challenges." },
    ],
  },
  stats: {
    items: [
      { id: "s1", num: "01", label: "Intelligence" },
      { id: "s2", num: "∞", label: "Possibilities" },
      { id: "s3", num: "24/7", label: "Designed to think" },
      { id: "s4", num: "01", label: "Vision" },
    ],
  },
  contact: {
    eyebrow: "Contact",
    headline: "Ready to build\nwhat’s next?",
    note: "Opens your mail app — nothing is stored on this page.",
    ctaText: "Start a Conversation",
    ctaHref: "#contact",
    email: "hello@bizzpal.in",
    site: "bizzpal.in",
    linkedin: "https://linkedin.com/company/bizzpal",
    twitter: "https://twitter.com/bizzpal",
  },
  footer: {
    copyright: "© 2026 BizzPal",
    tagline: "BizzPal™ — Your AI Business Partner",
  },
};

function deepMerge(fallback, override) {
  if (!override || typeof override !== 'object' || Array.isArray(override)) {
    return override !== undefined ? override : fallback;
  }
  if (!fallback || typeof fallback !== 'object' || Array.isArray(fallback)) {
    return override;
  }
  const result = { ...fallback };
  for (const key of Object.keys(override)) {
    if (
      override[key] !== null &&
      typeof override[key] === 'object' &&
      !Array.isArray(override[key]) &&
      key in result &&
      typeof result[key] === 'object' &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key], override[key]);
    } else if (override[key] !== undefined) {
      result[key] = override[key];
    }
  }
  return result;
}

function getInitialWebsiteConfig() {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('bizzpal_website_config');
      if (saved) {
        return deepMerge(DEFAULT_WEBSITE_STATE, JSON.parse(saved));
      }
    } catch {}
  }
  return DEFAULT_WEBSITE_STATE;
}

export function useWebsiteConfig() {
  const [config, setConfig] = useState(getInitialWebsiteConfig);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchConfig() {
      // 1. Instant check from localStorage
      if (typeof window !== 'undefined') {
        try {
          const local = localStorage.getItem('bizzpal_website_config');
          if (local && mounted) {
            setConfig(deepMerge(DEFAULT_WEBSITE_STATE, JSON.parse(local)));
          }
        } catch {}
      }

      // 2. Query public config API
      try {
        const res = await fetch('/api/public/config', { 
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        const json = await res.json();
        if (mounted && json.success && json.website) {
          const merged = deepMerge(DEFAULT_WEBSITE_STATE, json.website);
          setConfig(merged);
          try {
            localStorage.setItem('bizzpal_website_config', JSON.stringify(merged));
          } catch {}
        }
      } catch (err) {
        console.warn('Could not fetch remote website config, using cached/defaults', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchConfig();

    let bc = null;
    if (typeof window !== "undefined") {
      window.addEventListener("bizzpal_config_updated", fetchConfig);
      window.addEventListener("storage", fetchConfig);
      try {
        bc = new BroadcastChannel("bizzpal_channel");
        bc.onmessage = () => fetchConfig();
      } catch {}
    }

    return () => {
      mounted = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("bizzpal_config_updated", fetchConfig);
        window.removeEventListener("storage", fetchConfig);
        if (bc) bc.close();
      }
    };
  }, []);

  return { config, loading };
}

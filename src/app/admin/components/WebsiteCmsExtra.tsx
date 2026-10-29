"use client";

import React, { useState } from "react";
import {
  Globe,
  Plus,
  Trash2,
  Edit2,
  Save,
  Compass,
  Check,
  X,
  Image as ImageIcon,
  Upload,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Sparkles,
  Link as LinkIcon,
  BarChart3,
  Layers,
} from "lucide-react";

interface WebsiteCmsExtraProps {
  config: any;
  onChange: (updatedConfig: any) => void;
  onSave: () => Promise<void>;
  saving: boolean;
  subTab: "nav_brand" | "vision_words" | "announcement" | "stats" | "footer";
}

export function WebsiteCmsExtra({ config, onChange, onSave, saving, subTab }: WebsiteCmsExtraProps) {
  const nav = config?.nav || {
    brand: "BizzPal",
    logoUrl: "/logo-icon.png",
    logoHref: "#hero",
    links: [
      { label: "About", href: "#about", enabled: true },
      { label: "Intelligence", href: "#s03", enabled: true },
      { label: "Solutions", href: "#solutions", enabled: true },
      { label: "Vision", href: "#vision", enabled: true },
      { label: "Contact", href: "#contact", enabled: true },
      { label: "Pricing", href: "/subscription", enabled: true },
    ],
    ctaText: "Start a Conversation",
    ctaHref: "#contact",
    ctaEnabled: true,
    ctaPlacement: "right",
  };

  const vision = config?.vision || {
    label: "The next interface is intelligence",
    words: ["Understand.", "Predict.", "Adapt.", "Create.", "Evolve.", "BizzPal."],
  };

  const announcement = config?.announcement || {
    enabled: false,
    text: "🚀 BizzPal Enterprise Platform v2.0 is now live for all partners.",
    linkText: "Read announcement",
    linkUrl: "#s01",
    bgTone: "brass",
    dismissible: true,
  };

  const stats = config?.stats || {
    items: [
      { id: "s1", num: "01", label: "Intelligence", enabled: true },
      { id: "s2", num: "∞", label: "Possibilities", enabled: true },
      { id: "s3", num: "24/7", label: "Designed to think", enabled: true },
      { id: "s4", num: "01", label: "Vision", enabled: true },
    ],
  };

  const footer = config?.footer || {
    brand: "BizzPal™",
    tagline: "BizzPal™ — Your AI Business Partner",
    copyright: "© 2026 BizzPal. All rights reserved.",
    disclaimer: "Autonomous Enterprise Intelligence System",
    legalLinks: [
      { label: "Terms & Conditions", href: "/terms", enabled: true },
      { label: "Privacy Policy", href: "/privacy", enabled: true },
    ],
  };

  // Nav link edit state
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkHref, setNewLinkHref] = useState("");

  const handleAddNavLink = () => {
    if (!newLinkLabel.trim() || !newLinkHref.trim()) return;
    const updatedLinks = [
      ...(nav.links || []),
      { label: newLinkLabel.trim(), href: newLinkHref.trim(), enabled: true },
    ];
    onChange({
      ...config,
      nav: { ...nav, links: updatedLinks },
    });
    setNewLinkLabel("");
    setNewLinkHref("");
  };

  const handleDeleteNavLink = (index: number) => {
    const updatedLinks = (nav.links || []).filter((_: any, i: number) => i !== index);
    onChange({
      ...config,
      nav: { ...nav, links: updatedLinks },
    });
  };

  const handleMoveNavLink = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    const list = [...(nav.links || [])];
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const [moved] = list.splice(index, 1);
    list.splice(targetIndex, 0, moved);
    onChange({
      ...config,
      nav: { ...nav, links: list },
    });
  };

  const handleToggleNavLink = (index: number) => {
    const list = [...(nav.links || [])];
    list[index] = { ...list[index], enabled: list[index].enabled === false ? true : false };
    onChange({
      ...config,
      nav: { ...nav, links: list },
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUri = event.target?.result as string;
      if (dataUri) {
        onChange({
          ...config,
          nav: { ...nav, logoUrl: dataUri },
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Vision words state
  const [newVisionWord, setNewVisionWord] = useState("");

  const handleAddVisionWord = () => {
    if (!newVisionWord.trim()) return;
    const wordToAdd = newVisionWord.trim().endsWith(".") ? newVisionWord.trim() : `${newVisionWord.trim()}.`;
    const updatedWords = [...(vision.words || []), wordToAdd];
    onChange({
      ...config,
      vision: { ...vision, words: updatedWords },
    });
    setNewVisionWord("");
  };

  const handleDeleteVisionWord = (index: number) => {
    const updatedWords = (vision.words || []).filter((_: any, i: number) => i !== index);
    onChange({
      ...config,
      vision: { ...vision, words: updatedWords },
    });
  };

  const handleMoveVisionWord = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    const list = [...(vision.words || [])];
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const [moved] = list.splice(index, 1);
    list.splice(targetIndex, 0, moved);
    onChange({
      ...config,
      vision: { ...vision, words: list },
    });
  };

  // Stats edit state
  const [newStatNum, setNewStatNum] = useState("");
  const [newStatLabel, setNewStatLabel] = useState("");

  const handleAddStat = () => {
    if (!newStatNum.trim() || !newStatLabel.trim()) return;
    const newStat = {
      id: `stat_${Date.now()}`,
      num: newStatNum.trim(),
      label: newStatLabel.trim(),
      enabled: true,
    };
    const updatedItems = [...(stats.items || []), newStat];
    onChange({
      ...config,
      stats: { ...stats, items: updatedItems },
    });
    setNewStatNum("");
    setNewStatLabel("");
  };

  const handleDeleteStat = (index: number) => {
    const updatedItems = (stats.items || []).filter((_: any, i: number) => i !== index);
    onChange({
      ...config,
      stats: { ...stats, items: updatedItems },
    });
  };

  const handleMoveStat = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    const list = [...(stats.items || [])];
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const [moved] = list.splice(index, 1);
    list.splice(targetIndex, 0, moved);
    onChange({
      ...config,
      stats: { ...stats, items: list },
    });
  };

  // Footer legal links state
  const [newLegalLabel, setNewLegalLabel] = useState("");
  const [newLegalHref, setNewLegalHref] = useState("");

  const handleAddLegalLink = () => {
    if (!newLegalLabel.trim() || !newLegalHref.trim()) return;
    const updatedLinks = [
      ...(footer.legalLinks || []),
      { label: newLegalLabel.trim(), href: newLegalHref.trim(), enabled: true },
    ];
    onChange({
      ...config,
      footer: { ...footer, legalLinks: updatedLinks },
    });
    setNewLegalLabel("");
    setNewLegalHref("");
  };

  const handleDeleteLegalLink = (index: number) => {
    const updatedLinks = (footer.legalLinks || []).filter((_: any, i: number) => i !== index);
    onChange({
      ...config,
      footer: { ...footer, legalLinks: updatedLinks },
    });
  };

  // -------------------------------------------------------------
  // TAB: NAVBAR LINKS & BRAND
  // -------------------------------------------------------------
  if (subTab === "nav_brand") {
    return (
      <div className="space-y-6">
        <div className="p-4 rounded-xl bg-surface border border-line flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-text">Website Navigation & Brand Identity</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Live edit logo, brand wordmark, navbar menu links, and header action button.
            </p>
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-brass hover:brightness-110 text-white flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? "Saving..." : "Save Brand Settings"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-surface border border-line space-y-4 shadow-theme">
            <h3 className="text-xs font-bold text-text uppercase tracking-wider font-mono flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-brass" />
              Brand Logo & Identity
            </h3>

            {/* Live Logo Preview Box */}
            <div className="p-4 rounded-xl bg-[#08070A] border border-[#D6B46A]/25 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={nav.logoUrl || "/logo-icon.png"}
                  alt={nav.brand || "BizzPal"}
                  className="w-9 h-8 object-contain drop-shadow-[0_0_8px_rgba(217,180,74,0.45)]"
                />
                <span className="font-bold text-base tracking-tight text-white">
                  {nav.brand || "BizzPal"}
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#D6B46A] px-2 py-0.5 rounded-full bg-[#D6B46A]/10 border border-[#D6B46A]/20">
                Live Preview
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {/* Presets & Upload */}
              <div className="space-y-1.5">
                <label className="font-semibold text-text">Logo Presets & Upload</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...config,
                        nav: { ...nav, logoUrl: "/logo-icon.png" },
                      })
                    }
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      !nav.logoUrl || nav.logoUrl === "/logo-icon.png"
                        ? "bg-brass/15 border-brass text-text"
                        : "bg-surface-2 border-line text-text-muted hover:text-text"
                    }`}
                  >
                    Official 3D Gold Icon
                  </button>
                  <label className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-surface-2 border border-line text-text hover:border-brass cursor-pointer flex items-center gap-1.5">
                    <Upload className="w-3 h-3 text-brass" />
                    <span>Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  {nav.logoUrl && nav.logoUrl !== "/logo-icon.png" && (
                    <button
                      type="button"
                      onClick={() =>
                        onChange({
                          ...config,
                          nav: { ...nav, logoUrl: "/logo-icon.png" },
                        })
                      }
                      className="px-2 py-1.5 rounded-lg text-xs text-text-muted hover:text-rose-500 border border-line bg-surface-2 flex items-center gap-1 cursor-pointer"
                      title="Reset to default 3D gold icon"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Logo URL Input */}
              <div className="space-y-1">
                <label className="font-semibold text-text">Logo Image URL / Path</label>
                <input
                  type="text"
                  placeholder="/logo-icon.png or https://... or data:image/..."
                  value={nav.logoUrl || "/logo-icon.png"}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      nav: { ...nav, logoUrl: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text font-mono text-[11px]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-text">Brand / Logo Text</label>
                <input
                  type="text"
                  value={nav.brand || "BizzPal"}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      nav: { ...nav, brand: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-text">Logo Click Destination Link</label>
                <input
                  type="text"
                  value={nav.logoHref || "#hero"}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      nav: { ...nav, logoHref: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text font-mono text-[11px]"
                  placeholder="#hero or /"
                />
              </div>

              <div className="pt-2 border-t border-line space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-text">Header CTA Action Button</span>
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...config,
                        nav: { ...nav, ctaEnabled: nav.ctaEnabled !== false ? false : true },
                      })
                    }
                    className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                      nav.ctaEnabled !== false
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-500"
                        : "bg-surface-2 border-line text-text-muted"
                    }`}
                  >
                    {nav.ctaEnabled !== false ? "VISIBLE" : "HIDDEN"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-semibold text-text">Button Label</label>
                    <input
                      type="text"
                      value={nav.ctaText || "Start a Conversation"}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          nav: { ...nav, ctaText: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-text">Destination URL / Anchor</label>
                    <input
                      type="text"
                      value={nav.ctaHref || "#contact"}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          nav: { ...nav, ctaHref: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navbar Menu Links with Reorder and Active Toggles */}
          <div className="p-5 rounded-2xl bg-surface border border-line space-y-4 shadow-theme">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-text uppercase tracking-wider font-mono">Navbar Menu Links</h3>
              <span className="text-[10px] text-text-muted font-mono">{(nav.links || []).length} Items</span>
            </div>

            <div className="space-y-2">
              {(nav.links || []).map((link: any, i: number) => (
                <div
                  key={i}
                  className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border text-xs transition-all ${
                    link.enabled !== false
                      ? "bg-surface-2 border-line"
                      : "bg-surface-2/40 border-dashed border-line opacity-50"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-text truncate">{link.label}</span>
                    <span className="text-[11px] text-text-muted font-mono truncate">({link.href})</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleNavLink(i)}
                      className="p-1 rounded text-text-muted hover:text-text cursor-pointer"
                      title={link.enabled !== false ? "Hide link" : "Show link"}
                    >
                      {link.enabled !== false ? <Eye className="w-3.5 h-3.5 text-emerald-500" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => handleMoveNavLink(i, -1)}
                      className="p-1 rounded text-text-muted hover:text-text disabled:opacity-20 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={i === (nav.links || []).length - 1}
                      onClick={() => handleMoveNavLink(i, 1)}
                      className="p-1 rounded text-text-muted hover:text-text disabled:opacity-20 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteNavLink(i)}
                      className="p-1 rounded text-text-muted hover:text-rose-500 cursor-pointer"
                      title="Delete link"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Label (e.g. Community)"
                  value={newLinkLabel}
                  onChange={(e) => setNewLinkLabel(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-surface-2 border border-line text-xs text-text"
                />
                <input
                  type="text"
                  placeholder="Href (e.g. /community or #about)"
                  value={newLinkHref}
                  onChange={(e) => setNewLinkHref(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-surface-2 border border-line text-xs text-text font-mono"
                />
                <button
                  type="button"
                  onClick={handleAddNavLink}
                  className="px-4 py-2 sm:py-1.5 rounded-xl bg-brass hover:brightness-110 text-white text-xs font-bold cursor-pointer shrink-0"
                >
                  Add Link
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // TAB: VISION KINETIC WORDS
  // -------------------------------------------------------------
  if (subTab === "vision_words") {
    return (
      <div className="space-y-6">
        <div className="p-4 rounded-xl bg-surface border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-text">Vision Section Kinetic Words</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Edit the sequential rotating words that animate during the 3D kinetic scroll scene.
            </p>
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-brass hover:brightness-110 text-white flex items-center gap-1.5 transition-all shadow-md self-start sm:self-auto cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? "Saving..." : "Save Vision Words"}</span>
          </button>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-line space-y-4 shadow-theme max-w-xl">
          <div className="space-y-1 text-xs">
            <label className="font-semibold text-text">Vision Subtitle / Section Eyebrow</label>
            <input
              type="text"
              value={vision.label || "The next interface is intelligence"}
              onChange={(e) =>
                onChange({
                  ...config,
                  vision: { ...vision, label: e.target.value },
                })
              }
              className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text font-medium"
            />
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-text uppercase tracking-wider font-mono block">
              Sequential Animated Words ({(vision.words || []).length} Words)
            </label>
            <div className="space-y-2">
              {(vision.words || []).map((word: string, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-2 border border-line text-xs font-bold text-text"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-brass/20 text-brass text-[10px] flex items-center justify-center font-mono">
                      {i + 1}
                    </span>
                    <span>{word}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => handleMoveVisionWord(i, -1)}
                      className="p-1 rounded text-text-muted hover:text-text disabled:opacity-20 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={i === (vision.words || []).length - 1}
                      onClick={() => handleMoveVisionWord(i, 1)}
                      className="p-1 rounded text-text-muted hover:text-text disabled:opacity-20 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteVisionWord(i)}
                      className="p-1 rounded text-text-muted hover:text-rose-500 cursor-pointer"
                      title="Delete word"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-3">
              <input
                type="text"
                placeholder="Add new word (e.g. Innovate.)"
                value={newVisionWord}
                onChange={(e) => setNewVisionWord(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddVisionWord())}
                className="flex-1 px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text"
              />
              <button
                type="button"
                onClick={handleAddVisionWord}
                className="px-4 py-2 rounded-xl bg-brass hover:brightness-110 text-white text-xs font-bold cursor-pointer shrink-0"
              >
                Add Word
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // TAB: IMPACT & STATS
  // -------------------------------------------------------------
  if (subTab === "stats") {
    return (
      <div className="space-y-6">
        <div className="p-4 rounded-xl bg-surface border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-text">Impact & Metrics Section</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Customize the prominent numbers and labels rendered in the high-impact Stats section.
            </p>
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-brass hover:brightness-110 text-white flex items-center gap-1.5 transition-all shadow-md self-start sm:self-auto cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? "Saving..." : "Save Stats Metrics"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-surface border border-line space-y-4 shadow-theme">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-text uppercase tracking-wider font-mono">Current Impact Stats</h3>
              <span className="text-[10px] text-text-muted font-mono">{(stats.items || []).length} Metrics</span>
            </div>

            <div className="space-y-2">
              {(stats.items || []).map((item: any, i: number) => (
                <div
                  key={item.id || i}
                  className="flex items-center justify-between gap-2 p-3 rounded-xl bg-surface-2 border border-line text-xs"
                >
                  <div>
                    <div className="text-base font-black text-gold font-mono">{item.num}</div>
                    <div className="text-text font-semibold">{item.label}</div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => handleMoveStat(i, -1)}
                      className="p-1 rounded text-text-muted hover:text-text disabled:opacity-20 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={i === (stats.items || []).length - 1}
                      onClick={() => handleMoveStat(i, 1)}
                      className="p-1 rounded text-text-muted hover:text-text disabled:opacity-20 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteStat(i)}
                      className="p-1 rounded text-text-muted hover:text-rose-500 cursor-pointer"
                      title="Delete stat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-line space-y-2">
              <span className="text-xs font-bold text-text block">Add New Impact Metric</span>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  placeholder="Value (e.g. 99.9% or 24/7)"
                  value={newStatNum}
                  onChange={(e) => setNewStatNum(e.target.value)}
                  className="w-full sm:w-1/3 px-3 py-1.5 rounded-xl bg-surface-2 border border-line text-xs text-text font-mono"
                />
                <input
                  type="text"
                  placeholder="Label (e.g. Enterprise SLA)"
                  value={newStatLabel}
                  onChange={(e) => setNewStatLabel(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-surface-2 border border-line text-xs text-text"
                />
                <button
                  type="button"
                  onClick={handleAddStat}
                  className="px-4 py-2 sm:py-1.5 rounded-xl bg-brass hover:brightness-110 text-white text-xs font-bold cursor-pointer shrink-0"
                >
                  Add Stat
                </button>
              </div>
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="p-5 rounded-2xl bg-surface border border-line space-y-4 shadow-theme">
            <h3 className="text-xs font-bold text-text uppercase tracking-wider font-mono">Live Website Preview</h3>
            <div className="p-6 rounded-2xl bg-[#08070A] border border-[#D6B46A]/25 grid grid-cols-2 gap-4">
              {(stats.items || []).map((s: any, idx: number) => (
                <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                  <div className="text-2xl font-black text-[#D6B46A] font-mono">{s.num}</div>
                  <div className="text-xs text-white/80 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // TAB: FOOTER & LEGAL
  // -------------------------------------------------------------
  if (subTab === "footer") {
    return (
      <div className="space-y-6">
        <div className="p-4 rounded-xl bg-surface border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-text">Site Footer & Legal Links</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Edit the website footer tagline, copyright, branding, and policy links.
            </p>
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-brass hover:brightness-110 text-white flex items-center gap-1.5 transition-all shadow-md self-start sm:self-auto cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? "Saving..." : "Save Footer"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-surface border border-line space-y-4 shadow-theme">
            <h3 className="text-xs font-bold text-text uppercase tracking-wider font-mono">Footer Copy</h3>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-text">Footer Brand Wordmark</label>
                <input
                  type="text"
                  value={footer.brand || "BizzPal™"}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      footer: { ...footer, brand: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-text">Footer Main Tagline</label>
                <input
                  type="text"
                  value={footer.tagline || "BizzPal™ — Your AI Business Partner"}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      footer: { ...footer, tagline: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-text">Copyright Notice</label>
                <input
                  type="text"
                  value={footer.copyright || "© 2026 BizzPal. All rights reserved."}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      footer: { ...footer, copyright: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text"
                />
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface border border-line space-y-4 shadow-theme">
            <h3 className="text-xs font-bold text-text uppercase tracking-wider font-mono">Footer Legal & Policy Links</h3>
            <div className="space-y-2">
              {(footer.legalLinks || []).map((ll: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-2 border border-line text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text">{ll.label}</span>
                    <span className="text-[11px] text-text-muted font-mono">({ll.href})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteLegalLink(idx)}
                    className="p-1 rounded text-text-muted hover:text-rose-500 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Link Label (e.g. Security)"
                  value={newLegalLabel}
                  onChange={(e) => setNewLegalLabel(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-surface-2 border border-line text-xs text-text"
                />
                <input
                  type="text"
                  placeholder="Href (e.g. /security)"
                  value={newLegalHref}
                  onChange={(e) => setNewLegalHref(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-surface-2 border border-line text-xs text-text font-mono"
                />
                <button
                  type="button"
                  onClick={handleAddLegalLink}
                  className="px-4 py-2 sm:py-1.5 rounded-xl bg-brass hover:brightness-110 text-white text-xs font-bold cursor-pointer shrink-0"
                >
                  Add Link
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // TAB: ANNOUNCEMENT BANNER
  // -------------------------------------------------------------
  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-surface border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-text">Announcement Banner Settings</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Configure the prominent floating alert banner across the top of the marketing website.
          </p>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-brass hover:brightness-110 text-white flex items-center gap-1.5 transition-all shadow-md self-start sm:self-auto cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saving ? "Saving..." : "Save Announcement"}</span>
        </button>
      </div>

      <div className="p-5 rounded-2xl bg-surface border border-line space-y-4 shadow-theme max-w-xl">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <div className="text-xs font-bold text-text">Banner Visibility</div>
            <div className="text-[11px] text-text-muted">Display announcement bar on website</div>
          </div>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...config,
                announcement: {
                  ...announcement,
                  enabled: !announcement.enabled,
                },
              })
            }
            className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
              announcement.enabled
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-500"
                : "bg-surface-2 border-line text-text-muted"
            }`}
          >
            {announcement.enabled ? "ACTIVE & VISIBLE" : "HIDDEN"}
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-text">Banner Message Text</label>
            <input
              type="text"
              value={announcement.text || ""}
              onChange={(e) =>
                onChange({
                  ...config,
                  announcement: { ...announcement, text: e.target.value },
                })
              }
              className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text"
              placeholder="e.g. 🚀 BizzPal Enterprise Platform v2.0 is now live for all partners."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-text">Action Link Text</label>
              <input
                type="text"
                value={announcement.linkText || ""}
                onChange={(e) =>
                  onChange({
                    ...config,
                    announcement: { ...announcement, linkText: e.target.value },
                  })
                }
                className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text"
                placeholder="e.g. Read announcement"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-text">Destination URL / Anchor</label>
              <input
                type="text"
                value={announcement.linkUrl || ""}
                onChange={(e) =>
                  onChange({
                    ...config,
                    announcement: { ...announcement, linkUrl: e.target.value },
                  })
                }
                className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text font-mono text-[11px]"
                placeholder="e.g. #s01 or /subscription"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { Globe, Plus, Trash2, Edit2, Save, Sparkles, Compass, Check, X, Image as ImageIcon, Upload, RotateCcw } from "lucide-react";

interface WebsiteCmsExtraProps {
  config: any;
  onChange: (updatedConfig: any) => void;
  onSave: () => Promise<void>;
  saving: boolean;
  subTab: "nav_brand" | "vision_words" | "announcement";
}

export function WebsiteCmsExtra({ config, onChange, onSave, saving, subTab }: WebsiteCmsExtraProps) {
  const nav = config?.nav || {
    brand: "BizzPal",
    logoUrl: "/logo-icon.png",
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

  const vision = config?.vision || {
    label: "The next interface is intelligence",
    words: ["Understand.", "Predict.", "Adapt.", "Create.", "Evolve.", "BizzPal."],
  };

  const announcement = config?.announcement || {
    enabled: false,
    text: "🚀 BizzPal Enterprise Platform v2.0 is now live for all partners.",
    linkText: "Read announcement",
    linkUrl: "#s01",
  };

  // Nav link edit state
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkHref, setNewLinkHref] = useState("");

  const handleAddNavLink = () => {
    if (!newLinkLabel.trim() || !newLinkHref.trim()) return;
    const updatedLinks = [...(nav.links || []), { label: newLinkLabel.trim(), href: newLinkHref.trim() }];
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

  if (subTab === "nav_brand") {
    return (
      <div className="space-y-6">
        <div className="p-4 rounded-xl bg-surface border border-line flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-text">Website Navigation & Brand Identity</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Customize the logo icon, brand wordmark, navigation links, and action button on the live website.
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
                <span className="font-bold text-base tracking-tight">
                  <span className="text-white">Bizz</span>
                  <span className="text-[#D9B44A]">Pal</span>
                  <span className="text-[#D9B44A] text-[10px] ml-0.5">™</span>
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
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      (!nav.logoUrl || nav.logoUrl === "/logo-icon.png")
                        ? "bg-brass/15 border-brass text-text"
                        : "bg-surface-2 border-line text-text-muted hover:text-text"
                    }`}
                  >
                    Official 3D Gold Icon
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...config,
                        nav: { ...nav, logoUrl: "/bizzpal-brand-logo.png" },
                      })
                    }
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      nav.logoUrl === "/bizzpal-brand-logo.png"
                        ? "bg-brass/15 border-brass text-text"
                        : "bg-surface-2 border-line text-text-muted hover:text-text"
                    }`}
                  >
                    Full Brand Lockup
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
                      className="px-2 py-1.5 rounded-lg text-xs text-text-muted hover:text-rose-500 border border-line bg-surface-2 flex items-center gap-1"
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
                <label className="font-semibold text-text">Header CTA Button Text</label>
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
                <label className="font-semibold text-text">Header CTA Destination URL</label>
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

          <div className="p-5 rounded-2xl bg-surface border border-line space-y-4 shadow-theme">
            <h3 className="text-xs font-bold text-text uppercase tracking-wider font-mono">Navbar Menu Links</h3>
            <div className="space-y-2">
              {(nav.links || []).map((link: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-2 border border-line text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text">{link.label}</span>
                    <span className="text-[11px] text-text-muted font-mono">({link.href})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteNavLink(i)}
                    className="p-1 rounded text-text-muted hover:text-rose-500 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Label (e.g. Pricing)"
                  value={newLinkLabel}
                  onChange={(e) => setNewLinkLabel(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-surface-2 border border-line text-xs text-text"
                />
                <input
                  type="text"
                  placeholder="Href (e.g. #pricing or /subscription)"
                  value={newLinkHref}
                  onChange={(e) => setNewLinkHref(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-surface-2 border border-line text-xs text-text font-mono"
                />
                <button
                  type="button"
                  onClick={handleAddNavLink}
                  className="px-3 py-1.5 rounded-xl bg-brass hover:brightness-110 text-white text-xs font-bold cursor-pointer shrink-0"
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

  if (subTab === "vision_words") {
    return (
      <div className="space-y-6">
        <div className="p-4 rounded-xl bg-surface border border-line flex items-center justify-between">
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
            className="px-4 py-2 rounded-xl text-xs font-bold bg-brass hover:brightness-110 text-white flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? "Saving..." : "Save Vision Words"}</span>
          </button>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-line space-y-4 shadow-theme max-w-xl">
          <div className="space-y-1 text-xs">
            <label className="font-semibold text-text">Vision Subtitle / Label</label>
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
              Sequential Animated Words
            </label>
            <div className="flex flex-wrap gap-2">
              {(vision.words || []).map((word: string, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-2 border border-line text-xs font-bold text-text"
                >
                  <span>{word}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteVisionWord(i)}
                    className="text-text-muted hover:text-rose-500 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-3">
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
                className="px-4 py-2 rounded-xl bg-brass hover:brightness-110 text-white text-xs font-bold cursor-pointer"
              >
                Add Word
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Announcement Subtab
  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-surface border border-line flex items-center justify-between">
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
          className="px-4 py-2 rounded-xl text-xs font-bold bg-brass hover:brightness-110 text-white flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
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
                placeholder="e.g. #s01 or /blog/v2"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

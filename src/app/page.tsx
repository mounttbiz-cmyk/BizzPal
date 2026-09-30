"use client";

import dynamic from "next/dynamic";

const WebsiteApp = dynamic(() => import("@/website/App"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#08070A] flex flex-col items-center justify-center gap-5">
      <img
        src="/logo-icon.png"
        alt="BizzPal"
        className="w-[78px] h-[69px] object-contain animate-pulse drop-shadow-[0_0_18px_rgba(217,180,74,0.45)]"
      />
      <div className="flex items-baseline font-bold text-2xl tracking-tight">
        <span className="text-white">Bizz</span>
        <span className="text-[#D9B44A]">Pal</span>
        <span className="text-[#D9B44A] text-xs ml-0.5">™</span>
      </div>
      <div className="w-36 h-[1px] bg-[#D6B46A]/20 overflow-hidden">
        <div className="w-full h-full bg-gradient-to-r from-[#A8823A] to-[#F0D98A] animate-pulse" />
      </div>
    </div>
  ),
});

export default function RootPage() {
  return <WebsiteApp />;
}

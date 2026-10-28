import React from "react";
import Link from "next/link";
import { ArrowLeft, Shield, Lock, Eye, Database, Globe } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — BizzPal",
  description: "Privacy policy and data governance practices of the BizzPal platform.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#08070A] text-[#E5E7EB] selection:bg-[#D9B44A] selection:text-black font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#08070A]/80 border-b border-white/[0.08]">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <img
              src="/logo-icon.png"
              alt="BizzPal"
              className="w-9 h-8 object-contain transition-transform group-hover:scale-105"
            />
            <div className="flex items-baseline font-bold text-xl tracking-tight">
              <span className="text-white">Bizz</span>
              <span className="text-[#D9B44A]">Pal</span>
              <span className="text-[#D9B44A] text-xs ml-0.5">™</span>
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 text-xs font-medium text-white/80 hover:text-white hover:border-[#D9B44A]/40 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-16 space-y-12">
        {/* Title Section */}
        <div className="space-y-4 border-b border-white/[0.08] pb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D9B44A]/10 border border-[#D9B44A]/25 text-[#D9B44A] text-xs font-semibold uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" />
            <span>Data Protection &amp; Governance</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-[#9CA3AF]">
            Effective Date: January 1, 2026 · Last Updated: October 28, 2026
          </p>
        </div>

        {/* Section 1 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-[#D9B44A]">01.</span> Commitment to Enterprise Privacy
          </h2>
          <p className="text-sm leading-relaxed text-[#9CA3AF]">
            At BizzPal (<strong className="text-white">bizzpal.ai</strong>), we hold enterprise privacy and confidentiality as foundational principles. This Privacy Policy describes how we collect, process, isolate, and safeguard data when you interact with our autonomous intelligence platform.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-[#D9B44A]">02.</span> Information We Collect
          </h2>
          <p className="text-sm leading-relaxed text-[#9CA3AF]">
            We collect information strictly necessary to provide intelligent executive simulations and autonomous business services:
          </p>
          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
              <div className="flex items-center gap-2 text-white font-medium text-xs">
                <Lock className="w-3.5 h-3.5 text-[#D9B44A]" />
                Account &amp; Auth Credentials
              </div>
              <p className="text-[11px] text-[#9CA3AF]">
                Corporate email addresses, names, and OAuth tokens managed via encrypted Google Cloud security standards.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
              <div className="flex items-center gap-2 text-white font-medium text-xs">
                <Database className="w-3.5 h-3.5 text-[#D9B44A]" />
                Company Telemetry &amp; Documents
              </div>
              <p className="text-[11px] text-[#9CA3AF]">
                P&amp;L records, business plans, metrics, and documents uploaded to your isolated tenant workspace.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-[#D9B44A]">03.</span> AI Confidentiality &amp; No-Training Guarantee
          </h2>
          <div className="p-5 rounded-xl bg-[#D9B44A]/[0.06] border border-[#D9B44A]/25 text-xs text-[#E5E7EB] space-y-2">
            <p className="font-semibold text-white flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-[#D9B44A]" />
              Zero Model Training on Customer Proprietary Data
            </p>
            <p className="text-[#9CA3AF] leading-relaxed">
              Your business documents, financial models, and executive chat interactions are <strong className="text-white">NEVER used to train foundational AI models</strong>. All embeddings and vector search chunks are encrypted and logically isolated per organization.
            </p>
          </div>
        </section>

        {/* Section 4 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-[#D9B44A]">04.</span> Data Security &amp; Infrastructure
          </h2>
          <p className="text-sm leading-relaxed text-[#9CA3AF]">
            BizzPal operates on top of secure Google Cloud Platform (GCP) infrastructure. All data in transit is protected using TLS 1.3 encryption, and data at rest is protected using industry-standard AES-256 encryption.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-[#D9B44A]">05.</span> Your Rights &amp; Data Deletion
          </h2>
          <p className="text-sm leading-relaxed text-[#9CA3AF]">
            You have full ownership of your data. You may request data export or complete account deletion at any time by contacting our data protection officer at <a href="mailto:hello@bizzpal.ai" className="text-[#D9B44A] underline">hello@bizzpal.ai</a>.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-4 border-t border-white/[0.08] pt-8">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-[#D9B44A]">06.</span> Privacy Inquiries
          </h2>
          <p className="text-sm leading-relaxed text-[#9CA3AF]">
            For questions or requests regarding your personal or business data, contact our security team:
          </p>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-[#9CA3AF] space-y-1">
            <p className="font-semibold text-white">BizzPal Data Protection Officer</p>
            <p>Domain: <a href="https://bizzpal.ai" className="text-[#D9B44A]">https://bizzpal.ai</a></p>
            <p>Email: <a href="mailto:hello@bizzpal.ai" className="text-[#D9B44A]">hello@bizzpal.ai</a></p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-8 text-center text-xs text-[#9CA3AF]">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-white transition-colors">Terms &amp; Conditions</Link>
            <span>·</span>
            <Link href="/privacy" className="text-[#D9B44A] hover:underline">Privacy Policy</Link>
          </div>
          <div>BizzPal™ — Your AI Business Partner · bizzpal.ai</div>
        </div>
      </footer>
    </div>
  );
}

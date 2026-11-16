import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

/** A block of text inside a section. "h3" is a sub-heading, "ul" is a bullet list. */
export type Block = { type: "p"; text: string } | { type: "h3"; text: string } | { type: "ul"; items: string[] };
export interface LegalSection {
  title: string;
  blocks: Block[];
}

interface Props {
  badge: string;
  title: string;
  subtitle: string;
  /** Lines shown under the title (dates, operator, contact) */
  facts: string[];
  intro: string[];
  sections: LegalSection[];
  current: "terms" | "privacy";
}

const LINKS: Array<[string, string]> = [
  ["care@bizzpal.ai", "mailto:care@bizzpal.ai"],
  ["Google API Services User Data Policy", "https://developers.google.com/terms/api-services-user-data-policy"],
  ["https://bizzpal.ai", "https://bizzpal.ai"],
];

/** Turns known emails and links inside a sentence into real links. */
function withLinks(text: string): ReactNode[] {
  let parts: ReactNode[] = [text];
  for (const [label, href] of LINKS) {
    parts = parts.flatMap((p, i) => {
      if (typeof p !== "string" || !p.includes(label)) return [p];
      const pieces = p.split(label);
      const out: ReactNode[] = [];
      pieces.forEach((piece, j) => {
        out.push(piece);
        if (j < pieces.length - 1) {
          out.push(
            <a key={`${i}-${j}-${label}`} href={href} className="text-[#D9B44A] underline" {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
              {label}
            </a>
          );
        }
      });
      return out;
    });
  }
  return parts;
}

function Title({ text }: { text: string }) {
  const m = /^(\d+\.)\s+(.*)$/.exec(text);
  return (
    <h2 className="text-xl font-bold text-white">
      {m ? <><span className="text-[#D9B44A]">{m[1]}</span> {m[2]}</> : text}
    </h2>
  );
}

export function LegalPage({ badge, title, subtitle, facts, intro, sections, current }: Props) {
  return (
    <div className="min-h-screen bg-[#08070A] text-[#E5E7EB] selection:bg-[#D9B44A] selection:text-black font-sans">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#08070A]/80 border-b border-white/[0.08]">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <img src="/logo-icon.png" alt="BizzPal" className="w-9 h-8 object-contain transition-transform group-hover:scale-105" />
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

      <main className="max-w-3xl mx-auto px-6 py-16 space-y-10">
        <div className="space-y-4 border-b border-white/[0.08] pb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D9B44A]/10 border border-[#D9B44A]/25 text-[#D9B44A] text-xs font-semibold uppercase tracking-wider">
            {badge}
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">{title}</h1>
          <p className="text-base text-[#9CA3AF]">{subtitle}</p>
          <div className="text-sm text-[#9CA3AF] space-y-1 pt-2">
            {facts.map(f => <p key={f}>{withLinks(f)}</p>)}
          </div>
        </div>

        <div className="space-y-4">
          {intro.map(p => <p key={p} className="text-sm leading-relaxed text-[#9CA3AF]">{withLinks(p)}</p>)}
        </div>

        {sections.map(section => (
          <section key={section.title} className="space-y-4">
            <Title text={section.title} />
            {section.blocks.map((b, i) =>
              b.type === "p" ? (
                <p key={i} className="text-sm leading-relaxed text-[#9CA3AF]">{withLinks(b.text)}</p>
              ) : b.type === "h3" ? (
                <h3 key={i} className="text-base font-semibold text-[#D9B44A] pt-1">{b.text}</h3>
              ) : (
                <ul key={i} className="list-disc pl-5 text-sm leading-relaxed text-[#9CA3AF] space-y-1.5">
                  {b.items.map(item => <li key={item}>{withLinks(item)}</li>)}
                </ul>
              )
            )}
          </section>
        ))}
      </main>

      <footer className="border-t border-white/[0.08] py-8 text-center text-xs text-[#9CA3AF]">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/terms" className={current === "terms" ? "text-[#D9B44A] hover:underline" : "hover:text-white transition-colors"}>Terms &amp; Conditions</Link>
            <span>·</span>
            <Link href="/privacy" className={current === "privacy" ? "text-[#D9B44A] hover:underline" : "hover:text-white transition-colors"}>Privacy Policy</Link>
          </div>
          <div>BizzPal™ — Your AI Business Partner · bizzpal.ai</div>
        </div>
      </footer>
    </div>
  );
}

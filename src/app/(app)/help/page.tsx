"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface SavedQuestion {
  id: string;
  subject: string;
  category: string;
  message: string;
  at: string;
}

const SUPPORT_EMAIL = "sales@bizzpal.app";
const QUESTIONS_KEY = "bizzpal_support_questions";

const FAQS: FAQItem[] = [
  {
    id: "faq-1",
    question: "How is my cash runway calculated?",
    answer:
      "We divide the cash you have in the bank by your monthly net spending. For example, ₹12,00,000 in the bank and ₹1,50,000 spent a month gives 8.0 months. If runway falls below 6 months, it appears as a critical item in the Gap register.",
  },
  {
    id: "faq-2",
    question: "Can I change which sections appear on my Dashboard?",
    answer:
      "Yes. Open the Dashboard and choose Customize at the top. You can show or hide each section and pick whether it is half or full width, then save.",
  },
  {
    id: "faq-3",
    question: "Are all amounts shown in Indian rupees?",
    answer:
      "Yes. Every figure in the Dashboard, briefings, simulator and gap register uses rupees (₹) with Indian number formatting.",
  },
  {
    id: "faq-4",
    question: "How do the AI advisors give advice?",
    answer:
      "They answer using your business profile and the numbers you have entered, such as revenue, monthly costs, cash and team size. The more accurate your numbers, the more useful the advice. You can update them any time in Settings.",
  },
  {
    id: "faq-5",
    question: "How do I update my revenue, costs or team size?",
    answer:
      "Go to Settings → Business & account and change the figures, then save. The Dashboard, briefings and advisors use the new numbers straight away. You can also use Quick business input on the Dashboard.",
  },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<string | null>("faq-1");
  const [companyName, setCompanyName] = useState("");
  const [founderName, setFounderName] = useState("");
  const [saved, setSaved] = useState<SavedQuestion[]>([]);

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Dashboard & numbers");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      const profile = localStorage.getItem("bizzpal_business_profile");
      if (profile) {
        const p = JSON.parse(profile);
        if (p.name) setCompanyName(p.name);
        if (p.founderName) setFounderName(p.founderName);
      }
      const raw = localStorage.getItem(QUESTIONS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setSaved(parsed);
      }
    } catch {}
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    const entry: SavedQuestion = {
      id: `q-${Date.now()}`,
      subject: subject.trim(),
      category,
      message: message.trim(),
      at: new Date().toISOString(),
    };
    const next = [entry, ...saved].slice(0, 30);
    setSaved(next);
    try {
      localStorage.setItem(QUESTIONS_KEY, JSON.stringify(next));
    } catch {}

    // Opens the person's own email app, addressed to us
    const body = `${entry.message}\n\n—\n${founderName || "Founder"}${companyName ? `, ${companyName}` : ""}\nTopic: ${category}`;
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`[BizzPal help] ${entry.subject}`)}&body=${encodeURIComponent(body)}`;

    setNotice("Your email app should open with the message ready to send.");
    setSubject("");
    setMessage("");
    setTimeout(() => setNotice(null), 6000);
  };

  const filtered = FAQS.filter(
    f =>
      f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const inputClass =
    "w-full px-3 py-2.5 rounded-xl bg-surface border border-line text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-brass";

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold text-text">Help</h1>
          <p className="text-sm text-text-muted mt-1 leading-relaxed">
            Answers to common questions. If you can&apos;t find what you need, send us a message.
          </p>
        </div>
        <Link
          href="/chat"
          className="px-4 py-2 rounded-xl border border-line text-sm text-text hover:bg-surface-2 self-start"
        >
          Ask an AI advisor
        </Link>
      </div>

      {notice && <p className="px-4 py-3 rounded-xl bg-surface-2 text-sm text-text">{notice}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-3">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search help topics"
              aria-label="Search help topics"
              className={inputClass}
            />

            {filtered.length === 0 ? (
              <p className="text-sm text-text-muted py-4">No topics match your search.</p>
            ) : (
              <div className="rounded-2xl border border-line bg-surface shadow-sm divide-y divide-line overflow-hidden">
                {filtered.map(faq => {
                  const open = expandedFaq === faq.id;
                  return (
                    <div key={faq.id}>
                      <button
                        type="button"
                        onClick={() => setExpandedFaq(open ? null : faq.id)}
                        aria-expanded={open}
                        className="w-full text-left px-6 py-4 flex items-center justify-between gap-4 text-sm font-medium text-text hover:bg-surface-2/50 cursor-pointer"
                      >
                        <span>{faq.question}</span>
                        <ChevronDown className={`w-4 h-4 text-text-muted shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
                      </button>
                      {open && (
                        <p className="px-6 pb-5 text-sm text-text-muted leading-relaxed">{faq.answer}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {saved.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-text">Messages you&apos;ve started</h2>
              <ul className="rounded-2xl border border-line bg-surface shadow-sm divide-y divide-line">
                {saved.map(q => (
                  <li key={q.id} className="px-6 py-4">
                    <p className="text-sm font-medium text-text">{q.subject}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {q.category} · {new Date(q.at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    <p className="text-sm text-text-muted leading-relaxed mt-1.5 line-clamp-2">{q.message}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="lg:col-span-5">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-line bg-surface shadow-sm p-6 sm:p-7 space-y-5 lg:sticky lg:top-6"
          >
            <div>
              <h2 className="text-lg font-semibold text-text">Send us a message</h2>
              <p className="text-sm text-text-muted mt-1 leading-relaxed">
                This opens your email app with the message ready to send to {SUPPORT_EMAIL}.
              </p>
            </div>

            <div>
              <label className="text-sm text-text block mb-1.5">Subject</label>
              <input
                type="text"
                required
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Question about my runway number"
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-sm text-text block mb-1.5">Topic</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className={inputClass}>
                <option>Dashboard &amp; numbers</option>
                <option>Plans &amp; billing</option>
                <option>Decision simulator</option>
                <option>AI advisors</option>
                <option>Something else</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-text block mb-1.5">Message</label>
              <textarea
                rows={5}
                required
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Tell us what you need help with"
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer"
            >
              Write email
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

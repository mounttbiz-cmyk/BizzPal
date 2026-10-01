"use client";

import React, { useState, useEffect } from "react";
import {
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Send,
  LifeBuoy,
  FileQuestion,
  ExternalLink,
  Clock,
} from "lucide-react";
import Link from "next/link";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: "general" | "kpis" | "customization" | "ai";
}

interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  message: string;
  timestamp: string;
  status: "open" | "in_review" | "resolved";
}

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<string | null>("faq-1");
  const [companyName, setCompanyName] = useState("Your Enterprise");
  const [founderName, setFounderName] = useState("Executive Founder");

  // Form state
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketCategory, setTicketCategory] = useState("Dashboard & KPIs");
  const [ticketPriority, setTicketPriority] = useState<SupportTicket["priority"]>("medium");
  const [ticketMessage, setTicketMessage] = useState("");
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("bizzpal_business_profile");
      if (saved) {
        const p = JSON.parse(saved);
        if (p.name) setCompanyName(p.name);
        if (p.founderName) setFounderName(p.founderName);
      }

      const savedTickets = localStorage.getItem("bizzpal_support_tickets");
      if (savedTickets) {
        const parsed = JSON.parse(savedTickets);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTickets(parsed);
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const [tickets, setTickets] = useState<SupportTicket[]>([
    {
      id: "NRX-8410",
      subject: "Connecting INR payment gateway telemetry",
      category: "Billing & INR",
      priority: "medium",
      message: "How can we stream live INR transactional collections into our monthly net burn calculations?",
      timestamp: "Yesterday",
      status: "in_review",
    },
  ]);

  const faqs: FAQItem[] = [
    {
      id: "faq-1",
      question: "How does BizzPal calculate our real Cash Runway and Solvency Health?",
      answer: "BizzPal divides your liquid Cash on Hand (in INR ₹) by your Monthly Net Operating Burn. If liquid reserves are ₹12,00,000 and monthly net burn is ₹1,50,000, your verified runway is 8.0 months. If runway falls under 6.0 months, the system triggers the Layer 1 Solvency Safeguard Protocol.",
      category: "kpis",
    },
    {
      id: "faq-2",
      question: "Can I customize the Dashboard widgets and rearrange cards?",
      answer: "Yes! Click 'Customize Dashboard' in the left side panel or on the top right of your Dashboard. You can toggle widgets on/off and resize widget grid spans (1 to 4 columns) to match your workflow, then save your layout.",
      category: "customization",
    },
    {
      id: "faq-3",
      question: "Is all business data formatted in Indian Rupees (INR ₹)?",
      answer: "Yes, BizzPal is calibrated for Indian businesses. All figures across your dashboard, executive briefings, simulator, and gap registers are expressed in INR (₹) using standard Indian currency notation.",
      category: "general",
    },
    {
      id: "faq-4",
      question: "How do Astra (CEO AI) and Marcus (CFO AI) generate strategic advice?",
      answer: "Astra and Marcus synthesize deterministic rules with your live company numbers. Astra focuses on growth, client concentration, and organizational bottlenecks, while Marcus conducts capital audits, runway analysis, and unit economic checks.",
      category: "ai",
    },
    {
      id: "faq-5",
      question: "How can I update our company fundamentals (revenue, burn, team size)?",
      answer: "You can re-calibrate your metrics at any time by revisiting Onboarding or updating your Business Profile. Your dashboard cards and AI executive context update dynamically.",
      category: "general",
    },
  ];

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;

    const newTicket: SupportTicket = {
      id: `NRX-${Math.floor(1000 + Math.random() * 9000)}`,
      subject: ticketSubject.trim(),
      category: ticketCategory,
      priority: ticketPriority,
      message: ticketMessage.trim(),
      timestamp: "Just now",
      status: "open",
    };

    setTickets(prev => {
      const updated = [newTicket, ...prev];
      try {
        localStorage.setItem("bizzpal_support_tickets", JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });

    setSuccessNotice(`Ticket #${newTicket.id} created successfully! Our executive desk is reviewing your question.`);
    setTicketSubject("");
    setTicketMessage("");
    setTimeout(() => setSuccessNotice(null), 5000);
  };

  const filteredFaqs = faqs.filter(
    f =>
      f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brass-soft flex items-center justify-center text-brass">
              <LifeBuoy className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-text">Help & Support Center</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brass-soft text-brass font-bold uppercase tracking-wider">
                  24/7 Executive Desk
                </span>
              </div>
              <p className="text-xs text-text-muted mt-1 font-medium">
                Find answers to common platform questions, troubleshoot integration telemetry, or consult directly with senior enterprise engineering.
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/chat"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-surface-2 border border-line text-xs font-semibold text-text hover:border-brass btn-tactile self-start sm:self-auto"
        >
          <MessageSquare className="w-3.5 h-3.5 text-brass" />
          <span>Ask Executive AI Directly</span>
        </Link>
      </div>

      {successNotice && (
        <div className="p-3.5 rounded-xl bg-brass-soft border border-brass/30 text-xs font-medium text-brass flex items-center gap-2.5 animate-fade-in shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-brass shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Main Grid: FAQs & Raise Question Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: FAQs (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-text uppercase tracking-wider">
              Frequently Asked Questions ({filteredFaqs.length})
            </h2>
          </div>

          {/* FAQ Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search help topics, runway formulas, INR settings…"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface border border-line text-xs text-text placeholder:text-text-muted focus:ring-1 focus:ring-brass"
            />
          </div>

          {/* Accordion list */}
          <div className="space-y-2.5">
            {filteredFaqs.map(faq => {
              const isExpanded = expandedFaq === faq.id;
              return (
                <div
                  key={faq.id}
                  className="rounded-xl border border-line bg-surface overflow-hidden shadow-theme transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(isExpanded ? null : faq.id)}
                    className="w-full text-left p-4 flex items-center justify-between gap-3 text-xs font-bold text-text hover:bg-surface-2/50 transition-colors cursor-pointer"
                  >
                    <span>{faq.question}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-brass shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 text-xs text-text-muted leading-relaxed border-t border-line/60 bg-surface-2/20">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Recent Tickets History */}
          <div className="pt-4 space-y-3">
            <h3 className="text-xs font-bold text-text uppercase tracking-wider">
              Your Raised Questions & Inquiries ({tickets.length})
            </h3>

            <div className="space-y-2">
              {tickets.map(ticket => (
                <div
                  key={ticket.id}
                  className="p-3.5 rounded-xl border border-line bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-theme"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-brass">
                        {ticket.id}
                      </span>
                      <span className="text-xs font-bold text-text">{ticket.subject}</span>
                    </div>
                    <p className="text-[11px] text-text-muted line-clamp-1">{ticket.message}</p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface-2 border border-line text-text-muted uppercase font-bold">
                      {ticket.priority}
                    </span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-bold uppercase">
                      {ticket.status === "in_review" ? "Under Review" : "Open"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Raise a Question Form (5 cols) */}
        <div className="lg:col-span-5">
          <div className="p-5 sm:p-6 rounded-2xl border border-line bg-surface shadow-theme space-y-4 sticky top-6">
            <div className="pb-3 border-b border-line space-y-1">
              <div className="flex items-center gap-2">
                <FileQuestion className="w-4 h-4 text-brass" />
                <h3 className="text-sm font-bold text-text">Raise a Question / Support Request</h3>
              </div>
              <p className="text-[11px] text-text-muted">
                Our support and advisory team will answer with tailored operational guidance.
              </p>
            </div>

            <form onSubmit={handleTicketSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-text mb-1 flex items-center">
                  <span>Question Subject</span>
                  <span className="text-rust font-bold ml-1">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={ticketSubject}
                  onChange={e => setTicketSubject(e.target.value)}
                  placeholder="e.g. Inquiring about CAC payback modeling in INR"
                  className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-line text-text focus:ring-1 focus:ring-brass"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-text block mb-1">Category</label>
                  <select
                    value={ticketCategory}
                    onChange={e => setTicketCategory(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg bg-surface-2 border border-line text-text focus:ring-1 focus:ring-brass text-xs"
                  >
                    <option value="Dashboard & KPIs">Dashboard & KPIs</option>
                    <option value="Billing & INR">Billing & Currency (INR)</option>
                    <option value="Decision Simulator">Decision Simulator</option>
                    <option value="Executive AI Chat">Executive AI Chat</option>
                    <option value="General Question">General Question</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-text block mb-1">Priority</label>
                  <select
                    value={ticketPriority}
                    onChange={e => setTicketPriority(e.target.value as any)}
                    className="w-full px-2.5 py-2 rounded-lg bg-surface-2 border border-line text-text focus:ring-1 focus:ring-brass text-xs"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Normal / Medium</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-text mb-1 flex items-center">
                  <span>Detailed Question / Details</span>
                  <span className="text-rust font-bold ml-1">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={ticketMessage}
                  onChange={e => setTicketMessage(e.target.value)}
                  placeholder="Explain your question, challenge, or required assistance in detail..."
                  className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-line text-text focus:ring-1 focus:ring-brass text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-brass text-white text-xs font-bold shadow-md hover:brightness-110 btn-tactile cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Question to Executive Support</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

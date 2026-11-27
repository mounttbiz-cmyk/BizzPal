"use client";

import React, { useState, useEffect } from "react";
import { X, Send, BrainCircuit, Tag, Maximize2, Minimize2, MessageSquare } from "lucide-react";
import { AgentAvatarIcon } from "@/components/chat/CustomizeAdvisorModal";

export interface ContextChip {
  id: string;
  label: string;
  type: "metric" | "gap" | "scenario" | "page" | "task";
  payload?: any;
}

interface ChatDockProps {
  isOpen: boolean;
  onClose: () => void;
  activeContextChips?: ContextChip[];
  onRemoveChip?: (chipId: string) => void;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ceo" | "cfo";
  senderName: string;
  role: string;
  avatar: string;
  content: string;
  timestamp: string;
  provenance?: "from_data" | "benchmark" | "estimate";
  situation?: string;
  analysis?: string;
  recommendation?: string;
  risks?: string;
  opportunities?: string;
  nextSteps?: string[];
  actionTaken?: string;
}

export function ChatDock({
  isOpen,
  onClose,
  activeContextChips = [],
  onRemoveChip,
}: ChatDockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg_1",
      sender: "ceo",
      senderName: "CEO",
      role: "Chief Executive Officer",
      avatar: "Briefcase",
      content: "Hello. Ask me about your business and I will answer using the details and documents you have added to BizzPal.",
      timestamp: "",
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [ceoName, setCeoName] = useState("CEO");
  const [cfoName, setCfoName] = useState("CFO");

  useEffect(() => {
    const syncAdvisors = () => {
      try {
        const raw = localStorage.getItem("bizzpal_custom_advisors");
        if (raw) {
          const parsed = JSON.parse(raw);
          const cName = parsed.ceo?.name && parsed.ceo.name.toLowerCase() !== "astra" ? parsed.ceo.name : "CEO";
          const fName = parsed.cfo?.name && parsed.cfo.name.toLowerCase() !== "marcus" ? parsed.cfo.name : "CFO";
          setCeoName(cName);
          setCfoName(fName);
          setMessages(prev =>
            prev.map(m => (m.id === "msg_1" ? { ...m, senderName: cName } : m))
          );
          return;
        }
      } catch {}
    };
    syncAdvisors();
    window.addEventListener("bizzpal_advisors_updated", syncAdvisors);
    window.addEventListener("storage", syncAdvisors);
    return () => {
      window.removeEventListener("bizzpal_advisors_updated", syncAdvisors);
      window.removeEventListener("storage", syncAdvisors);
    };
  }, []);

  // Keyboard shortcuts: Escape to close when open, ⌘J or Ctrl+J to toggle dock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "j" || e.key === "J")) {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: "user",
      senderName: "You",
      role: "Founder / Operator",
      avatar: "👤",
      content: input,
      timestamp: "Just now",
    };

    setMessages(prev => [...prev, userMsg]);
    const question = input;
    setInput("");
    setIsStreaming(true);

    // Parse @mention advisor routing (supports @ceo, @cfo, @marketing, @sales, @hr, @operations, @strategy)
    const mentionMatch = question.match(/@(ceo|cfo|marketing|sales|hr|operations|strategy)\b/i);
    const targetAgentId = mentionMatch ? mentionMatch[1].toLowerCase() : "cfo";
    const chipContext =
      activeContextChips.length > 0
        ? `\n\n[Active Workspace Context: ${activeContextChips.map(c => c.label).join(" · ")}]`
        : "";

    (async () => {
      try {
        let profile = {};
        try {
          const stored = localStorage.getItem("bizzpal_business_profile");
          if (stored) profile = JSON.parse(stored);
        } catch {}

        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `${question}${chipContext}`,
            agentId: targetAgentId,
            companyProfile: profile,
            email: (() => { try { return JSON.parse(localStorage.getItem("bizzpal_user_session") || "{}")?.email || ""; } catch { return ""; } })(),
          }),
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok && data.success && data.text) {
          const replyMsg: ChatMessage = {
            id: `ai_${Date.now()}`,
            sender: targetAgentId === "ceo" ? "ceo" : "cfo",
            senderName: data.agent || (targetAgentId === "ceo" ? ceoName : targetAgentId === "cfo" ? cfoName : targetAgentId.toUpperCase()),
            role: data.role || targetAgentId.toUpperCase(),
            avatar: targetAgentId === "ceo" ? "Briefcase" : "BarChart3",
            content: data.text,
            timestamp: "Just now",
            provenance: data.grounding?.factCount ? "from_data" : undefined,
          };
          setMessages(prev => [...prev, replyMsg]);
        } else {
          const errorDetail = data?.error || (res.status === 401 ? "Please sign in again to continue." : "AI advisor could not respond right now.");
          setMessages(prev => [
            ...prev,
            {
              id: `err_${Date.now()}`,
              sender: "cfo",
              senderName: "BizzPal",
              role: "System Notice",
              avatar: "AlertCircle",
              content: errorDetail,
              timestamp: "Just now",
            },
          ]);
        }
      } catch {
        setMessages(prev => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            sender: "cfo",
            senderName: "BizzPal",
            role: "Connection Error",
            avatar: "AlertCircle",
            content: "Could not reach the AI advisor service. Check your connection and try again.",
            timestamp: "Just now",
          },
        ]);
      } finally {
        setIsStreaming(false);
      }
    })();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-label="AI Executive Team Chat"
      className={`fixed inset-y-0 right-0 z-50 flex bg-surface border-l border-line shadow-2xl flex-col transition-all duration-300 ease-in-out ${
        isExpanded ? "w-full inset-x-0" : "w-full md:w-[500px] lg:w-[480px]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] border-b border-line bg-surface">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-brass/15 text-brass flex items-center justify-center font-bold text-xs">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-xs text-text flex items-center gap-1.5">
              <span>Executive Team AI</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-jade/15 text-jade font-semibold">
                Online
              </span>
            </div>
            <div className="text-[10px] text-text-muted">{ceoName} (CEO) & {cfoName} (CFO)</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface-2 btn-tactile cursor-pointer"
            title={isExpanded ? "Collapse to side panel" : "Extend to full screen"}
            aria-label={isExpanded ? "Collapse to side panel" : "Extend to full screen"}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface-2 btn-tactile cursor-pointer"
            aria-label="Close AI Workspace"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Visible Context Chips above chat (§11.2) */}
      {activeContextChips.length > 0 && (
        <div className="px-3 py-1.5 bg-surface-2/70 border-b border-line flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-[10px] uppercase font-semibold text-text-muted">Context:</span>
          {activeContextChips.map(chip => (
            <span
              key={chip.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-surface border border-line text-text"
            >
              <Tag className="w-2.5 h-2.5 text-brass" />
              <span>{chip.label}</span>
              {onRemoveChip && (
                <button
                  type="button"
                  onClick={() => onRemoveChip(chip.id)}
                  className="text-text-muted hover:text-rust ml-0.5"
                  title="Remove context chip"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => {
          const isUser = msg.sender === "user";
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1`}
            >
              <div className="flex items-center gap-1.5 text-[10px] text-text-muted px-1">
                <AgentAvatarIcon iconName={msg.avatar} className="w-3.5 h-3.5 text-brass" />
                <span className="font-semibold text-text">{msg.sender === "ceo" ? ceoName : (msg.sender === "cfo" ? cfoName : msg.senderName)}</span>
                <span>({msg.role})</span>
                <span>· {msg.timestamp}</span>
                {msg.provenance && (
                  <span className="ml-1 text-[9px] px-1 rounded bg-jade/10 text-jade border border-jade/30">
                    From Data
                  </span>
                )}
              </div>

              <div
                className={`p-3.5 rounded-xl text-xs max-w-[95%] border ${
                  isUser
                    ? "bg-brass text-white border-brass font-medium"
                    : "bg-surface-2 border-line text-text"
                }`}
              >
                <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          );
        })}

        {isStreaming && (
          <div className="flex items-center gap-2 text-xs text-text-muted p-2 rounded-lg bg-surface-2 animate-pulse">
            <BrainCircuit className="w-4 h-4 text-brass animate-pulse" />
            <span>Consulting {cfoName} and verifying active ledger metrics…</span>
          </div>
        )}
      </div>



      {/* Composer */}
      <form onSubmit={handleSend} className="p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] border-t border-line bg-surface">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask your executive team (e.g. @cfo runway impact)..."
            className="w-full text-base sm:text-xs pl-3 pr-10 py-2.5 rounded-lg border border-line bg-surface-2 text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brass"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="absolute right-1.5 p-1.5 rounded-md bg-brass text-white disabled:opacity-40 btn-tactile"
            aria-label="Send message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}

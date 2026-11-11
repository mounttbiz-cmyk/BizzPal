"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function ChatMarkdown({ content }: { content: string }) {
  return (
    <div className="chat-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-text">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1.5 last:mb-0">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1.5 last:mb-0">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          h1: ({ children }) => <h1 className="text-base font-semibold text-text mt-3 mb-2 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-semibold text-text mt-3 mb-1.5 first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-medium text-text mt-2.5 mb-1 first:mt-0">{children}</h3>,
          code: ({ children }) => (
            <code className="px-1 py-0.5 rounded bg-surface border border-line font-mono text-[10.5px]">{children}</code>
          ),
          pre: ({ children }) => (
            <pre className="p-2.5 rounded-lg bg-surface border border-line overflow-x-auto mb-2.5 last:mb-0">{children}</pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-brass/50 pl-3 italic text-text-muted mb-2.5 last:mb-0">
              {children}
            </blockquote>
          ),
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-brass underline hover:no-underline">
              {children}
            </a>
          ),
          hr: () => <hr className="my-3 border-line" />,
          table: ({ children }) => (
            <div className="overflow-x-auto mb-2.5 last:mb-0 rounded-lg border border-line">
              <table className="w-full text-left border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-surface">{children}</thead>,
          th: ({ children }) => (
            <th className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-text-muted border-b border-line">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-2.5 py-1.5 align-top border-b border-line last:border-b-0">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

import React from "react";

interface ToolLogoProps {
  toolId: string;
  className?: string;
  size?: number;
}

export function ToolLogo({ toolId, className = "", size = 24 }: ToolLogoProps) {
  const pixelSize = `${size}px`;

  switch (toolId) {
    case "google":
    case "google_workspace":
      // Official Google 4-Color 'G' Logo
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 rounded-lg bg-surface border border-line p-1 shadow-sm ${className}`}
        >
          <path
            d="M32.56 20.25c0-.78-.07-1.53-.2-2.25H20v4.26h7.05c-.3 1.63-1.24 3.01-2.63 3.94v3.29h4.25c2.49-2.29 3.89-5.67 3.89-9.24z"
            fill="#4285F4"
          />
          <path
            d="M20 33c3.51 0 6.46-1.16 8.61-3.15l-4.25-3.29c-1.18.79-2.69 1.26-4.36 1.26-3.35 0-6.19-2.26-7.2-5.31H8.38v3.39C10.53 30.16 14.93 33 20 33z"
            fill="#34A853"
          />
          <path
            d="M12.8 22.51c-.26-.78-.4-1.61-.4-2.51s.14-1.73.4-2.51V14.1H8.38A12.98 12.98 0 0 0 7 20c0 2.09.5 4.07 1.38 5.9l4.42-3.39z"
            fill="#FBBC05"
          />
          <path
            d="M20 12.18c1.91 0 3.63.66 4.98 1.94l3.73-3.73C26.45 8.31 23.51 7 20 7 14.93 7 10.53 9.84 8.38 14.1l4.42 3.39c1.01-3.05 3.85-5.31 7.2-5.31z"
            fill="#EA4335"
          />
        </svg>
      );

    case "microsoft":
    case "microsoft_365":
      // Official Microsoft 4-Color Quadrant Logo
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 rounded-lg bg-surface border border-line p-1 shadow-sm ${className}`}
        >
          <rect x="7" y="7" width="12" height="12" rx="1.5" fill="#F25022" />
          <rect x="21" y="7" width="12" height="12" rx="1.5" fill="#7FBA00" />
          <rect x="7" y="21" width="12" height="12" rx="1.5" fill="#00A4EF" />
          <rect x="21" y="21" width="12" height="12" rx="1.5" fill="#FFB900" />
        </svg>
      );

    case "linkedin":
    case "linkedin_company":
      // Official LinkedIn Brand Logo
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 rounded-lg shadow-sm ${className}`}
        >
          <rect width="40" height="40" rx="8" fill="#0A66C2" />
          <path
            d="M14.6 13.8a2.3 2.3 0 1 1-4.6 0 2.3 2.3 0 0 1 4.6 0zM10.3 17.5h4v12.2h-4V17.5zm6.3 0h3.8v1.7h.1c.5-1 1.9-2.1 3.8-2.1 4.1 0 4.8 2.7 4.8 6.2v6.4h-4v-5.7c0-1.4 0-3.1-1.9-3.1-1.9 0-2.2 1.5-2.2 3v5.8h-4V17.5z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case "meta":
    case "meta_business":
    case "facebook":
      // Official Meta Infinity Logo
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 rounded-lg bg-[#0064E0] p-1 shadow-sm ${className}`}
        >
          <path
            d="M20 23.3c-2.3 3.3-4.5 5.2-7.1 5.2-4.2 0-7.4-3.5-7.4-8.5s3.2-8.5 7.4-8.5c2.6 0 4.8 1.9 7.1 5.2 2.3-3.3 4.5-5.2 7.1-5.2 4.2 0 7.4 3.5 7.4 8.5s-3.2 8.5-7.4 8.5c-2.6 0-4.8-1.9-7.1-5.2zm-7.1 2.3c2.4 0 4.3-2.1 5.7-4.8l-1.3-1.8c-1.2 2-2.7 3.5-4.4 3.5-2.2 0-4-2-4-5.4 0-3.4 1.8-5.4 4-5.4 1.7 0 3.2 1.5 4.4 3.5l1.3-1.8c-1.4-2.7-3.3-4.8-5.7-4.8-4.1 0-7 3.7-7 8.5s2.9 8.5 7 8.5zm14.2 0c4.1 0 7-3.7 7-8.5s-2.9-8.5-7-8.5c-2.4 0-4.3 2.1-5.7 4.8l1.3 1.8c1.2-2 2.7-3.5 4.4-3.5 2.2 0 4 2 4 5.4 0 3.4-1.8 5.4-4 5.4-1.7 0-3.2-1.5-4.4-3.5l-1.3 1.8c1.4 2.7 3.3 4.8 5.7 4.8z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case "stripe":
      // Official Stripe Logo Glyph
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 rounded-lg shadow-sm ${className}`}
        >
          <rect width="40" height="40" rx="8" fill="#635BFF" />
          <path
            d="M26.2 19.3c0-2.3-1.6-3.7-4.7-4.4l-1.8-.4c-1.3-.3-1.8-.7-1.8-1.3 0-.7.7-1.2 2-1.2 1.6 0 3.2.5 4.3 1.2l.9-3.2c-1.3-.7-3.1-1.1-5.1-1.1-4 0-6.7 2.1-6.7 5.5 0 2.2 1.5 3.5 4.6 4.3l1.8.4c1.4.4 2 .8 2 1.5 0 .8-.9 1.3-2.2 1.3-1.8 0-3.7-.7-5.1-1.6l-1 3.3c1.6 1 3.7 1.6 6 1.6 4.2 0 7.1-2 7.1-5.6z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case "slack":
      // Official Slack 4-Color Octothorpe
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 rounded-lg bg-surface border border-line p-1 shadow-sm ${className}`}
        >
          {/* Blue top-left */}
          <path
            d="M14.5 21a2.5 2.5 0 1 1-2.5-2.5h2.5V21zm1.2 0a2.5 2.5 0 0 1 5 0v6.2a2.5 2.5 0 0 1-5 0V21z"
            fill="#36C5F0"
          />
          {/* Green top-right */}
          <path
            d="M19 14.5a2.5 2.5 0 1 1-2.5-2.5V14.5zm0 1.2a2.5 2.5 0 0 1 0 5h6.2a2.5 2.5 0 0 1 0-5H19z"
            fill="#2EB67D"
          />
          {/* Yellow bottom-right */}
          <path
            d="M25.5 19a2.5 2.5 0 1 1 2.5 2.5h-2.5V19zm-1.2 0a2.5 2.5 0 0 1-5 0v-6.2a2.5 2.5 0 0 1 5 0V19z"
            fill="#ECB22E"
          />
          {/* Red bottom-left */}
          <path
            d="M21 25.5a2.5 2.5 0 1 1 2.5 2.5V25.5zm0-1.2a2.5 2.5 0 0 1 0-5h-6.2a2.5 2.5 0 0 1 0 5H21z"
            fill="#E01E5A"
          />
        </svg>
      );

    case "zoho_books":
    case "zoho":
    case "quickbooks":
      // Authentic Zoho Multi-tile / Accounting icon
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 rounded-lg bg-surface border border-line p-1 shadow-sm ${className}`}
        >
          <rect x="6" y="8" width="12" height="11" rx="2.5" fill="#E42528" />
          <rect x="22" y="8" width="12" height="11" rx="2.5" fill="#2BA342" />
          <rect x="6" y="21" width="12" height="11" rx="2.5" fill="#0C77B9" />
          <rect x="22" y="21" width="12" height="11" rx="2.5" fill="#F4901E" />
          <path d="M12 13h4M12 26h4M28 13h4M28 26h4" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case "google_calendar":
      // Official Google Calendar 4-color Icon with 31
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 rounded-lg bg-surface border border-line p-0.5 shadow-sm ${className}`}
        >
          <rect x="6" y="6" width="28" height="28" rx="6" fill="#FFFFFF" />
          {/* Google colors border ribbon */}
          <path d="M6 12h28V8a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v4z" fill="#4285F4" />
          <path d="M6 12v18a2 2 0 0 0 2 2h4V12H6z" fill="#34A853" />
          <path d="M28 32h4a2 2 0 0 0 2-2V12h-6v20z" fill="#EA4335" />
          <path d="M12 32h16v-6H12v6z" fill="#FBBC05" />
          {/* Day 31 text */}
          <text
            x="20"
            y="25"
            textAnchor="middle"
            fill="#1A73E8"
            fontSize="12"
            fontWeight="bold"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            31
          </text>
        </svg>
      );

    case "help_desk":
    case "zendesk":
    case "freshdesk":
      // Authentic Zendesk geometric logo
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 rounded-lg bg-[#03363D] p-1.5 shadow-sm ${className}`}
        >
          {/* Top-left semi-circle */}
          <path d="M10 20a10 10 0 0 1 10-10v10H10z" fill="#17494D" />
          {/* Bottom-left triangle */}
          <path d="M10 20h10v10L10 20z" fill="#E8F4E8" />
          {/* Top-right triangle */}
          <path d="M20 10h10L20 20V10z" fill="#E8F4E8" />
          {/* Bottom-right semi-circle */}
          <path d="M20 20h10a10 10 0 0 1-10 10V20z" fill="#03363D" />
          <circle cx="25" cy="15" r="4" fill="#69C99E" />
          <circle cx="15" cy="25" r="4" fill="#69C99E" />
        </svg>
      );

    case "none":
    default:
      return (
        <div
          style={{ width: pixelSize, height: pixelSize }}
          className={`rounded-lg bg-surface-2 border border-line flex items-center justify-center text-text-muted shadow-sm ${className}`}
        >
          <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
            <path d="M4.93 4.93l14.14 14.14" strokeWidth="2" />
          </svg>
        </div>
      );
  }
}

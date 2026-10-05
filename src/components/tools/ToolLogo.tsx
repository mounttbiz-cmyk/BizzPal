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
          className={`shrink-0 ${className}`}
        >
          <path
            d="M31.64 20.2c0-.7-.06-1.37-.17-2.02H20v3.82h6.53c-.28 1.48-1.12 2.73-2.38 3.58v2.98h3.85c2.25-2.07 3.64-5.12 3.64-8.36z"
            fill="#4285F4"
          />
          <path
            d="M20 32c3.24 0 5.96-1.07 7.95-2.91l-3.85-2.98c-1.08.72-2.45 1.15-4.1 1.15-3.15 0-5.82-2.13-6.77-5H9.25v3.08C11.23 29.28 15.34 32 20 32z"
            fill="#34A853"
          />
          <path
            d="M13.23 22.26c-.25-.72-.39-1.49-.39-2.26s.14-1.54.39-2.26V14.66H9.25C8.45 16.26 8 18.08 8 20s.45 3.74 1.25 5.34l3.98-3.08z"
            fill="#FBBC05"
          />
          <path
            d="M20 12.01c1.76 0 3.35.61 4.59 1.79l3.44-3.44C25.95 8.42 23.23 7.33 20 7.33 15.34 7.33 11.23 10.05 9.25 14.66l3.98 3.08c.95-2.87 3.62-5.73 6.77-5.73z"
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
          className={`shrink-0 ${className}`}
        >
          <rect x="7" y="7" width="12" height="12" rx="1" fill="#F25022" />
          <rect x="21" y="7" width="12" height="12" rx="1" fill="#7FBA00" />
          <rect x="7" y="21" width="12" height="12" rx="1" fill="#00A4EF" />
          <rect x="21" y="21" width="12" height="12" rx="1" fill="#FFB900" />
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
          className={`shrink-0 rounded-lg shadow-xs ${className}`}
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
          className={`shrink-0 rounded-lg shadow-xs ${className}`}
        >
          <rect width="40" height="40" rx="8" fill="#0064E0" />
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
          className={`shrink-0 rounded-lg shadow-xs ${className}`}
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
          className={`shrink-0 ${className}`}
        >
          <path
            d="M14.5 21a2.5 2.5 0 1 1-2.5-2.5h2.5V21zm1.2 0a2.5 2.5 0 0 1 5 0v6.2a2.5 2.5 0 0 1-5 0V21z"
            fill="#36C5F0"
          />
          <path
            d="M19 14.5a2.5 2.5 0 1 1-2.5-2.5V14.5zm0 1.2a2.5 2.5 0 0 1 0 5h6.2a2.5 2.5 0 0 1 0-5H19z"
            fill="#2EB67D"
          />
          <path
            d="M25.5 19a2.5 2.5 0 1 1 2.5 2.5h-2.5V19zm-1.2 0a2.5 2.5 0 0 1-5 0v-6.2a2.5 2.5 0 0 1 5 0V19z"
            fill="#ECB22E"
          />
          <path
            d="M21 25.5a2.5 2.5 0 1 1 2.5 2.5V25.5zm0-1.2a2.5 2.5 0 0 1 0-5h-6.2a2.5 2.5 0 0 1 0 5H21z"
            fill="#E01E5A"
          />
        </svg>
      );

    case "zoho_books":
    case "zoho":
    case "quickbooks":
      // Official Zoho Logo: 4 Distinct Colorful Blocks with Z, O, H, O
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 ${className}`}
        >
          {/* Red Z block */}
          <rect x="6" y="8" width="12" height="11" rx="2" fill="#E42528" />
          <text x="12" y="16.5" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold" fontFamily="sans-serif">Z</text>
          {/* Green O block */}
          <rect x="22" y="8" width="12" height="11" rx="2" fill="#2BA342" />
          <text x="28" y="16.5" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold" fontFamily="sans-serif">O</text>
          {/* Blue H block */}
          <rect x="6" y="21" width="12" height="11" rx="2" fill="#0C77B9" />
          <text x="12" y="29.5" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold" fontFamily="sans-serif">H</text>
          {/* Yellow O block */}
          <rect x="22" y="21" width="12" height="11" rx="2" fill="#F4901E" />
          <text x="28" y="29.5" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold" fontFamily="sans-serif">O</text>
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
          className={`shrink-0 ${className}`}
        >
          <rect x="6" y="6" width="28" height="28" rx="6" fill="#FFFFFF" />
          <path d="M6 12h28V8a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v4z" fill="#4285F4" />
          <path d="M6 12v18a2 2 0 0 0 2 2h4V12H6z" fill="#34A853" />
          <path d="M28 32h4a2 2 0 0 0 2-2V12h-6v20z" fill="#EA4335" />
          <path d="M12 32h16v-6H12v6z" fill="#FBBC05" />
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
      // Official Zendesk Logo: Iconic Dark-Green & Mint-Green Geometric Shape
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 rounded-lg shadow-xs ${className}`}
        >
          <rect width="40" height="40" rx="8" fill="#03363D" />
          {/* Top-left semi-circle */}
          <path d="M11 20a9 9 0 0 1 9-9v9H11z" fill="#17494D" />
          {/* Bottom-left triangle */}
          <path d="M11 20h9v9L11 20z" fill="#E8F4E8" />
          {/* Top-right triangle */}
          <path d="M20 11h9L20 20V11z" fill="#E8F4E8" />
          {/* Bottom-right semi-circle */}
          <path d="M20 20h9a9 9 0 0 1-9 9V20z" fill="#17494D" />
          <circle cx="24.5" cy="15.5" r="3.2" fill="#69C99E" />
          <circle cx="15.5" cy="24.5" r="3.2" fill="#69C99E" />
        </svg>
      );

    case "none":
    default:
      return (
        <div
          style={{ width: pixelSize, height: pixelSize }}
          className={`rounded-lg bg-surface-2 border border-line flex items-center justify-center text-text-muted shadow-xs ${className}`}
        >
          <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
            <path d="M4.93 4.93l14.14 14.14" strokeWidth="2" />
          </svg>
        </div>
      );
  }
}

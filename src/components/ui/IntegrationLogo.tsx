import React from "react";

export function IntegrationLogo({ id, className = "w-7 h-7" }: { id: string; className?: string }) {
  switch (id) {
    case "google":
    case "google_workspace":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            fill="#EA4335"
          />
        </svg>
      );

    case "microsoft":
    case "microsoft_365":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <rect x="1" y="1" width="10" height="10" rx="1" fill="#F25022" />
          <rect x="13" y="1" width="10" height="10" rx="1" fill="#7FBA00" />
          <rect x="1" y="13" width="10" height="10" rx="1" fill="#00A4EF" />
          <rect x="13" y="13" width="10" height="10" rx="1" fill="#FFB900" />
        </svg>
      );

    case "linkedin":
    case "linkedin_company":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="5" fill="#0A66C2" />
          <path
            d="M8.8 8.3a1.4 1.4 0 1 1-2.8 0 1.4 1.4 0 0 1 2.8 0zM6.2 10.5h2.4V18H6.2v-7.5zm3.8 0h2.3v1h.1c.3-.6 1.1-1.2 2.3-1.2 2.5 0 2.9 1.6 2.9 3.7V18h-2.4v-3.4c0-.8 0-1.9-1.1-1.9-1.1 0-1.3.9-1.3 1.8V18H10v-7.5z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case "meta":
    case "meta_business":
    case "facebook":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="5" fill="#0064E0" />
          <path
            d="M12 14c-1.4 2-2.7 3.1-4.3 3.1-2.5 0-4.4-2.1-4.4-5.1s1.9-5.1 4.4-5.1c1.6 0 2.9 1.1 4.3 3.1 1.4-2 2.7-3.1 4.3-3.1 2.5 0 4.4 2.1 4.4 5.1s-1.9 5.1-4.4 5.1c-1.6 0-2.9-1.1-4.3-3.1zm-4.3 1.4c1.4 0 2.6-1.3 3.4-2.9l-.8-1.1c-.7 1.2-1.6 2.1-2.6 2.1-1.3 0-2.4-1.2-2.4-3.2 0-2 1.1-3.2 2.4-3.2 1 0 1.9.9 2.6 2.1l.8-1.1c-.8-1.6-2-2.9-3.4-2.9-2.5 0-4.2 2.2-4.2 5.1s1.7 5.2 4.2 5.2zm8.6 0c2.5 0 4.2-2.2 4.2-5.1s-1.7-5.1-4.2-5.1c-1.4 0-2.6 1.3-3.4 2.9l.8 1.1c.7-1.2 1.6-2.1 2.6-2.1 1.3 0 2.4 1.2 2.4 3.2 0 2-1.1 3.2-2.4 3.2-1 0-1.9-.9-2.6-2.1l-.8 1.1c.8 1.6 2 2.9 3.4 2.9z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case "slack":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.528 2.528 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A" />
          <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0" />
          <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D" />
          <path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.528 2.528 0 0 1 2.52-2.52h6.313A2.528 2.528 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E" />
        </svg>
      );

    case "zoom":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#2D8CFF" />
          <path
            d="M4.5 8C4.5 6.89543 5.39543 6 6.5 6H13.5C14.6046 6 15.5 6.89543 15.5 8V16C15.5 17.1046 14.6046 18 13.5 18H6.5C5.39543 18 4.5 17.1046 4.5 16V8Z"
            fill="white"
          />
          <path
            d="M16.5 10.3L19.5 8.2V15.8L16.5 13.7V10.3Z"
            fill="white"
          />
        </svg>
      );

    case "whatsapp":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="12" fill="#25D366" />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12.04 4C7.6 4 4 7.6 4 12.04c0 1.54.44 2.98 1.2 4.22L4 20.2l4.08-1.18a7.99 7.99 0 0 0 3.96 1.02c4.44 0 8.04-3.6 8.04-8.04 0-4.44-3.6-8-8.04-8zm4.72 11.36c-.2.56-1.16 1.08-1.6 1.12-.42.04-.96.06-1.54-.14-.38-.12-.86-.28-1.48-.56-2.6-1.14-4.3-3.78-4.44-3.96-.12-.18-1.06-1.42-1.06-2.7 0-1.28.66-1.92.9-2.18.24-.26.52-.32.7-.32.18 0 .36 0 .52.02.16.02.38-.06.6.46.22.54.76 1.86.82 2 .06.14.1.3.02.48-.08.18-.12.3-.24.44-.12.14-.26.32-.38.44-.12.12-.24.26-.1.5.14.24.62 1.02 1.34 1.66.92.82 1.7 1.08 1.94 1.2.24.12.38.1.52-.06.14-.16.6-.7.76-.94.16-.24.32-.2.54-.12.22.08 1.4.66 1.64.78.24.12.4.18.46.28.06.1.06.6-.14 1.16z"
            fill="white"
          />
        </svg>
      );

    case "stripe":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#635BFF" />
          <path
            d="M15.4 10.6c0-1.4-1.1-2-2.8-2-1.7 0-3.3.6-4.6 1.6l-.8-2.4c1.6-1 3.5-1.5 5.5-1.5 3.6 0 5.8 1.8 5.8 4.7 0 4.1-5.7 3.6-5.7 5.5 0 .7.6 1.1 1.7 1.1 1.6 0 3.3-.8 4.3-1.8l.9 2.4c-1.5 1.3-3.6 1.9-5.4 1.9-3.7 0-6-1.8-6-4.7-.1-4.2 5.9-3.7 5.9-5.7z"
            fill="white"
          />
        </svg>
      );

    case "quickbooks":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="12" fill="#2CA01C" />
          <path
            d="M7 14.5a3.5 3.5 0 0 0 3.5 3.5h.5V16h-.5A1.5 1.5 0 0 1 9 14.5V9.5A1.5 1.5 0 0 1 10.5 8h.5V6h-.5A3.5 3.5 0 0 0 7 9.5v5zm10-5A3.5 3.5 0 0 0 13.5 6H13v2h.5A1.5 1.5 0 0 1 15 9.5v5a1.5 1.5 0 0 1-1.5 1.5H13v2h.5a3.5 3.5 0 0 0 3.5-3.5v-5z"
            fill="white"
          />
        </svg>
      );

    case "zoho_books":
    case "zoho":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <rect x="2" y="3" width="9" height="8" rx="1.5" fill="#E42528" />
          <text x="6.5" y="9.5" textAnchor="middle" fill="#FFFFFF" fontSize="6" fontWeight="bold" fontFamily="sans-serif">Z</text>
          <rect x="13" y="3" width="9" height="8" rx="1.5" fill="#2BA342" />
          <text x="17.5" y="9.5" textAnchor="middle" fill="#FFFFFF" fontSize="6" fontWeight="bold" fontFamily="sans-serif">O</text>
          <rect x="2" y="13" width="9" height="8" rx="1.5" fill="#0C77B9" />
          <text x="6.5" y="19.5" textAnchor="middle" fill="#FFFFFF" fontSize="6" fontWeight="bold" fontFamily="sans-serif">H</text>
          <rect x="13" y="13" width="9" height="8" rx="1.5" fill="#F4901E" />
          <text x="17.5" y="19.5" textAnchor="middle" fill="#FFFFFF" fontSize="6" fontWeight="bold" fontFamily="sans-serif">O</text>
        </svg>
      );

    case "google_calendar":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="20" height="20" rx="4" fill="#FFFFFF" />
          <path d="M2 7h20V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v3z" fill="#4285F4" />
          <path d="M2 7v13a2 2 0 0 0 2 2h3V7H2z" fill="#34A853" />
          <path d="M17 22h3a2 2 0 0 0 2-2V7h-5v15z" fill="#EA4335" />
          <path d="M7 22h10v-4H7v4z" fill="#FBBC05" />
          <text x="12" y="16" textAnchor="middle" fill="#1A73E8" fontSize="8" fontWeight="bold" fontFamily="sans-serif">
            31
          </text>
        </svg>
      );

    case "help_desk":
    case "zendesk":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="5" fill="#03363D" />
          <path d="M6 12a6 6 0 0 1 6-6v6H6z" fill="#17494D" />
          <path d="M6 12h6v6L6 12z" fill="#E8F4E8" />
          <path d="M12 6h6L12 12V6z" fill="#E8F4E8" />
          <path d="M12 12h6a6 6 0 0 1-6 6V12z" fill="#03363D" />
          <circle cx="15" cy="9" r="2.5" fill="#69C99E" />
          <circle cx="9" cy="15" r="2.5" fill="#69C99E" />
        </svg>
      );

    case "hubspot":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#FF7A59" />
          <path
            d="M17.5 10.8V8.6l1.3-.7a1.4 1.4 0 1 0-.7-1.2l-1.6.9c-.4-.4-1-.7-1.7-.7-1.3 0-2.4 1.1-2.4 2.4 0 .3 0 .6.1.8L8.7 12a1.7 1.7 0 0 0-.9-.3 1.7 1.7 0 1 0 1.7 1.7c0-.2 0-.4-.1-.6l3.8-1.9c.4.4 1 .6 1.6.6a2.4 2.4 0 0 0 2.4-2.4c0-.1 0-.2 0-.3h.3zm-2.7 1.1c-.8 0-1.4-.6-1.4-1.4s.6-1.4 1.4-1.4c.8 0 1.4.6 1.4 1.4s-.6 1.4-1.4 1.4z"
            fill="white"
          />
        </svg>
      );

    case "salesforce":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#00A1E0" />
          <path
            d="M9.8 8.2c.7-.8 1.7-1.3 2.8-1.3 1.5 0 2.8.9 3.4 2.1.6-.2 1.3-.2 1.9.1 1.2.6 1.8 1.9 1.6 3.2 1 .3 1.7 1.3 1.7 2.4 0 1.5-1.2 2.7-2.7 2.7H6.5c-1.7 0-3-1.3-3-3 0-1.3.8-2.4 2-2.8.1-1.7 1.5-3 3.2-3.1.4-.2.8-.3 1.1-.3z"
            fill="white"
          />
        </svg>
      );

    case "zapier":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#FF4A00" />
          <path
            d="M12 4v16m-8-8h16m-2.8-5.6L6.8 17.6m10.4 0L6.8 6.4"
            stroke="white"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        </svg>
      );

    case "webhooks":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#1E293B" stroke="#475569" strokeWidth="1.5" />
          <path
            d="M16 6a3 3 0 1 1-3 3 3 3 0 0 1 3-3zm-8 4a3 3 0 1 1-3 3 3 3 0 0 1 3-3zm8 6a3 3 0 1 1-3 3 3 3 0 0 1 3-3z"
            fill="#38BDF8"
          />
          <path
            d="M13 9h-2a2 2 0 0 0-2 2v2m4 4h-2a2 2 0 0 1-2-2"
            stroke="#94A3B8"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    case "rest_api":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#0F172A" stroke="#334155" strokeWidth="1.5" />
          <path
            d="M7 9l-3 3 3 3m10-6l3 3-3 3M13 7l-2 10"
            stroke="#38BDF8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "csv":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#047857" />
          <path
            d="M7 6h7l4 4v8a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z"
            fill="white"
            fillOpacity="0.2"
          />
          <text x="5" y="16" fill="white" fontSize="7" fontWeight="bold" fontFamily="monospace">
            CSV
          </text>
        </svg>
      );

    case "excel":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#107C41" />
          <path
            d="M6 7l4 5-4 5h2.5l2.5-3.5 2.5 3.5H16l-4-5 4-5h-2.5L11 10.5 8.5 7H6z"
            fill="white"
          />
        </svg>
      );

    case "google_sheets":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#0F9D58" />
          <rect x="6" y="6" width="12" height="12" rx="1.5" fill="white" />
          <path
            d="M6 10h12M6 14h12M11 6v12M15 6v12"
            stroke="#0F9D58"
            strokeWidth="1.2"
          />
        </svg>
      );

    case "databases":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#336791" />
          <ellipse cx="12" cy="7" rx="6" ry="2.5" fill="white" />
          <path
            d="M6 7v4c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5V7m-12 5v4c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5v-4"
            stroke="white"
            strokeWidth="1.8"
          />
        </svg>
      );

    case "firebase":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <path
            d="M4.5 18.5L6.8 4.2c.1-.6.8-.9 1.2-.5l3.2 5.9-6.7 8.9z"
            fill="#FFA000"
          />
          <path
            d="M13.2 12.3l-2-3.7c-.3-.5-1-.5-1.3 0L3.5 19.5l7.9 4.4c.5.3 1.1.3 1.6 0l7.5-4.4-7.3-7.2z"
            fill="#F57C00"
          />
          <path
            d="M19.5 7.8c.4-.6 1.3-.4 1.4.3l1.6 10.4-9.3-6.2 6.3-4.5z"
            fill="#FFCA28"
          />
        </svg>
      );

    default:
      return (
        <div className={`rounded-lg bg-surface-2 border border-line flex items-center justify-center font-bold text-xs ${className}`}>
          {id.slice(0, 2).toUpperCase()}
        </div>
      );
  }
}

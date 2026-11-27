import type { Metadata } from "next";
import "./globals.css";
import { themeInitScript } from "@/lib/theme/themeScript";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { AuthProvider } from "@/lib/auth/authContext";
import { ScrollLockObserver } from "@/components/ui/ScrollLockObserver";

export const metadata: Metadata = {
  title: "BizzPal — AI Business Operating System",
  description: "Autonomous executive intelligence, dynamic dashboard, and decision simulation platform for businesses.",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-64.png", sizes: "64x64", type: "image/png" },
    ],
    shortcut: "/favicon-32.png",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="light"
      data-theme="light"
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="64x64" href="/favicon-64.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="bg-bg text-text antialiased selection:bg-brass selection:text-white min-h-screen font-sans">
        <ScrollLockObserver />
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}


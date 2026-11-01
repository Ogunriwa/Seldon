// ── Imports & Setup ──────────────────────────────────────────
// Next.js metadata and global stylesheet configurations
import type { Metadata } from "next";
import "./globals.css";
import "highlight.js/styles/github-dark.css";

// ── App Metadata ──────────────────────────────────────────────
// Defines the global title and description for the document head
export const metadata: Metadata = {
  title: "Seldon",
  description: "Self-hosted UI for Ollama",
};

// ── Root Layout ──────────────────────────────────────────────
/* 
 * The top-level HTML structure for the Next.js application.
 * Injects self-hosted offline Inter fonts via globals.css, basic body styling, and renders child pages.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased font-sans"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

// ── Imports & Setup ──────────────────────────────────────────
// Next.js metadata and global stylesheet configurations
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "highlight.js/styles/github-dark.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// ── App Metadata ──────────────────────────────────────────────
// Defines the global title and description for the document head
export const metadata: Metadata = {
  title: "Seldon",
  description: "Self-hosted UI for Ollama",
};

// ── Root Layout ──────────────────────────────────────────────
/* 
 * The top-level HTML structure for the Next.js application.
 * Injects global fonts, basic body styling, and renders child pages.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased font-sans`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

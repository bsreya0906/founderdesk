import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "FounderDesk", description: "AI-powered feedback triage for founders" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

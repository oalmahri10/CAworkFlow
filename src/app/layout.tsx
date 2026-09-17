import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/session-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BisB Credit Command",
  description: "Credit Applications & Availment Tickets — Workflow Intelligence",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full font-sans antialiased text-[color:var(--color-charcoal)] bg-[color:var(--color-app-bg)]">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}

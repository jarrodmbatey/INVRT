import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "INVRT — Your signature, rendered",
  description: "What lives inside you, turned outward into form.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${inter.variable} antialiased`}>
        <header className="fixed inset-x-0 top-0 z-50">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
            <Link
              href="/"
              className="font-(family-name:--font-display) text-sm tracking-[0.35em] text-(--color-ink) transition-colors duration-500 hover:text-(--color-accent)"
            >
              INVRT
            </Link>
            <Link
              href="/gallery"
              className="text-xs tracking-[0.2em] text-(--color-ink-dim) uppercase transition-colors duration-500 hover:text-(--color-ink)"
            >
              Gallery
            </Link>
          </nav>
        </header>
        <main className="min-h-dvh">{children}</main>
      </body>
    </html>
  );
}

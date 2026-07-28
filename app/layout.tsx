import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "徐涣 / Gelatoni",
    template: "%s | 徐涣 / Gelatoni",
  },
  description: "徐涣 / Gelatoni 的文章与简历。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="min-h-screen bg-paper text-ink">
          <header className="border-b border-line/80 bg-paper/90">
            <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
              <Link className="font-mono text-sm font-semibold tracking-normal" href="/articles">
                徐涣 / Gelatoni
              </Link>
              <div className="flex items-center gap-2 text-sm">
                <Link className="nav-link" href="https://tasukikeifu.com" rel="noreferrer" target="_blank">
                  襷の系譜
                </Link>
                <Link className="nav-link" href="/articles">
                  文章
                </Link>
                <Link className="nav-link" href="/resume">
                  简历
                </Link>
              </div>
            </nav>
          </header>
          <main className="mx-auto max-w-5xl px-5 py-10">{children}</main>
        </div>
      </body>
    </html>
  );
}

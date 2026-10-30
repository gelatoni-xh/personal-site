import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getMessages } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://gelatoni.uk"),
  title: {
    default: "Xuhuan / Gelatoni",
    template: "%s | Xuhuan / Gelatoni",
  },
  description: "Writing and engineering notes by Xuhuan.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = (await headers()).get("x-site-locale") === "zh" ? "zh" : "en";
  const base = `/${locale}`;
  const messages = getMessages(locale);

  return (
    <html lang={locale === "zh" ? "zh-CN" : "en"}>
      <body>
        <div className="min-h-screen bg-paper text-ink">
          <header className="border-b border-line/80 bg-paper/90">
            <div className="mx-auto flex min-h-16 max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-2">
              <div className="flex items-center gap-4">
                <LanguageSwitcher locale={locale} />
                <Link className="font-mono text-sm font-semibold tracking-normal" href={base}>Xuhuan / Gelatoni</Link>
              </div>
              <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="Primary navigation">
                <Link className="nav-link" href="https://tasukikeifu.com" rel="noreferrer" target="_blank">
                  Tasuki Keifu
                </Link>
                <Link className="nav-link" href={`${base}/articles`}>
                  {messages.nav.writing}
                </Link>
                <Link className="nav-link" href={`${base}/observability`}>{messages.nav.observability}</Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-5 py-10">{children}</main>
        </div>
      </body>
    </html>
  );
}

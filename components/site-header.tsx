"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getLocaleFromPathname, getMessages } from "@/lib/i18n";

export function SiteHeader() {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const messages = getMessages(locale);
  const base = `/${locale}`;

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }, [locale]);

  return <header className="border-b border-line/80 bg-paper/90">
    <div className="mx-auto flex min-h-16 max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-2">
      <div className="flex items-center gap-4">
        <LanguageSwitcher />
        <Link className="font-mono text-sm font-semibold tracking-normal" href={base}>Xuhuan / Gelatoni</Link>
      </div>
      <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="Primary navigation">
        <a className="nav-link" href="https://tasukikeifu.com" rel="noreferrer" target="_blank">Tasuki Keifu</a>
        <Link className="nav-link" href={`${base}/articles`}>{messages.nav.writing}</Link>
        <Link className="nav-link" href={`${base}/observability`}>{messages.nav.observability}</Link>
      </nav>
    </div>
  </header>;
}

"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { getLocaleFromPathname, getMessages } from "@/lib/i18n";

export function LanguageSwitcher() {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const searchParams = useSearchParams();
  const suffix = pathname === `/${locale}` ? "" : pathname.slice(locale.length + 1);
  const query = searchParams.toString();
  const labels = getMessages(locale).nav;

  return <nav aria-label={labels.language} className="language-switcher">
    {(["en", "zh"] as const).map((option) => <a
      aria-current={locale === option ? "page" : undefined}
      className={`language-option ${locale === option ? "language-option-active" : ""}`}
      href={`/${option}${suffix}${query ? `?${query}` : ""}`}
      hrefLang={option === "zh" ? "zh-CN" : "en"}
      key={option}
      lang={option === "zh" ? "zh-CN" : "en"}
    >{option === "en" ? labels.english : labels.chinese}</a>)}
  </nav>;
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/content/articles";

export function LanguageSwitcher({ locale, englishSlugs }: { locale: Locale; englishSlugs: string[] }) {
  const pathname = usePathname();
  const other = locale === "en" ? "zh" : "en";
  const articlePrefix = `/${locale}/articles/`;
  let target = `/${other}`;
  if (pathname === `/${locale}/articles`) {
    target = `/${other}/articles`;
  } else if (pathname.startsWith(articlePrefix)) {
    const slug = pathname.slice(articlePrefix.length);
    target = locale === "en" || englishSlugs.includes(decodeURIComponent(slug))
      ? `/${other}/articles/${slug}`
      : `/${other}/articles`;
  }
  return <Link className="nav-link" href={target} hrefLang={other} lang={other === "zh" ? "zh-CN" : "en"}>{other === "zh" ? "中文" : "EN"}</Link>;
}

import en from "@/content/i18n/en.json";
import zh from "@/content/i18n/zh.json";
import type { Locale } from "@/lib/content/articles";

export function getMessages(locale: Locale) {
  return locale === "zh" ? zh : en;
}

export function getLocaleFromPathname(pathname: string): Locale {
  return pathname === "/zh" || pathname.startsWith("/zh/") ? "zh" : "en";
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedArticles, type Locale } from "@/lib/content/articles";

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return {
    title: locale === "zh" ? "首页" : "Home",
    description: locale === "zh" ? "徐涣的文章、工程实践与个人项目。" : "Writing and engineering notes by Xuhuan.",
    alternates: { canonical: `/${locale}`, languages: { en: "/en", "zh-CN": "/zh" } },
  };
}

export default async function LocaleHome({ params }: Props) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "zh") notFound();
  const language = locale as Locale;
  const recent = getPublishedArticles(language).slice(0, 3);
  const english = language === "en";

  return (
    <section className="py-8">
      <p className="page-kicker">Xuhuan / Gelatoni</p>
      <h1 className="page-title mt-3">{english ? "Software engineer, writing about delivery and systems" : "软件工程师：交付、系统与实践"}</h1>
      <p className="page-description">{english
        ? "I work across requirements, system design, implementation, testing, and deployment. These notes document decisions and trade-offs from enterprise systems and personal projects."
        : "从需求澄清、系统设计、实现与验证，到部署与后续观察。这里记录企业系统和个人项目中的决策与取舍。"}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link className="border border-ink bg-ink px-4 py-2 text-sm text-white" href={`/${locale}/articles`}>{english ? "Read articles" : "阅读文章"}</Link>
        <a className="border border-line bg-white px-4 py-2 text-sm text-ink" href="https://github.com/gelatoni-xh">GitHub</a>
        <a className="border border-line bg-white px-4 py-2 text-sm text-ink" href="https://tasukikeifu.com">Tasuki Keifu</a>
      </div>
      <div className="mt-16 border-t border-line pt-8">
        <h2 className="text-lg font-semibold">{english ? "Recent writing" : "最近文章"}</h2>
        <div className="mt-5 grid gap-3">
          {recent.map((article) => <Link className="border-b border-line py-3 hover:text-accent" href={`/${locale}/articles/${article.slug}`} key={article.slug}>
            <span className="mr-4 font-mono text-xs text-stone-500">{article.date}</span>{article.title}
          </Link>)}
        </div>
      </div>
    </section>
  );
}

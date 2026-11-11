import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedArticles, type Locale } from "@/lib/content/articles";
import { getMessages } from "@/lib/i18n";

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "zh") return {};
  const messages = getMessages(locale).home;
  return {
    title: messages.metadataTitle,
    description: messages.metadataDescription,
    alternates: { canonical: `/${locale}`, languages: { en: "/en", "zh-CN": "/zh" } },
  };
}

export default async function LocaleHome({ params }: Props) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "zh") notFound();
  const language = locale as Locale;
  const messages = getMessages(language).home;
  const recent = getPublishedArticles(language).slice(0, 3);

  return (
    <section className="py-8">
      <p className="page-kicker">Xuhuan / Gelatoni</p>
      <h1 className="page-title mt-3">{messages.headline}</h1>
      <p className="page-description">{messages.intro}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link className="border border-ink bg-ink px-4 py-2 text-sm text-white" href={`/${locale}/articles`}>{messages.readArticles}</Link>
        <a className="border border-line bg-white px-4 py-2 text-sm text-ink" href="https://github.com/gelatoni-xh">GitHub</a>
        <a className="border border-line bg-white px-4 py-2 text-sm text-ink" href="https://tasukikeifu.com">Tasuki Keifu</a>
      </div>
      <div className="mt-16 border-t border-line pt-8">
        <h2 className="text-lg font-semibold">{messages.recentWriting}</h2>
        <div className="mt-5 grid gap-3">
          {recent.map((article) => <Link className="border-b border-line py-3 hover:text-accent" href={`/${locale}/articles/${article.slug}`} key={article.slug}>
            <span className="mr-4 font-mono text-xs text-stone-500">{article.date}</span>{article.title}
          </Link>)}
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { MarkdownBody } from "@/components/markdown/markdown-body";
import { extractMarkdownHeadings } from "@/lib/content/markdown";
import { getArticleBySlug, getCanonicalArticleSlug, getCategoryLabel, type Locale } from "@/lib/content/articles";

interface Props { params: Promise<{ locale: string; slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  if (locale !== "en" && locale !== "zh") return {};
  const canonicalSlug = getCanonicalArticleSlug(slug);
  const article = canonicalSlug ? getArticleBySlug(canonicalSlug, locale) : null;
  if (!article?.published) return {};
  const english = getArticleBySlug(article.slug, "en")?.published;
  const languages = english ? { en: `/en/articles/${article.slug}`, "zh-CN": `/zh/articles/${article.slug}` } : { "zh-CN": `/zh/articles/${article.slug}` };
  return { title: article.title, description: article.summary, alternates: { canonical: `/${locale}/articles/${article.slug}`, languages } };
}

export default async function ArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  if (locale !== "en" && locale !== "zh") notFound();
  const canonicalSlug = getCanonicalArticleSlug(slug);
  if (!canonicalSlug) notFound();
  if (canonicalSlug !== decodeURIComponent(slug)) permanentRedirect(`/${locale}/articles/${encodeURIComponent(canonicalSlug)}`);
  const article = getArticleBySlug(canonicalSlug, locale as Locale);
  if (!article?.published) notFound();
  const other = locale === "en" ? "zh" : "en";
  const counterpart = getArticleBySlug(canonicalSlug, other);
  const headings = extractMarkdownHeadings(article.content);

  return <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
    <aside className="hidden lg:block"><nav className="sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto border-l border-line pl-4 text-sm">
      <p className="mb-3 font-mono text-xs uppercase text-stone-400">{locale === "en" ? "Outline" : "目录"}</p>
      <div className="grid gap-2">{headings.map((heading) => <a className={heading.level === 3 ? "ml-3 block text-stone-500 hover:text-ink" : "block font-medium text-stone-600 hover:text-ink"} href={`#${heading.id}`} key={heading.id}>{heading.text}</a>)}</div>
    </nav></aside>
    <article className="min-w-0">
      <div className="border-b border-line pb-8">
        <Link className="text-sm text-stone-500 hover:text-ink" href={`/${locale}/articles`}>{locale === "en" ? "All articles" : "全部文章"}</Link>
        <h1 className="page-title">{article.title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-stone-500"><time>{article.date}</time><span className="border border-line px-2 py-0.5">{getCategoryLabel(article.category, locale)}</span>
          {counterpart?.published && <Link className="underline underline-offset-4 hover:text-ink" href={`/${other}/articles/${canonicalSlug}`} hrefLang={other}>{locale === "en" ? "阅读中文版" : "Read in English"}</Link>}
        </div>
      </div>
      <MarkdownBody className="mt-8" content={article.content} articleLocale={locale as Locale} />
    </article>
  </div>;
}

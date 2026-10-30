import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleCategories, getCategoryId, getCategoryLabel, getPublishedArticles, type Locale } from "@/lib/content/articles";
import { getMessages } from "@/lib/i18n";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; page?: string }>;
}
const pageSize = 10;

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "zh") return {};
  const messages = getMessages(locale).articles;
  return {
    title: messages.metadataTitle,
    description: messages.metadataDescription,
    alternates: { canonical: `/${locale}/articles`, languages: { en: "/en/articles", "zh-CN": "/zh/articles" } },
  };
}

export default async function ArticlesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "zh") notFound();
  const messages = getMessages(locale).articles;
  const { category, page } = await searchParams;
  const articles = getPublishedArticles(locale as Locale);
  const categories = getArticleCategories(articles);
  const requestedCategory = category && getCategoryId(category);
  const activeCategory = requestedCategory && categories.includes(requestedCategory) ? requestedCategory : undefined;
  const filtered = activeCategory ? articles.filter((article) => article.category === activeCategory) : articles;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(totalPages, Number.isInteger(Number(page)) && Number(page) > 0 ? Number(page) : 1);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const hrefForPage = (number: number) => {
    const query = new URLSearchParams();
    if (activeCategory) query.set("category", activeCategory);
    if (number > 1) query.set("page", String(number));
    return `/${locale}/articles${query.size ? `?${query}` : ""}`;
  };

  return <section>
    <p className="page-kicker">Writing</p>
    <h1 className="page-title">{messages.title}</h1>
    <p className="page-description">{messages.description}</p>
    <div className="mt-8 flex flex-wrap gap-2">
      <Link className={`border px-3 py-1.5 text-sm ${!activeCategory ? "border-ink bg-ink text-white" : "border-line bg-white"}`} href={`/${locale}/articles`}>{messages.all}</Link>
      {categories.map((item) => <Link className={`border px-3 py-1.5 text-sm ${activeCategory === item ? "border-ink bg-ink text-white" : "border-line bg-white"}`} href={`/${locale}/articles?category=${encodeURIComponent(item)}`} key={item}>{getCategoryLabel(item, locale)}</Link>)}
    </div>
    <div className="mt-10 grid gap-4">
      {visible.map((article) => <Link className="panel block transition hover:border-stone-400" href={`/${locale}/articles/${article.slug}`} key={article.slug}>
        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500"><time>{article.date}</time><span className="border border-line px-2 py-0.5">{getCategoryLabel(article.category, locale)}</span></div>
        <h2 className="mt-3 text-xl font-semibold">{article.title}</h2>
        {article.summary && <p className="mt-2 text-sm leading-6 text-stone-600">{article.summary}</p>}
      </Link>)}
      {visible.length === 0 && <p className="text-sm text-stone-500">{messages.emptyCategory}</p>}
    </div>
    {totalPages > 1 && <nav className="mt-8 flex items-center justify-between text-sm">
      {currentPage > 1 ? <Link href={hrefForPage(currentPage - 1)}>{messages.previous}</Link> : <span />}
      <span>{currentPage} / {totalPages}</span>
      {currentPage < totalPages ? <Link href={hrefForPage(currentPage + 1)}>{messages.next}</Link> : <span />}
    </nav>}
  </section>;
}

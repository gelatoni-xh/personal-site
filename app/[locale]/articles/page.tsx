import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleCategories, getCategoryLabel, getPublishedArticles, type Locale } from "@/lib/content/articles";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; page?: string }>;
}
const pageSize = 10;

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return {
    title: locale === "zh" ? "文章" : "Writing",
    description: locale === "zh" ? "需求、架构、交付与个人项目的实践记录。" : "Engineering writing on delivery, systems, and personal projects.",
    alternates: { canonical: `/${locale}/articles`, languages: { en: "/en/articles", "zh-CN": "/zh/articles" } },
  };
}

export default async function ArticlesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "zh") notFound();
  const { category, page } = await searchParams;
  const articles = getPublishedArticles(locale as Locale);
  const categories = getArticleCategories(articles);
  const activeCategory = category && categories.includes(category) ? category : undefined;
  const filtered = activeCategory ? articles.filter((article) => article.category === activeCategory) : articles;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(totalPages, Number.isInteger(Number(page)) && Number(page) > 0 ? Number(page) : 1);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const english = locale === "en";
  const hrefForPage = (number: number) => {
    const query = new URLSearchParams();
    if (activeCategory) query.set("category", activeCategory);
    if (number > 1) query.set("page", String(number));
    return `/${locale}/articles${query.size ? `?${query}` : ""}`;
  };

  return <section>
    <p className="page-kicker">Writing</p>
    <h1 className="page-title">{english ? "Articles" : "文章"}</h1>
    <p className="page-description">{english ? "English editions are added after editorial review." : "需求、架构、交付与个人项目的实践记录。"}</p>
    <div className="mt-8 flex flex-wrap gap-2">
      <Link className={`border px-3 py-1.5 text-sm ${!activeCategory ? "border-ink bg-ink text-white" : "border-line bg-white"}`} href={`/${locale}/articles`}>{english ? "All" : "全部"}</Link>
      {categories.map((item) => <Link className={`border px-3 py-1.5 text-sm ${activeCategory === item ? "border-ink bg-ink text-white" : "border-line bg-white"}`} href={`/${locale}/articles?category=${encodeURIComponent(item)}`} key={item}>{getCategoryLabel(item, locale)}</Link>)}
    </div>
    <div className="mt-10 grid gap-4">
      {visible.map((article) => <Link className="panel block transition hover:border-stone-400" href={`/${locale}/articles/${article.slug}`} key={article.slug}>
        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500"><time>{article.date}</time><span className="border border-line px-2 py-0.5">{getCategoryLabel(article.category, locale)}</span></div>
        <h2 className="mt-3 text-xl font-semibold">{article.title}</h2>
        {article.summary && <p className="mt-2 text-sm leading-6 text-stone-600">{article.summary}</p>}
      </Link>)}
      {visible.length === 0 && <p className="text-sm text-stone-500">{english ? "No articles in this category." : "这个分类下暂无文章。"}</p>}
    </div>
    {totalPages > 1 && <nav className="mt-8 flex items-center justify-between text-sm">
      {currentPage > 1 ? <Link href={hrefForPage(currentPage - 1)}>{english ? "Previous" : "上一页"}</Link> : <span />}
      <span>{currentPage} / {totalPages}</span>
      {currentPage < totalPages ? <Link href={hrefForPage(currentPage + 1)}>{english ? "Next" : "下一页"}</Link> : <span />}
    </nav>}
  </section>;
}

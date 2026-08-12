import Link from "next/link";
import { getArticleBySlug, getArticleCategories, getPublishedArticles } from "@/lib/content/articles";

export const metadata = {
  title: "文章",
};

const contentUpdatedAt = "2026-08-11";
const featuredSlug = "2026-08-11-tasuki-keifu-agent-Graph结构图";
const pageSize = 10;

interface ArticlesPageProps {
  searchParams: Promise<{
    category?: string;
    page?: string;
  }>;
}

function getPageNumber(value: string | undefined, totalPages: number) {
  const page = Number(value);

  if (!Number.isInteger(page) || page < 1) {
    return 1;
  }

  return Math.min(page, totalPages);
}

function getPageHref(category: string | undefined, page: number) {
  const params = new URLSearchParams();

  if (category) {
    params.set("category", category);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();

  return query ? `/articles?${query}` : "/articles";
}

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
  const { category, page } = await searchParams;
  const featuredArticle = getArticleBySlug(featuredSlug);
  const articles = getPublishedArticles().filter((article) => article.slug !== featuredSlug);
  const categories = getArticleCategories(articles);
  const activeCategory = category && categories.includes(category) ? category : undefined;
  const filteredArticles = activeCategory ? articles.filter((article) => article.category === activeCategory) : articles;
  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / pageSize));
  const currentPage = getPageNumber(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const visibleArticles = filteredArticles.slice(pageStart, pageStart + pageSize);

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="page-kicker">Writing</p>
          <h1 className="page-title">文章</h1>
        </div>
        <p className="text-sm text-stone-500">最近更新：{contentUpdatedAt}</p>
      </div>
      <div className="mt-10">
        {!featuredArticle ? (
          <div className="panel">
            <p className="text-sm text-stone-500">主推文章暂时还没有准备好。</p>
          </div>
        ) : (
          <Link className="panel block border-ink/70 bg-stone-50 transition hover:border-ink" href={`/articles/${featuredArticle.slug}`}>
            <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
              <span className="border border-ink px-2 py-0.5 text-ink">Featured</span>
              <time>{featuredArticle.date}</time>
              <span className="border border-line px-2 py-0.5">{featuredArticle.category}</span>
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink">{featuredArticle.title}</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-600">
              这篇文章集中整理了我当前阶段如何把 AI 协作放进真实研发流程，包括需求理解、方案前置、编码协作、质量验证和运维辅助。
            </p>
            <p className="mt-6 text-sm font-medium text-ink">阅读全文</p>
          </Link>
        )}
      </div>
      <div className="mt-8 flex flex-wrap gap-2">
        <Link className={`border px-3 py-1.5 text-sm transition ${activeCategory ? "border-line bg-white text-stone-600 hover:border-ink hover:text-ink" : "border-ink bg-ink text-white"}`} href="/articles">
          全部
        </Link>
        {categories.map((item) => (
          <Link
            className={`border px-3 py-1.5 text-sm transition ${activeCategory === item ? "border-ink bg-ink text-white" : "border-line bg-white text-stone-600 hover:border-ink hover:text-ink"}`}
            href={`/articles?category=${encodeURIComponent(item)}`}
            key={item}
          >
            {item}
          </Link>
        ))}
      </div>
      <div className="mt-12 grid gap-4">
        {visibleArticles.length === 0 ? (
          <div className="panel">
            <p className="text-sm text-stone-500">这个分类下暂时还没有文章。</p>
          </div>
        ) : (
          visibleArticles.map((article) => (
            <Link className="panel block transition hover:border-stone-400" href={`/articles/${article.slug}`} key={article.slug}>
              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                <time>{article.date}</time>
                <span className="border border-line px-2 py-0.5">{article.category}</span>
              </div>
              <h2 className="mt-3 text-xl font-semibold">{article.title}</h2>
            </Link>
          ))
        )}
      </div>
      {totalPages > 1 ? (
        <nav className="mt-8 flex items-center justify-between gap-4 text-sm">
          <Link
            aria-disabled={currentPage === 1}
            className={`border px-3 py-2 ${currentPage === 1 ? "pointer-events-none border-line text-stone-300" : "border-line bg-white text-ink hover:border-ink"}`}
            href={getPageHref(activeCategory, currentPage - 1)}
          >
            上一页
          </Link>
          <span className="text-stone-500">
            {currentPage} / {totalPages}
          </span>
          <Link
            aria-disabled={currentPage === totalPages}
            className={`border px-3 py-2 ${currentPage === totalPages ? "pointer-events-none border-line text-stone-300" : "border-line bg-white text-ink hover:border-ink"}`}
            href={getPageHref(activeCategory, currentPage + 1)}
          >
            下一页
          </Link>
        </nav>
      ) : null}
    </section>
  );
}

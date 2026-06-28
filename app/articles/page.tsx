import Link from "next/link";
import { getArticleCategories, getPublishedArticles } from "@/lib/content/articles";

export const metadata = {
  title: "文章",
};

const pageSize = 10;
const contentUpdatedAt = "2026-06-29 00:35";

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
  const articles = getPublishedArticles();
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

      <div className="mt-10 grid gap-4">
        {visibleArticles.length === 0 ? (
          <div className="panel">
            <p className="text-sm text-stone-500">还没有文章。把 Markdown 文件放到 content/articles 后会自动出现在这里。</p>
          </div>
        ) : (
          visibleArticles.map((article) => (
            <Link className="panel block transition hover:border-stone-400" href={`/articles/${article.slug}`} key={article.slug}>
              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                <time>{article.date}</time>
                <span className="border border-line px-2 py-0.5">{article.category}</span>
                {article.tags.map((tag) => (
                  <span className="rounded border border-line px-2 py-0.5" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
              <h2 className="mt-3 text-xl font-semibold">{article.title}</h2>
              {article.summary ? <p className="mt-2 text-sm leading-6 text-stone-600">{article.summary}</p> : null}
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

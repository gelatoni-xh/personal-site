import Link from "next/link";
import { getPublishedArticles } from "@/lib/content/articles";

export const metadata = {
  title: "文章",
};

export default function ArticlesPage() {
  const articles = getPublishedArticles();

  return (
    <section>
      <p className="page-kicker">Writing</p>
      <h1 className="page-title">文章</h1>
      <p className="page-description">
        这里放长期有价值的文字。第一版只读取仓库里的 Markdown 文件，不做发布后台。
      </p>

      <div className="mt-10 grid gap-4">
        {articles.length === 0 ? (
          <div className="panel">
            <p className="text-sm text-stone-500">还没有文章。把 Markdown 文件放到 content/articles 后会自动出现在这里。</p>
          </div>
        ) : (
          articles.map((article) => (
            <Link className="panel block transition hover:border-stone-400" href={`/articles/${article.slug}`} key={article.slug}>
              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                <time>{article.date}</time>
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
    </section>
  );
}

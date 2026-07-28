import { notFound } from "next/navigation";
import { MarkdownBody } from "@/components/markdown/markdown-body";
import { extractMarkdownHeadings } from "@/lib/content/markdown";
import { getArticleBySlug } from "@/lib/content/articles";

interface ArticlePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    return {};
  }

  return {
    title: article.title,
    description: article.summary,
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const headings = extractMarkdownHeadings(article.content);

  return (
    <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
      <aside className="hidden lg:block">
        <nav className="sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto border-l border-line pl-4 text-sm">
          <p className="mb-3 font-mono text-xs uppercase tracking-normal text-stone-400">Outline</p>
          <div className="grid gap-2">
            {headings.map((heading) => (
              <a
                className={heading.level === 3 ? "block text-stone-500 hover:text-ink ml-3" : "block font-medium text-stone-600 hover:text-ink"}
                href={`#${heading.id}`}
                key={heading.id}
              >
                {heading.text}
              </a>
            ))}
          </div>
        </nav>
      </aside>
      <article className="min-w-0">
        <div className="border-b border-line pb-8">
          <p className="page-kicker">Article</p>
          <h1 className="page-title">{article.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-stone-500">
            <time>{article.date}</time>
            {article.categories.map((item) => (
              <span className="border border-line px-2 py-0.5" key={item}>
                {item}
              </span>
            ))}
            {article.tags.map((tag) => (
              <span className="rounded border border-line px-2 py-0.5" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>
        <MarkdownBody className="mt-8" content={article.content} />
      </article>
    </div>
  );
}

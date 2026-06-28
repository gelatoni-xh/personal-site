import { notFound } from "next/navigation";
import { MarkdownBody } from "@/components/markdown/markdown-body";
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

  return (
    <article>
      <div className="border-b border-line pb-8">
        <p className="page-kicker">Article</p>
        <h1 className="page-title">{article.title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-stone-500">
          <time>{article.date}</time>
          <span className="border border-line px-2 py-0.5">{article.category}</span>
          {article.tags.map((tag) => (
            <span className="rounded border border-line px-2 py-0.5" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      </div>
      <MarkdownBody className="mt-8" content={article.content} />
    </article>
  );
}

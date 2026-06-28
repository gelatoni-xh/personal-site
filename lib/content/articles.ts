import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const articlesDirectory = path.join(process.cwd(), "content/articles");

export interface Article {
  slug: string;
  title: string;
  date: string;
  category: string;
  summary: string;
  tags: string[];
  published: boolean;
  content: string;
}

function ensureArticlesDirectory() {
  if (!fs.existsSync(articlesDirectory)) {
    fs.mkdirSync(articlesDirectory, { recursive: true });
  }
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((tag): tag is string => typeof tag === "string");
}

function normalizeCategory(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "未分类";
}

export function getArticleSlugs() {
  ensureArticlesDirectory();

  return fs
    .readdirSync(articlesDirectory)
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => fileName.replace(/\.md$/, ""));
}

export function getArticleBySlug(slug: string): Article | null {
  const fullPath = path.join(articlesDirectory, `${slug}.md`);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const raw = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(raw);

  return {
    slug,
    title: typeof data.title === "string" ? data.title : slug,
    date: typeof data.date === "string" ? data.date : "",
    category: normalizeCategory(data.category),
    summary: typeof data.summary === "string" ? data.summary : "",
    tags: normalizeTags(data.tags),
    published: data.published !== false,
    content,
  };
}

export function getPublishedArticles() {
  return getArticleSlugs()
    .map((slug) => getArticleBySlug(slug))
    .filter((article): article is Article => Boolean(article && article.published))
    .sort((a, b) => {
      const dateOrder = b.date.localeCompare(a.date);

      if (dateOrder !== 0) {
        return dateOrder;
      }

      return a.title.localeCompare(b.title, "zh-CN");
    });
}

export function getArticleCategories(articles = getPublishedArticles()) {
  return Array.from(new Set(articles.map((article) => article.category))).sort((a, b) => a.localeCompare(b, "zh-CN"));
}

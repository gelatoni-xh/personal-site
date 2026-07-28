import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const articlesDirectory = path.join(process.cwd(), "content/articles");
const categoryOrder = ["蚂蚁集团-人事板块", "StablePay", "AI实践", "个人项目", "思考"];

export interface Article {
  slug: string;
  title: string;
  date: string;
  category: string;
  categories: string[];
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

function normalizeCategories(value: unknown, fallback: unknown): string[] {
  if (Array.isArray(value)) {
    const categories = value
      .filter((category): category is string => typeof category === "string")
      .map((category) => category.trim())
      .filter(Boolean);

    return categories.length > 0 ? Array.from(new Set(categories)) : [normalizeCategory(fallback)];
  }

  return [normalizeCategory(fallback)];
}

export function getArticleSlugs() {
  ensureArticlesDirectory();

  return fs
    .readdirSync(articlesDirectory)
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => fileName.replace(/\.md$/, ""));
}

export function getArticleBySlug(slug: string): Article | null {
  let normalizedSlug = slug;

  try {
    normalizedSlug = decodeURIComponent(slug);
  } catch {
    return null;
  }

  if (normalizedSlug.includes("/") || normalizedSlug.includes("\\") || normalizedSlug.includes("..")) {
    return null;
  }

  const fullPath = path.join(articlesDirectory, `${normalizedSlug}.md`);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const raw = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(raw);
  const categories = normalizeCategories(data.categories, data.category);

  return {
    slug: normalizedSlug,
    title: typeof data.title === "string" ? data.title : slug,
    date: typeof data.date === "string" ? data.date : "",
    category: categories[0],
    categories,
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
  return Array.from(new Set(articles.flatMap((article) => article.categories))).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);

    if (indexA !== -1 || indexB !== -1) {
      return (indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA) - (indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB);
    }

    return a.localeCompare(b, "zh-CN");
  });
}

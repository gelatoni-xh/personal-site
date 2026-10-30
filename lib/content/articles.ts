import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const articlesDirectory = path.join(process.cwd(), "content/articles");
const englishArticlesDirectory = path.join(process.cwd(), "content/articles-en");
export type Locale = "en" | "zh";
const categoryOrder = ["蚂蚁集团-人事板块", "StablePay", "AI实践", "个人项目", "思考"];
const englishCategories: Record<string, string> = {
  "蚂蚁集团-人事板块": "Enterprise HR systems",
  StablePay: "Payments",
  "AI实践": "AI practice",
  "个人项目": "Personal projects",
  "思考": "Engineering notes",
};

export function getCategoryLabel(category: string, locale: Locale) {
  return locale === "en" ? englishCategories[category] ?? category : category;
}

export interface Article {
  slug: string;
  title: string;
  date: string;
  category: string;
  summary: string;
  published: boolean;
  content: string;
}

function ensureArticlesDirectory() {
  if (!fs.existsSync(articlesDirectory)) {
    fs.mkdirSync(articlesDirectory, { recursive: true });
  }
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

export function getArticleBySlug(slug: string, locale: Locale = "zh"): Article | null {
  let normalizedSlug = slug;

  try {
    normalizedSlug = decodeURIComponent(slug);
  } catch {
    return null;
  }

  if (normalizedSlug.includes("/") || normalizedSlug.includes("\\") || normalizedSlug.includes("..")) {
    return null;
  }

  const fullPath = path.join(locale === "en" ? englishArticlesDirectory : articlesDirectory, `${normalizedSlug}.md`);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const raw = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(raw);
  const category = normalizeCategory(data.category);

  return {
    slug: normalizedSlug,
    title: typeof data.title === "string" ? data.title : slug,
    date: typeof data.date === "string" ? data.date : "",
    category,
    summary: typeof data.summary === "string" ? data.summary : "",
    published: data.published !== false,
    content,
  };
}

export function getPublishedArticles(locale: Locale = "zh") {
  return getArticleSlugs()
    .map((slug) => getArticleBySlug(slug, locale))
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
  return Array.from(new Set(articles.map((article) => article.category))).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);

    if (indexA !== -1 || indexB !== -1) {
      return (indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA) - (indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB);
    }

    return a.localeCompare(b, "zh-CN");
  });
}

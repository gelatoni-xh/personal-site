import { redirect } from "next/navigation";

export default async function LegacyArticlesPage({ searchParams }: { searchParams: Promise<{ category?: string; page?: string }> }) {
  const { category, page } = await searchParams;
  const query = new URLSearchParams();
  if (category) query.set("category", category);
  if (page) query.set("page", page);
  redirect(`/zh/articles${query.size ? `?${query}` : ""}`);
}

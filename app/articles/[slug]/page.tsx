import { permanentRedirect } from "next/navigation";

export default async function LegacyArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let decodedSlug: string;
  try {
    decodedSlug = decodeURIComponent(slug);
  } catch {
    decodedSlug = slug;
  }
  permanentRedirect(`/zh/articles/${encodeURIComponent(decodedSlug)}`);
}

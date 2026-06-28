export interface MarkdownHeading {
  id: string;
  level: number;
  text: string;
}

export function createHeadingId(text: string, counts: Map<string, number>) {
  const base =
    text
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s_-]/gu, "")
      .replace(/\s+/g, "-") || "section";
  const count = counts.get(base) ?? 0;

  counts.set(base, count + 1);

  return count === 0 ? base : `${base}-${count + 1}`;
}

export function extractMarkdownHeadings(content: string, maxLevel = 3): MarkdownHeading[] {
  const counts = new Map<string, number>();
  const headings: MarkdownHeading[] = [];
  let inCodeBlock = false;

  for (const line of content.split("\n")) {
    if (/^```/.test(line.trim())) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      continue;
    }

    const match = /^(#{2,6})\s+(.+?)\s*#*$/.exec(line);

    if (!match) {
      continue;
    }

    const level = match[1].length;

    if (level > maxLevel) {
      continue;
    }

    const text = match[2].trim();

    headings.push({
      id: createHeadingId(text, counts),
      level,
      text,
    });
  }

  return headings;
}

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const root = process.cwd();
const directories = ["content/articles", "content/articles-en"];
const categories = new Set(Object.keys(JSON.parse(fs.readFileSync(path.join(root, "content/article-categories.json"), "utf8"))));
const filesByDirectory = directories.map((directory) =>
  fs.readdirSync(path.join(root, directory)).filter((name) => name.endsWith(".md")).sort(),
);
const errors = [];

for (const file of new Set(filesByDirectory.flat())) {
  const editions = directories.map((directory) => {
    const fullPath = path.join(root, directory, file);
    if (!fs.existsSync(fullPath)) {
      errors.push(`${directory}/${file}: missing language edition`);
      return null;
    }

    const source = fs.readFileSync(fullPath, "utf8");
    const { data } = matter(source);
    if (data.date !== file.slice(0, 10)) errors.push(`${directory}/${file}: date does not match filename`);
    if (!categories.has(data.category)) errors.push(`${directory}/${file}: unknown category ${data.category}`);

    for (const [, target] of source.matchAll(/\]\(\.\/([^)]+\.md)\)/g)) {
      if (!fs.existsSync(path.join(root, directory, target))) {
        errors.push(`${directory}/${file}: broken article link ${target}`);
      }
    }

    return data;
  });

  if (editions[0] && editions[1]) {
    if (editions[0].date !== editions[1].date) errors.push(`${file}: language dates differ`);
    if (editions[0].category !== editions[1].category) errors.push(`${file}: language categories differ`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Validated ${filesByDirectory[0].length} bilingual article pairs.`);
}

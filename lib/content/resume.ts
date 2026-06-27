import fs from "node:fs";
import path from "node:path";

const resumePath = path.join(process.cwd(), "content/resume/resume.md");

const emptyResume = `# 简历

简历内容待补充。
`;

export function getResume() {
  if (!fs.existsSync(resumePath)) {
    return emptyResume;
  }

  return fs.readFileSync(resumePath, "utf8");
}

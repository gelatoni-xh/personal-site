import { MarkdownBody } from "@/components/markdown/markdown-body";
import { getResume } from "@/lib/content/resume";

export const metadata = {
  title: "简历",
};

export default function ResumePage() {
  const resume = getResume();

  return (
    <section>
      <p className="page-kicker">Resume</p>
      <h1 className="page-title">简历</h1>
      <p className="page-description">第一版简历来自仓库内的 Markdown 文件，后续再考虑结构化和 PDF 生成。</p>
      <MarkdownBody className="mt-10" content={resume} />
    </section>
  );
}

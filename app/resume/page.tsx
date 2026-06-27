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
      <p className="page-description">网页版来自当前简历的 TeX 内容整理，原版 PDF 保留为下载文件。</p>
      <a className="mt-6 inline-flex border border-line bg-white px-4 py-2 text-sm font-medium text-ink shadow-sm transition hover:border-ink" href="/resume/resume-v1-2026-06-26.pdf">
        下载 PDF
      </a>
      <MarkdownBody className="mt-10" content={resume} />
    </section>
  );
}

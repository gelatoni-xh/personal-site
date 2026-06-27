import Image from "next/image";

export const metadata = {
  title: "简历",
};

export default function ResumePage() {
  return (
    <section className="mx-auto max-w-4xl">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="page-kicker">Resume</p>
          <h1 className="page-title">徐涣</h1>
          <p className="page-description">TeX 维护源文件，PDF 作为正式展示版本。</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a className="inline-flex border border-ink bg-ink px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-stone-700" href="/resume/resume-v1-2026-06-26.pdf">
            查看 PDF
          </a>
          <a className="inline-flex border border-line bg-white px-4 py-2 text-sm font-medium text-ink shadow-sm transition hover:border-ink" href="/resume/resume-v1-2026-06-26.tex">
            下载 TeX
          </a>
        </div>
      </div>
      <a
        aria-label="打开徐涣简历 PDF"
        className="mt-10 block bg-white p-3 shadow-[0_18px_60px_rgba(41,37,36,0.14)] ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-[0_22px_70px_rgba(41,37,36,0.18)]"
        href="/resume/resume-v1-2026-06-26.pdf"
      >
        <Image
          alt="徐涣简历预览"
          className="h-auto w-full"
          height={1980}
          priority
          src="/resume/resume-preview.png"
          width={1400}
        />
      </a>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-stone-500">
        <span>点击预览可打开 PDF 原文。</span>
        <a className="text-ink underline decoration-line underline-offset-4 hover:decoration-ink" href="/resume/resume-v1-2026-06-26.pdf" download>
          下载 PDF
        </a>
      </div>
    </section>
  );
}

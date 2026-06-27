export const metadata = {
  title: "简历",
};

export default function ResumePage() {
  return (
    <section>
      <p className="page-kicker">Resume</p>
      <h1 className="page-title">简历</h1>
      <p className="page-description">简历以 TeX 作为源文件，页面直接展示由 TeX 生成的 PDF。</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a className="inline-flex border border-line bg-white px-4 py-2 text-sm font-medium text-ink shadow-sm transition hover:border-ink" href="/resume/resume-v1-2026-06-26.pdf">
          下载 PDF
        </a>
        <a className="inline-flex border border-line bg-white px-4 py-2 text-sm font-medium text-ink shadow-sm transition hover:border-ink" href="/resume/resume-v1-2026-06-26.tex">
          下载 TeX
        </a>
      </div>
      <div className="mt-8 overflow-hidden border border-line bg-white shadow-sm">
        <object
          aria-label="徐涣简历 PDF"
          className="h-[78vh] min-h-[720px] w-full"
          data="/resume/resume-v1-2026-06-26.pdf"
          type="application/pdf"
        >
          <div className="p-6 text-sm text-stone-600">
            当前浏览器无法内嵌预览 PDF，请使用上方下载入口查看。
          </div>
        </object>
      </div>
    </section>
  );
}

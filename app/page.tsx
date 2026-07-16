import Link from "next/link";

export default function HomePage() {
  return (
    <section className="py-10">
      <p className="page-kicker">徐涣 / Gelatoni</p>
      <h1 className="page-title mt-3">个人站点</h1>
      <p className="mt-6 max-w-2xl text-sm leading-7 text-stone-600">这里放文章、简历和项目入口。文章请进入“文章”页查看。</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link className="border border-ink bg-ink px-4 py-2 text-sm text-white" href="/articles">
          进入文章
        </Link>
        <Link className="border border-line bg-white px-4 py-2 text-sm text-ink" href="/resume">
          查看简历
        </Link>
      </div>
    </section>
  );
}

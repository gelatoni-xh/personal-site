import Link from "next/link";

export default function HomePage() {
  return (
    <section className="py-10">
      <p className="page-kicker">徐涣 / Gelatoni</p>
      <h1 className="page-title mt-3">个人站点</h1>
      <p className="mt-6 max-w-2xl text-sm leading-7 text-stone-600">襷の系譜</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link className="border border-ink bg-ink px-4 py-2 text-sm text-white" href="https://tasukikeifu.com" rel="noreferrer" target="_blank">
          襷の系譜
        </Link>
      </div>
    </section>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { getObservabilityOverview } from "@/lib/observability";
import { getMessages } from "@/lib/i18n";
import type { Locale } from "@/lib/content/articles";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "zh") return {};
  return { title: getMessages(locale).observability.metadataTitle, robots: { index: false, follow: false } };
}

function formatDateTime(value: string | null, locale: Locale, fallback: string) {
  if (!value) return fallback;
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function countTotal(values: Record<string, number>) {
  return Object.values(values).reduce((sum, value) => sum + value, 0);
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <div className="panel border-ink/70">
    <p className="text-xs font-medium text-stone-500">{label}</p>
    <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
    <p className="mt-2 text-sm text-stone-500">{hint}</p>
  </div>;
}

export default async function ObservabilityPage({ params }: Props) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "zh") notFound();
  const t = getMessages(locale).observability;
  const overview = await getObservabilityOverview();
  const langSmithProject = process.env.LANGSMITH_PROJECT ?? "tasuki-keifu-agent-v1";
  const date = (value: string | null) => formatDateTime(value, locale, t.noValue);

  return <section className="space-y-10">
    <div className="border-b border-line pb-8">
      <p className="page-kicker">{t.kicker}</p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">{t.title}</h1>
          <p className="page-description">{t.description}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link className="border border-line bg-white px-3 py-2" href={`/${locale}`}>{t.backHome}</Link>
          <Link className="border border-line bg-white px-3 py-2" href={`/${locale}/articles`}>{t.readArticles}</Link>
          <a className="border border-line bg-white px-3 py-2" href="https://smith.langchain.com" rel="noreferrer" target="_blank">{t.openLangSmith}</a>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-stone-500">
        <span>{t.dataSource}: {t.sourceStatus[overview.source]}</span>
        <span>{t.lastUpdated}: {date(overview.updatedAt)}</span>
        <span>{t.langSmithProject}: {langSmithProject}</span>
      </div>
      <p className="mt-3 text-sm text-stone-500">{t.sourceNote[overview.source]}</p>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label={t.stats.agentRuns[0]} value={`${countTotal(overview.counts.agentRuns)}`} hint={t.stats.agentRuns[1]} />
      <StatCard label={t.stats.governanceBatches[0]} value={`${countTotal(overview.counts.governanceBatches)}`} hint={t.stats.governanceBatches[1]} />
      <StatCard label={t.stats.subjects[0]} value={`${countTotal(overview.counts.governanceSubjects)}`} hint={t.stats.subjects[1]} />
      <StatCard label={t.stats.actions[0]} value={`${countTotal(overview.counts.actionExecutions)}`} hint={t.stats.actions[1]} />
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      {([
        [t.runStatus, overview.counts.agentRuns],
        [t.governanceStatus, overview.counts.governanceSubjects],
      ] as const).map(([title, values]) => <div className="panel" key={title}>
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="mt-4 space-y-3 text-sm">
          {Object.entries(values).map(([status, value]) => <div className="flex justify-between gap-4" key={status}><span className="capitalize text-stone-600">{status}</span><span className="font-mono">{value}</span></div>)}
          {Object.keys(values).length === 0 && <p className="text-stone-500">{t.noData}</p>}
        </div>
      </div>)}
    </div>

    <div className="grid gap-4 xl:grid-cols-2">
      <div className="panel"><h2 className="text-lg font-semibold">{t.recentRuns}</h2><div className="mt-5 space-y-4">
        {overview.recentRuns.map((run) => <article className="border border-line bg-stone-50 p-4" key={run.id}>
          <div className="flex flex-wrap gap-2 text-xs text-stone-500"><span className="border border-ink px-2 py-0.5 text-ink">{run.status}</span><span>{run.graphName}</span><span>{date(run.startedAt)}</span></div>
          <h3 className="mt-3 font-semibold">{run.personSlug ?? run.id}</h3>
          <p className="mt-2 text-sm text-stone-600">{t.currentNode}: {run.currentNode ?? t.noValue} · {t.thread}: {run.threadId ?? t.noValue}</p>
          {run.diagnosisSummary && <p className="mt-2 text-sm text-stone-600">{run.diagnosisSummary}</p>}
          {run.errorMessage && <p className="mt-2 text-sm text-red-700">{run.errorMessage}</p>}
        </article>)}
        {overview.recentRuns.length === 0 && <p className="text-sm text-stone-500">{t.noData}</p>}
      </div></div>
      <div className="panel"><h2 className="text-lg font-semibold">{t.recentSubjects}</h2><div className="mt-5 space-y-4">
        {overview.recentSubjects.map((subject) => <article className="border border-line bg-stone-50 p-4" key={subject.id}>
          <div className="flex flex-wrap gap-2 text-xs text-stone-500"><span className="border border-ink px-2 py-0.5 text-ink">{subject.status}</span><span>{subject.personSlug}</span><span>{date(subject.updatedAt)}</span></div>
          <p className="mt-3 text-sm text-stone-600">{t.risk}: {subject.riskLevel ?? t.noValue} · {t.governanceRun}: {subject.diagnosisRunId ?? t.noValue}</p>
          {subject.holdReason && <p className="mt-2 text-sm text-stone-600">{subject.holdReason}</p>}
        </article>)}
        {overview.recentSubjects.length === 0 && <p className="text-sm text-stone-500">{t.noData}</p>}
      </div></div>
    </div>

    <div className="grid gap-4 xl:grid-cols-2">
      <div className="panel"><h2 className="text-lg font-semibold">{t.recentActions}</h2><div className="mt-5 space-y-4">
        {overview.recentActions.map((action) => <article className="border border-line bg-stone-50 p-4" key={action.id}>
          <div className="flex flex-wrap gap-2 text-xs text-stone-500"><span className="border border-ink px-2 py-0.5 text-ink">{action.status}</span><span>{action.actionCode}</span><span>{date(action.endedAt ?? action.startedAt)}</span></div>
          <p className="mt-3 text-sm text-stone-600">{t.actionTitle}: {action.actionTitle ?? t.noValue}</p>
          <p className="mt-2 text-sm text-stone-600">{t.idempotencyKey}: {action.idempotencyKey}</p>
          {action.errorMessage && <p className="mt-2 text-sm text-red-700">{action.errorMessage}</p>}
        </article>)}
        {overview.recentActions.length === 0 && <p className="text-sm text-stone-500">{t.noData}</p>}
      </div></div>
      <div className="panel"><h2 className="text-lg font-semibold">{t.recentResults}</h2><div className="mt-5 space-y-4">
        {overview.recentDiagnosisResults.map((result) => <article className="border border-line bg-stone-50 p-4" key={result.id}>
          <div className="flex flex-wrap gap-2 text-xs text-stone-500"><span className="border border-ink px-2 py-0.5 text-ink">{result.status}</span><span>{result.personSlug ?? result.runId}</span><span>{date(result.createdAt)}</span></div>
          <p className="mt-3 text-sm text-stone-600">{t.findings}: {result.findingCount ?? t.noValue} · {t.resultActions}: {result.actionCount ?? t.noValue}</p>
          {result.summary && <p className="mt-2 text-sm text-stone-600">{result.summary}</p>}
        </article>)}
        {overview.recentDiagnosisResults.length === 0 && <p className="text-sm text-stone-500">{t.noData}</p>}
      </div></div>
    </div>
  </section>;
}

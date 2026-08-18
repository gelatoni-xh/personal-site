import Link from "next/link";
import { getObservabilityOverview } from "@/lib/observability";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "观测面板",
  robots: {
    index: false,
    follow: false,
  },
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "暂无";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function countTotal(values: Record<string, number>) {
  return Object.values(values).reduce((sum, value) => sum + value, 0);
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="panel rounded-none border-ink/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(249,245,239,0.96))]">
      <p className="text-xs uppercase tracking-[0.18em] text-stone-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
      <p className="mt-2 text-sm text-stone-500">{hint}</p>
    </div>
  );
}

function SectionTitle({
  kicker,
  title,
  description,
}: {
  kicker: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="page-kicker">{kicker}</p>
      <h1 className="page-title">{title}</h1>
      <p className="page-description">{description}</p>
    </div>
  );
}

export default async function ObservabilityPage() {
  const overview = await getObservabilityOverview();
  const langSmithProject = process.env.LANGSMITH_PROJECT ?? "tasuki-keifu-agent-v1";

  return (
    <section className="space-y-10">
      <div className="relative overflow-hidden border border-line bg-white px-6 py-8 shadow-sm sm:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(150,180,120,0.16),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(180,145,110,0.14),transparent_38%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionTitle
            kicker="Observability"
            title="我的 agent 观测面板"
            description="只读看板，直接读取 agent 运行库，用来查看最近治理、执行动作和结果摘要。"
          />
          <div className="flex flex-wrap gap-3 text-sm">
            <Link className="border border-ink bg-ink px-4 py-2 text-white" href="/">
              返回首页
            </Link>
            <Link className="border border-line bg-white px-4 py-2 text-ink" href="/articles">
              看文章
            </Link>
            <Link
              className="border border-line bg-white px-4 py-2 text-ink"
              href="https://smith.langchain.com"
              rel="noreferrer"
              target="_blank"
            >
              打开 LangSmith
            </Link>
          </div>
        </div>
        <div className="relative mt-6 flex flex-wrap gap-3 text-xs text-stone-500">
          <span className="border border-line bg-white px-2 py-1">数据源: {overview.source}</span>
          <span className="border border-line bg-white px-2 py-1">最后更新: {formatDateTime(overview.updatedAt)}</span>
          <span className="border border-line bg-white px-2 py-1">LangSmith 项目: {langSmithProject}</span>
        </div>
        <p className="relative mt-4 text-sm text-stone-500">{overview.note}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Agent Runs" value={`${countTotal(overview.counts.agentRuns)}`} hint="诊断任务总数" />
        <StatCard label="Governance Batches" value={`${countTotal(overview.counts.governanceBatches)}`} hint="批处理总数" />
        <StatCard label="Subjects" value={`${countTotal(overview.counts.governanceSubjects)}`} hint="进入治理的人/组织数" />
        <StatCard label="Actions" value={`${countTotal(overview.counts.actionExecutions)}`} hint="已规划或执行的动作数" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel">
          <h2 className="text-lg font-semibold text-ink">运行状态</h2>
          <div className="mt-4 space-y-3 text-sm">
            {Object.entries(overview.counts.agentRuns).map(([status, value]) => (
              <div className="flex items-center justify-between gap-4" key={status}>
                <span className="capitalize text-stone-600">{status}</span>
                <span className="font-mono text-ink">{value}</span>
              </div>
            ))}
            {Object.keys(overview.counts.agentRuns).length === 0 ? <p className="text-stone-500">暂无运行数据。</p> : null}
          </div>
        </div>
        <div className="panel">
          <h2 className="text-lg font-semibold text-ink">治理状态</h2>
          <div className="mt-4 space-y-3 text-sm">
            {Object.entries(overview.counts.governanceSubjects).map(([status, value]) => (
              <div className="flex items-center justify-between gap-4" key={status}>
                <span className="capitalize text-stone-600">{status}</span>
                <span className="font-mono text-ink">{value}</span>
              </div>
            ))}
            {Object.keys(overview.counts.governanceSubjects).length === 0 ? <p className="text-stone-500">暂无治理数据。</p> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="panel">
          <h2 className="text-lg font-semibold text-ink">最近运行</h2>
          <div className="mt-5 space-y-4">
            {overview.recentRuns.map((run) => (
              <article className="border border-line bg-stone-50 p-4" key={run.id}>
                <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                  <span className="border border-ink px-2 py-0.5 text-ink">{run.status}</span>
                  <span>{run.graphName}</span>
                  <span>{formatDateTime(run.startedAt)}</span>
                </div>
                <h3 className="mt-3 text-base font-semibold text-ink">{run.personSlug ?? run.id}</h3>
                <p className="mt-2 text-sm text-stone-600">
                  当前节点：{run.currentNode ?? "暂无"}，线程：{run.threadId ?? "暂无"}
                </p>
                {run.diagnosisSummary ? <p className="mt-2 text-sm text-stone-600">{run.diagnosisSummary}</p> : null}
                {run.errorMessage ? <p className="mt-2 text-sm text-red-700">{run.errorMessage}</p> : null}
              </article>
            ))}
            {overview.recentRuns.length === 0 ? <p className="text-sm text-stone-500">暂无运行记录。</p> : null}
          </div>
        </div>

        <div className="panel">
          <h2 className="text-lg font-semibold text-ink">最近治理对象</h2>
          <div className="mt-5 space-y-4">
            {overview.recentSubjects.map((subject) => (
              <article className="border border-line bg-stone-50 p-4" key={subject.id}>
                <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                  <span className="border border-ink px-2 py-0.5 text-ink">{subject.status}</span>
                  <span>{subject.personSlug}</span>
                  <span>{formatDateTime(subject.updatedAt)}</span>
                </div>
                <p className="mt-3 text-sm text-stone-600">
                  风险：{subject.riskLevel ?? "暂无"}，治理 run：{subject.diagnosisRunId ?? "暂无"}
                </p>
                {subject.holdReason ? <p className="mt-2 text-sm text-stone-600">{subject.holdReason}</p> : null}
              </article>
            ))}
            {overview.recentSubjects.length === 0 ? <p className="text-sm text-stone-500">暂无治理对象。</p> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="panel">
          <h2 className="text-lg font-semibold text-ink">最近动作</h2>
          <div className="mt-5 space-y-4">
            {overview.recentActions.map((action) => (
              <article className="border border-line bg-stone-50 p-4" key={action.id}>
                <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                  <span className="border border-ink px-2 py-0.5 text-ink">{action.status}</span>
                  <span>{action.actionCode}</span>
                  <span>{formatDateTime(action.endedAt ?? action.startedAt)}</span>
                </div>
                <p className="mt-3 text-sm text-stone-600">动作标题：{action.actionTitle ?? "暂无"}</p>
                <p className="mt-2 text-sm text-stone-600">幂等键：{action.idempotencyKey}</p>
                {action.errorMessage ? <p className="mt-2 text-sm text-red-700">{action.errorMessage}</p> : null}
              </article>
            ))}
            {overview.recentActions.length === 0 ? <p className="text-sm text-stone-500">暂无动作记录。</p> : null}
          </div>
        </div>

        <div className="panel">
          <h2 className="text-lg font-semibold text-ink">最近结果</h2>
          <div className="mt-5 space-y-4">
            {overview.recentDiagnosisResults.map((result) => (
              <article className="border border-line bg-stone-50 p-4" key={result.id}>
                <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                  <span className="border border-ink px-2 py-0.5 text-ink">{result.status}</span>
                  <span>{result.personSlug ?? result.runId}</span>
                  <span>{formatDateTime(result.createdAt)}</span>
                </div>
                <p className="mt-3 text-sm text-stone-600">
                  findings：{result.findingCount ?? "暂无"}，actions：{result.actionCount ?? "暂无"}
                </p>
                {result.summary ? <p className="mt-2 text-sm text-stone-600">{result.summary}</p> : null}
              </article>
            ))}
            {overview.recentDiagnosisResults.length === 0 ? <p className="text-sm text-stone-500">暂无结果。</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

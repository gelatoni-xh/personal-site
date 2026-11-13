import Link from "next/link";
import { notFound } from "next/navigation";
import { getObservabilityOverview } from "@/lib/observability";
import { batchName, count, dateTime, duration, errorExplanation, label, numeric, record, records, usageFor } from "@/lib/governance-display";

export const dynamic = "force-dynamic";
interface Props { params: Promise<{ locale: string }>; searchParams: Promise<{ task?: string }> }
export async function generateMetadata({ params }: Props) {
  return { title: (await params).locale === "zh" ? "数据治理观测" : "Data governance", robots: { index: false, follow: false } };
}
function Raw({ value, locale }: { value: unknown; locale: string }) {
  return <details className="mt-3 rounded-lg border border-line bg-stone-50 px-3 py-2 text-xs">
    <summary className="cursor-pointer font-medium text-stone-600">{locale === "zh" ? "查看原始数据" : "View raw data"}</summary>
    <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-all leading-6">{JSON.stringify(value, null, 2)}</pre>
  </details>;
}
function Badge({ status, locale }: { status: string; locale: string }) {
  const tone = status === "failed" ? "bg-red-50 text-red-800 border-red-200" : ["completed", "succeeded", "resolved", "sent", "applied"].includes(status) ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-stone-100 text-stone-700 border-stone-200";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>{label(status, locale)}</span>;
}
function Metric({ title, value, note, raw, locale }: { title: string; value: React.ReactNode; note: string; raw: unknown; locale: string }) {
  return <details className="group min-w-0 rounded-xl border border-line bg-white p-4">
    <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
      <span className="flex items-center justify-between gap-2 text-sm text-stone-600">{title}<span aria-hidden="true" className="text-lg text-stone-400 group-open:rotate-45">+</span></span>
      <span className="mt-3 block text-2xl font-semibold tabular-nums tracking-tight">{value}</span>
      <span className="mt-2 block text-xs leading-5 text-stone-500">{note}</span>
      <span className="sr-only">{locale === "zh" ? "，点击查看详情" : ", open details"}</span>
    </summary>
    <Raw value={raw} locale={locale} />
  </details>;
}
export default async function ObservabilityPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "zh") notFound();
  const t = (zh: string, en: string) => locale === "zh" ? zh : en;
  const data = await getObservabilityOverview((await searchParams).task);
  const current = data.tasks.find(task => task.id === data.selectedTaskId);
  const summary = record(current?.summary);
  const usage = usageFor(data);
  const complete = current && ["completed", "completed_with_unresolved"].includes(current.status);
  const done = data.batches.filter(b => ["completed", "completed_with_unresolved"].includes(b.status)).length;
  const rows = data.batches.reduce((n, b) => n + b.recordCount, 0);
  const elapsed = current?.completedAt ? new Date(current.completedAt).getTime() - new Date(current.createdAt).getTime() : null;
  const failedAttempt = [...data.attempts].reverse().find(a => a.status === "failed");
  const error = current?.errorMessage ?? failedAttempt?.errorMessage;
  const lastBatch = data.batches.find(b => b.status === "failed" || b.status === "running");
  const currentNode = lastBatch?.currentNode;
  const historyTitle = (task: typeof data.tasks[number]) => `${task.eventName ?? t("赛事名称未记录", "Event name not recorded")} · ${dateTime(task.createdAt, locale)}`;
  const unknown = t("尚未记录", "Not recorded");
  return <section className="space-y-8">
    <header className="border-b border-line pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="page-kicker">TASUKI KEIFU / OBSERVABILITY</p><Link href={`/${locale}/observability${current ? `?task=${current.id}` : ""}`} className="rounded-lg border border-line bg-white px-3 py-2 text-sm hover:bg-stone-50">{t("刷新数据", "Refresh")}</Link></div>
      <h1 className="page-title">{t("数据治理观测", "Data governance")}</h1>
      <p className="page-description">{t("先看执行进展、资源消耗与治理结果。点击指标或记录，可逐层查看明细与原始数据。", "Review progress, usage and outcomes. Open any metric or record for details and raw data.")}</p>
    </header>
    {data.source !== "configured" && <div className="panel" role="status">{data.source === "missing" ? t("尚未连接治理数据。", "Governance data is not connected.") : t("暂时无法读取数据，请稍后刷新。", "Data is temporarily unavailable. Please refresh later.")}</div>}
    {data.source === "configured" && !data.tasks.length && <p className="panel">{t("还没有治理任务。", "No governance runs yet.")}</p>}
    {current && <>
      <details className="rounded-xl border border-line bg-white p-4">
        <summary className="cursor-pointer text-sm font-medium">{t("切换历史执行", "Previous runs")} <span className="ml-2 font-normal text-stone-500">{t(`最近 ${data.tasks.length} 次 · 时间均为北京时间`, `Latest ${data.tasks.length} runs · China Standard Time`)}</span></summary>
        <nav aria-label={t("历史执行", "Run history")} className="mt-4 grid gap-2 md:grid-cols-2">{data.tasks.map(task => <Link aria-current={task.id === current.id ? "page" : undefined} key={task.id} href={`/${locale}/observability?task=${task.id}`} className={`space-y-2 rounded-lg border p-3 text-sm hover:border-moss ${task.id === current.id ? "border-moss bg-emerald-50" : "border-line"}`}><span className="block font-medium">{historyTitle(task)}</span><span className="flex flex-wrap items-center gap-2"><Badge status={task.status} locale={locale} /><span className="text-xs text-stone-500">{label(task.mode, locale)}</span></span></Link>)}</nav>
      </details>
      <section id="overview" className="scroll-mt-6 space-y-5" aria-label={t("本次执行概况", "Run overview")}>
        <div className="rounded-2xl border border-line bg-white p-6">
          <div className="flex flex-wrap items-center gap-2"><Badge status={current.status} locale={locale} /><span className="text-sm text-stone-500">{label(current.mode, locale)}</span></div>
          <h2 className="mt-4 text-2xl font-semibold leading-snug">{current.eventName ?? t("赛事名称未记录", "Event name not recorded")}</h2>
          <p className="mt-2 text-sm text-stone-500">{dateTime(current.createdAt, locale)} · {t("北京时间", "China Standard Time")}</p>
          <p className="mt-4 leading-7">{t(`本次包含 ${data.batches.length} 个区组、${count(rows)} 条输入，已完成 ${done} 个区组。`, `${data.batches.length} batches, ${count(rows)} input rows; ${done} batches completed.`)}</p>
          {current.status === "failed" && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4" role="status"><p className="font-medium text-red-900">{currentNode ? t(`停在「${label(currentNode, locale, "尚未命名的阶段")}」`, `Stopped at ${label(currentNode, locale, "an unlabelled stage")}`) : t("本次执行未完成", "This run did not complete")}</p><p className="mt-2 text-sm leading-6 text-red-800">{errorExplanation(error, locale)}</p><p className="mt-2 text-xs text-red-800">{t("下方保留失败前已记录的调用消耗；尚未生成的治理结果不会记为 0。", "Recorded usage before the failure is shown below. Outcomes not yet produced are not treated as zero.")}</p></div>}
          <Raw value={current} locale={locale} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric title={t("本次输入", "Input rows")} value={count(rows)} note={t(`${data.batches.length} 个区组；包含原始结果中的 DNS 等记录`, `${data.batches.length} batches, including DNS source rows`)} raw={data.batches.map(b => ({ id: b.id, recordCount: b.recordCount, unitKey: b.unitKey }))} locale={locale} />
          <Metric title={t("已完成区组", "Completed batches")} value={`${done} / ${data.batches.length}`} note={t("完成表示流程结束，不等于业务数据已写入", "Completion does not imply business writes")} raw={data.batches.map(b => ({ id: b.id, status: b.status }))} locale={locale} />
          <Metric title={t("总耗时", "Total elapsed")} value={duration(elapsed, locale)} note={elapsed === null ? t("任务尚未结束，最终耗时未生成", "Final duration is not available yet") : t("从任务创建到结束，包含排队和重试", "From task creation to completion, including queueing and retries")} raw={{ createdAt: current.createdAt, completedAt: current.completedAt, durationMs: elapsed }} locale={locale} />
          <Metric title={t("业务写入", "Business writes")} value={current.mode === "dry_run" ? "0" : count(summary.importedRows)} note={current.mode === "dry_run" ? t("本次为预演，只保存治理计划", "Dry run: governance plans only") : t("仅展示已确认的写入结果", "Confirmed writes only")} raw={{ mode: current.mode, importedRows: summary.importedRows ?? null }} locale={locale} />
        </div>
      </section>
      <nav className="flex flex-wrap gap-2 text-sm" aria-label={t("页面分区", "On this page")}>{[["usage", t("调用与成本", "Usage & cost")], ["batches", t("区组进展", "Batch progress")], ["outcomes", t("治理结果", "Outcomes")], ["mail", t("邮件通知", "Notifications")]].map(([id, title]) => <a key={id} href={`#${id}`} className="rounded-full border border-line bg-white px-4 py-2 hover:border-moss">{title}</a>)}</nav>
      <section id="usage" className="scroll-mt-6 space-y-4">
        <h2 className="text-xl font-semibold">{t("调用与成本", "Usage & cost")}</h2>
        <p className="text-sm leading-6 text-stone-500">{t("包含失败前已记录的消耗。未知费用不表示免费；各指标可点击查看数据依据。", "Includes recorded usage before failure. Unknown cost does not mean free. Open each metric for its source.")}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric title={t("模型调用", "Model calls")} value={usage.known ? count(usage.llmCalls) : "—"} note={t("已记录的实际 API 请求次数", "Recorded physical API requests")} raw={{ llmCalls: usage.known ? usage.llmCalls : null, calls: usage.calls }} locale={locale} />
          <Metric title={t("输入 / 输出 tokens", "Input / output tokens")} value={usage.known ? `${count(usage.inputTokens)} / ${count(usage.outputTokens)}` : "—"} note={t("模型用量；不是输入数据行数", "Model usage, not input row counts")} raw={{ inputTokens: usage.known ? usage.inputTokens : null, outputTokens: usage.known ? usage.outputTokens : null }} locale={locale} />
          <Metric title={t("估算费用", "Estimated cost")} value={usage.cost === null ? t("未核定", "Unverified") : `$${usage.cost.toFixed(4)}`} note={t("需要有效单价与用量，非账单金额", "Requires valid pricing and usage; not a bill")} raw={{ estimatedCostUsd: usage.cost }} locale={locale} />
          <Metric title={t("网络查询", "Web queries")} value={usage.known ? count(usage.networkCalls) : "—"} note={t("模型返回的网络查询工具调用数", "Web-search tool calls reported by the model")} raw={{ networkCalls: usage.known ? usage.networkCalls : null }} locale={locale} />
        </div>
        <details className="rounded-xl border border-line bg-white p-4"><summary className="cursor-pointer font-medium">{t("查看每次模型请求", "Inspect model requests")} <span className="text-sm font-normal text-stone-500">{t(`已记录 ${usage.calls.length} 条明细`, `${usage.calls.length} details recorded`)}</span></summary>
          <div className="mt-4 space-y-3">{usage.calls.map((call, i) => <article key={i} className="rounded-lg border border-line p-4 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">{i + 1}. {label(String(call.stage ?? call.category), locale, t("模型判断", "Model review"))}</h3><span className="tabular-nums text-stone-500">{duration(call.durationMs, locale)}</span></div><p className="mt-2 text-stone-600">{String(call.model ?? t("模型未记录", "Model not recorded"))} · {t("输入", "Input")} {count(call.inputTokens)} / {t("输出", "Output")} {count(call.outputTokens)} tokens</p>{call.stoppedReason ? <p className="mt-2 text-amber-800">{errorExplanation(String(call.stoppedReason), locale)}</p> : <p className="mt-2 text-stone-500">{call.responseStatus === "completed" ? t("本次模型请求已完成；不代表整组治理已完成。", "This model request completed; the overall batch may still be incomplete.") : t("未记录请求中止原因；后续阶段仍可能失败。", "No request stop reason recorded; later stages may still fail.")}</p>}<Raw value={call} locale={locale} /></article>)}{!usage.calls.length && <p className="text-sm text-stone-500">{t("暂无单次请求明细，不表示没有发生模型调用。", "No per-request details recorded. This does not imply no model calls.")}</p>}</div>
        </details>
      </section>
      <section id="batches" className="scroll-mt-6 space-y-4">
        <h2 className="text-xl font-semibold">{t("区组进展", "Batch progress")}</h2>
        {data.batches.map(batch => {
          const attempts = data.attempts.filter(a => a.batchId === batch.id);
          const agents = data.agents.filter(a => a.batchId === batch.id);
          const latest = attempts.at(-1);
          const batchUsage = usageFor(data, batch.id);
          const batchDone = ["completed", "completed_with_unresolved"].includes(batch.status);
          const stages = agents.flatMap(a => records(a.metrics?.normalizationStages));
          return <article key={batch.id} id={`batch-${batch.id}`} className="rounded-xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold">{batchName(batch, locale)} <span className="ml-2 text-sm font-normal text-stone-500">{count(batch.recordCount)} {t("条输入", "input rows")}</span></h3><Badge status={batch.status} locale={locale} /></div>
            <p className="mt-3 text-sm leading-6">{batchDone ? t("本组流程已结束。", "This batch has finished.") : batch.currentNode ? t(`最后记录阶段：${label(batch.currentNode, locale, "尚未命名的阶段")}。`, `Last recorded stage: ${label(batch.currentNode, locale, "unlabelled stage")}.`) : t("尚未记录执行阶段。", "No execution stage recorded yet.")}</p>
            {batch.status === "failed" && <p className="mt-2 text-sm leading-6 text-red-800">{errorExplanation(latest?.errorMessage, locale)}</p>}
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-600"><span>{t("模型调用", "Model calls")} {batchUsage.known ? count(batchUsage.llmCalls) : "—"}</span><span>{t("输入 / 输出 tokens", "Input / output tokens")} {batchUsage.known ? `${count(batchUsage.inputTokens)} / ${count(batchUsage.outputTokens)}` : "—"}</span><span>{t("待确认事项", "Open questions")} {batchDone ? count(batch.summary?.unresolved) : t("结果未生成", "Outcome pending")}</span></div>
            <details className="mt-4 border-t border-line pt-3"><summary className="cursor-pointer text-sm font-medium">{t("查看阶段与执行详情", "Stage and execution details")}</summary><div className="mt-4 space-y-4">
              {stages.length > 0 && <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="mb-2 text-left text-xs text-stone-500">{t("各阶段统计口径不同，解决数不能相加为最终人数。", "Stage counts use different scopes and cannot be summed as final people resolved.")}</caption><thead><tr className="border-b border-line text-stone-500"><th className="py-2 pr-3">{t("阶段", "Stage")}</th><th className="pr-3">{t("输入", "Input")}</th><th className="pr-3">{t("解决", "Resolved")}</th><th className="pr-3">{t("剩余", "Remaining")}</th><th>{t("耗时", "Time")}</th></tr></thead><tbody>{stages.map((s, i) => <tr key={i} className="border-b border-line"><td className="py-2 pr-3">{label(String(s.stage), locale)}</td><td>{count(s.inputCount)}</td><td>{count(s.resolvedCount)}</td><td>{count(s.remainingCount)}</td><td>{duration(s.durationMs, locale)}<Raw value={s} locale={locale} /></td></tr>)}</tbody></table></div>}
              {!agents.length && <p className="text-sm leading-6 text-stone-500">{t("尚未形成完整的 Agent 执行记录。模型请求可能已完成，其用量仍在上方展示。", "No finalized agent execution records yet. Completed model requests may still appear in usage above.")}</p>}
              {agents.map(a => <details key={a.id} className="rounded-lg border border-line p-3"><summary className="cursor-pointer text-sm">{label(a.agentKey, locale, t("治理 Agent", "Governance agent"))} · {label(a.status, locale)} · {duration(a.metrics?.durationMs, locale)}</summary><p className="mt-3 text-sm text-stone-600">{t("规则判断", "Rule decisions")} {count(a.metrics?.ruleDecisions)} · {t("模型调用", "Model calls")} {count(a.metrics?.llmCalls)}</p><Raw value={a} locale={locale} /></details>)}
              {attempts.map(a => <details key={a.id} className="rounded-lg border border-line p-3"><summary className="cursor-pointer text-sm">{t(`第 ${a.attemptNo} 次执行`, `Attempt ${a.attemptNo}`)} · {label(a.status, locale)} · {dateTime(a.startedAt, locale)}</summary>{a.errorMessage && <p className="mt-3 text-sm leading-6">{errorExplanation(a.errorMessage, locale)}</p>}<Raw value={a} locale={locale} /></details>)}
            </div></details>
            <Raw value={batch} locale={locale} />
          </article>;
        })}
      </section>
      <section id="outcomes" className="scroll-mt-6 space-y-4">
        <h2 className="text-xl font-semibold">{t("治理结果", "Governance outcomes")}</h2>
        {!complete && <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">{t("本次尚未完整结束，下方只展示已经保存的问题与变更。暂无记录不代表所有身份都已确认。", "This run is incomplete. Only saved findings and changes are shown. No records does not mean all identities were confirmed.")}</p>}
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric title={t("待确认事项", "Open questions")} value={complete ? count(summary.unresolved) : t("结果未生成", "Pending")} note={t("以最终治理报告为准", "Based on the final governance report")} raw={{ unresolved: summary.unresolved ?? null }} locale={locale} />
          <Metric title={t("计划导入", "Planned imports")} value={count(summary.plannedRows)} note={numeric(summary.plannedRows) === null ? unknown : t("已有完整计划的数据行数", "Rows with a finalized plan")} raw={{ plannedRows: summary.plannedRows ?? null }} locale={locale} />
          <Metric title={t("计划修复", "Planned repairs")} value={count(summary.plannedRepairs)} note={t("修复项不等于选手人数", "Repair items are not athlete counts")} raw={{ plannedRepairs: summary.plannedRepairs ?? null }} locale={locale} />
        </div>
        <details className="rounded-xl border border-line bg-white p-4"><summary className="cursor-pointer font-medium">{t("问题与依据", "Findings & evidence")} <span className="text-sm font-normal text-stone-500">{t(`已加载 ${data.findings.length} 条`, `${data.findings.length} loaded`)}</span></summary><div className="mt-4 space-y-3">{data.findings.map(f => <article key={f.id} className="rounded-lg border border-line p-4"><Badge status={f.resolutionStatus} locale={locale} /><p className="mt-3 text-sm leading-6">{f.reason}</p><details className="mt-3 text-sm"><summary className="cursor-pointer text-stone-600">{t("查看判断依据", "Review evidence")}</summary><div className="mt-3 space-y-3">{f.evidence.filter(e => e.url && /^https?:\/\//.test(e.url)).map((e, i) => <blockquote key={i} className="border-l-2 border-line pl-3 text-sm leading-6">{e.quote && <p>{e.quote.slice(0, 400)}</p>}<a href={e.url} target="_blank" rel="noreferrer" className="text-moss underline">{t("打开来源", "Open source")}</a></blockquote>)}{!f.evidence.length && <p className="text-stone-500">{t("暂无来源依据记录。", "No source evidence recorded.")}</p>}</div></details><Raw value={f} locale={locale} /></article>)}{!data.findings.length && <p className="text-sm text-stone-500">{t("暂无已保存的问题记录。", "No saved findings.")}</p>}</div></details>
        <details className="rounded-xl border border-line bg-white p-4"><summary className="cursor-pointer font-medium">{t("变更记录", "Changes")} <span className="text-sm font-normal text-stone-500">{t(`已加载 ${data.changes.length} 条`, `${data.changes.length} loaded`)}</span></summary><div className="mt-4 space-y-3">{data.changes.map(c => <article key={c.id} className="rounded-lg border border-line p-4 text-sm"><Badge status={c.status} locale={locale} /><p className="mt-3 leading-6">{c.reason ?? t("该变更未记录说明。", "No description recorded for this change.")}</p>{c.diff && <Raw value={c.diff} locale={locale} />}<Raw value={c} locale={locale} /></article>)}{!data.changes.length && <p className="text-sm text-stone-500">{t("暂无已保存的变更。", "No saved changes.")}</p>}</div></details>
      </section>
      <section id="mail" className="scroll-mt-6 space-y-4"><h2 className="text-xl font-semibold">{t("邮件通知", "Email notifications")}</h2>{data.notifications.map(n => <article key={n.id} className="rounded-xl border border-line bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-medium">{label(n.kind, locale)}{n.batchId && data.batches.find(b => b.id === n.batchId) ? ` · ${batchName(data.batches.find(b => b.id === n.batchId)!, locale)}` : ""}</h3><Badge status={n.status} locale={locale} /></div><p className="mt-2 text-xs text-stone-500">{n.sentAt ? dateTime(n.sentAt, locale) : t("尚未发送成功", "Not sent yet")} · {t(`已尝试 ${n.attemptCount} 次`, `${n.attemptCount} delivery attempts`)}</p>{n.errorMessage && <p className="mt-2 text-sm text-red-800">{t("邮件投递异常，查看原始记录了解详情。", "Email delivery failed. Open the raw record for details.")}</p>}<Raw value={n} locale={locale} /></article>)}{!data.notifications.length && <p className="text-sm text-stone-500">{t("暂无邮件通知。", "No email notifications.")}</p>}</section>
    </>}
    <footer className="border-t border-line pt-4 text-xs leading-6 text-stone-500">{t("页面只读。原始数据仅展示本站可读取的观测字段，不包含密钥、模型输入或完整响应。最多加载 20 个任务、300 个区组、1,000 次尝试及各 100 条执行、问题、变更和邮件记录，数量可能不是历史总量。", "Read-only. Raw views include observable fields only, never secrets, model inputs or full responses. Limits: 20 runs, 300 batches, 1,000 attempts and 100 each of executions, findings, changes and notifications; counts may not cover all history.")}</footer>
  </section>;
}

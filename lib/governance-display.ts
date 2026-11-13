import type { GovernanceOverview } from "./observability";

export type Json = Record<string, unknown>;
export const record = (v: unknown): Json => v && typeof v === "object" && !Array.isArray(v) ? v as Json : {};
export const records = (v: unknown): Json[] => Array.isArray(v) ? v.filter(i => i && typeof i === "object" && !Array.isArray(i)) as Json[] : [];
export const numeric = (v: unknown): number | null => v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v);
export const count = (v: unknown) => numeric(v)?.toLocaleString("en-US") ?? "—";
export function duration(v: unknown, locale: string) {
  const ms = numeric(v);
  if (ms === null) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} ${locale === "zh" ? "秒" : "s"}`;
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)} ${locale === "zh" ? "分" : "min"} ${rounded % 60} ${locale === "zh" ? "秒" : "s"}`;
}
export function dateTime(v: string | null | undefined, locale: string) {
  if (!v || !Number.isFinite(new Date(v).getTime())) return "—";
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Shanghai" }).format(new Date(v));
}
const names: Record<string, [string, string]> = {
  queued: ["等待执行", "Queued"], running: ["执行中", "Running"], failed: ["执行失败", "Failed"],
  completed: ["已完成", "Completed"], completed_with_unresolved: ["已完成，有待确认事项", "Completed with open questions"],
  succeeded: ["已完成", "Succeeded"], skipped: ["已跳过", "Skipped"], superseded: ["已被新尝试替代", "Superseded"],
  unresolved: ["待确认", "Needs confirmation"], resolved: ["已解决", "Resolved"], planned: ["待应用的计划", "Planned"],
  applied: ["已写入", "Applied"], sent: ["已发送", "Sent"], pending: ["等待发送", "Pending"], sending: ["发送中", "Sending"],
  dry_run: ["预演 · 不写入业务数据", "Dry run · no business writes"], apply: ["正式写入", "Apply"],
  normalization: ["组织与选手归一化", "Identity normalization"], membership: ["所属关系治理", "Membership governance"],
  person_facts: ["选手资料核验", "Athlete fact verification"],
  organization_rules: ["组织规则匹配", "Organization rules"], organization_light_batch: ["组织批量轻量判断", "Organization batch review"],
  person_rules: ["选手规则匹配", "Athlete rules"], person_resolve_identity: ["选手规则匹配", "Athlete rules"],
  person_light_batch: ["选手批量轻量判断", "Athlete batch review"], prepare_cross_check: ["准备交叉校验", "Prepare cross-check"],
  normalization_cross_check: ["组织与选手交叉校验", "Organization / athlete cross-check"],
  validate_cross_check: ["验证交叉校验结果", "Validate cross-check"], organization_adjudication: ["组织独立裁定", "Organization adjudication"],
  affected_person_reassessment: ["复核受影响选手", "Reassess affected athletes"], normalization_deep_research: ["深入调查待确认身份", "Investigate unresolved identities"],
  finalize_normalization: ["汇总归一化结果", "Finalize normalization"], govern_membership: ["所属关系治理", "Membership governance"],
  verify_person_facts: ["选手资料核验", "Verify athlete facts"], normalization_light: ["批量轻量判断", "Batch review"],
  person_identity: ["选手身份调查", "Athlete identity research"], event_summary: ["赛事总结", "Event summary"], batch_alert: ["区组告警", "Batch alert"],
  serious: ["需要关注", "Needs attention"], warning: ["提醒", "Warning"], info: ["一般记录", "Information"],
};
export function label(v: string, locale: string, fallback?: string) {
  return names[v]?.[locale === "zh" ? 0 : 1] ?? fallback ?? (locale === "zh" ? "其他记录" : "Other record");
}
export function batchName(b: { unitType: string; unitKey: string }, locale: string) {
  const n = b.unitKey.match(/(\d+)$/)?.[1];
  if (!n) return locale === "zh" ? "区组" : "Batch";
  return locale === "zh" ? `第 ${Number(n)} ${b.unitType === "leg" ? "区" : "组"}` : `${b.unitType === "leg" ? "Leg" : "Group"} ${Number(n)}`;
}
export function errorExplanation(error: string | null | undefined, locale: string) {
  const t = (zh: string, en: string) => locale === "zh" ? zh : en;
  if (!error) return t("尚无失败原因记录，查看阶段详情了解进度。", "No failure reason recorded. Open stage details for progress.");
  if (error.includes("research_scope_too_large")) return t("待校验内容超过了系统设置的单次请求大小上限，本次请求未发给模型。", "The review input exceeded the application's request-size limit. This request was not sent to the model.");
  if (/timeout|timed.out/i.test(error)) return t("模型请求未在设定时间内完成，流程已停止。", "The model request did not finish within the configured time limit.");
  if (error.includes("research_unusable_response")) return t("模型响应无法通过系统的格式或完整性校验，流程已停止。", "The model response failed format or completeness checks.");
  if (error.includes("budget_exhausted")) return t("本批次已达到系统设定的调用预算。", "The batch reached its configured request budget.");
  return t("本次执行遇到异常并停止，展开原始记录可查看错误信息。", "Execution stopped after an error. Open the raw record for details.");
}

export type Usage = {
  known: boolean; llmCalls: number; inputTokens: number; outputTokens: number;
  networkCalls: number; cost: number | null; calls: Json[];
};
// Saved execution metrics and the attempt journal may describe the same calls.
// The call IDs are scoped to an attempt, so identical requests on a fresh attempt still count.
export function usageFor(data: Pick<GovernanceOverview, "agents" | "attempts">, batchId?: string): Usage {
  const agents = data.agents.filter(a => !batchId || a.batchId === batchId);
  const attempts = data.attempts.filter(a => !batchId || a.batchId === batchId);
  const sources = agents.map(a => record(a.metrics)).filter(m => numeric(m.llmCalls) !== null);
  for (const attempt of attempts) {
    const accounted = new Set(agents.filter(a => a.attemptId === attempt.id).flatMap(a => Array.isArray(a.metrics?.accountedCallIds) ? a.metrics.accountedCallIds as string[] : []));
    for (const [id, metrics] of Object.entries(attempt.journal ?? {})) if (!accounted.has(id)) sources.push(record(metrics));
  }
  const sum = (key: string) => sources.reduce((n, m) => n + (numeric(m[key]) ?? 0), 0);
  const llmCalls = sum("llmCalls");
  const costKnown = sources.length > 0 && sources.every(m => !numeric(m.llmCalls) || m.costKnown === true);
  const cost = sum("estimatedCostUsd");
  return { known: sources.length > 0, llmCalls, inputTokens: sum("inputTokens"), outputTokens: sum("outputTokens"), networkCalls: sum("networkCalls"),
    // A zero configured price must not be presented as verified free usage.
    cost: costKnown && (!llmCalls || cost > 0) ? cost : null,
    calls: sources.flatMap(m => records(m.researchCalls)),
  };
}

import "server-only";

import postgres from "postgres";

type AgentDb = ReturnType<typeof postgres>;

type CountRow = {
  status: string;
  count: number;
};

type RecentRunRow = {
  id: string;
  graphName: string;
  status: string;
  currentNode: string | null;
  threadId: string | null;
  startedAt: Date;
  endedAt: Date | null;
  errorMessage: string | null;
  diagnosisStatus: string | null;
  diagnosisSummary: string | null;
  personSlug: string | null;
};

type RecentSubjectRow = {
  id: string;
  batchId: string;
  personId: string;
  personSlug: string;
  status: string;
  riskLevel: string | null;
  diagnosisRunId: string | null;
  holdReason: string | null;
  completedAt: Date | null;
  updatedAt: Date;
};

type RecentActionRow = {
  id: string;
  subjectId: string;
  actionCode: string;
  status: string;
  idempotencyKey: string;
  actionTitle: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
  errorMessage: string | null;
};

type RecentDiagnosisRow = {
  id: string;
  runId: string;
  status: string;
  personSlug: string | null;
  summary: string | null;
  findingCount: number | null;
  actionCount: number | null;
  createdAt: Date;
};

export type ObservabilityOverview = {
  source: "configured" | "missing" | "error";
  updatedAt: string | null;
  counts: {
    agentRuns: Record<string, number>;
    governanceBatches: Record<string, number>;
    governanceSubjects: Record<string, number>;
    actionExecutions: Record<string, number>;
  };
  recentRuns: Array<{
    id: string;
    graphName: string;
    status: string;
    currentNode: string | null;
    threadId: string | null;
    startedAt: string;
    endedAt: string | null;
    errorMessage: string | null;
    diagnosisStatus: string | null;
    diagnosisSummary: string | null;
    personSlug: string | null;
  }>;
  recentSubjects: Array<{
    id: string;
    batchId: string;
    personId: string;
    personSlug: string;
    status: string;
    riskLevel: string | null;
    diagnosisRunId: string | null;
    holdReason: string | null;
    completedAt: string | null;
    updatedAt: string;
  }>;
  recentActions: Array<{
    id: string;
    subjectId: string;
    actionCode: string;
    status: string;
    idempotencyKey: string;
    actionTitle: string | null;
    startedAt: string | null;
    endedAt: string | null;
    errorMessage: string | null;
  }>;
  recentDiagnosisResults: Array<{
    id: string;
    runId: string;
    status: string;
    personSlug: string | null;
    summary: string | null;
    findingCount: number | null;
    actionCount: number | null;
    createdAt: string;
  }>;
  note: string;
};

let agentDb: AgentDb | null = null;

function getAgentDb() {
  const databaseUrl = process.env.TASUKI_KEIFU_AGENT_DATABASE_URL?.trim();

  if (!databaseUrl) {
    return null;
  }

  if (!agentDb) {
    agentDb = postgres(databaseUrl, {
      max: 2,
      idle_timeout: 10,
      connect_timeout: 5,
    });
  }

  return agentDb;
}

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function normalizeCounts(rows: CountRow[]) {
  return Object.fromEntries(rows.map((row) => [row.status, row.count])) as Record<string, number>;
}

export async function getObservabilityOverview(): Promise<ObservabilityOverview> {
  const db = getAgentDb();

  if (!db) {
    return {
      source: "missing",
      updatedAt: null,
      counts: {
        agentRuns: {},
        governanceBatches: {},
        governanceSubjects: {},
        actionExecutions: {},
      },
      recentRuns: [],
      recentSubjects: [],
      recentActions: [],
      recentDiagnosisResults: [],
      note: "未配置 `TASUKI_KEIFU_AGENT_DATABASE_URL`。",
    };
  }

  try {
    const [agentRunStatusRows, batchStatusRows, subjectStatusRows, actionStatusRows, updatedAtRows] = await Promise.all([
      db<CountRow[]>`
        select status, count(*)::int as count
        from "AgentRun"
        group by "status"
        order by "status"
      `,
      db<CountRow[]>`
        select status, count(*)::int as count
        from "GovernanceBatch"
        group by "status"
        order by "status"
      `,
      db<CountRow[]>`
        select status, count(*)::int as count
        from "GovernanceSubject"
        group by "status"
        order by "status"
      `,
      db<CountRow[]>`
        select status, count(*)::int as count
        from "ActionExecution"
        group by "status"
        order by "status"
      `,
      db<{ updatedAt: Date | null }[]>`
        select max(ts) as "updatedAt"
        from (
          select "updatedAt" as ts from "AgentRun"
          union all
          select "updatedAt" as ts from "GovernanceBatch"
          union all
          select "updatedAt" as ts from "GovernanceSubject"
          union all
          select "updatedAt" as ts from "ActionExecution"
          union all
          select "updatedAt" as ts from "DiagnosisResult"
        ) as activity
      `,
    ]);

    const [recentRuns, recentSubjects, recentActions, recentDiagnosisResults] = await Promise.all([
      db<RecentRunRow[]>`
        select
          r.id,
          r."graphName" as "graphName",
          r.status,
          r."currentNode" as "currentNode",
          r."threadId" as "threadId",
          r."startedAt" as "startedAt",
          r."endedAt" as "endedAt",
          r."errorMessage" as "errorMessage",
          d.status as "diagnosisStatus",
          d.summary as "diagnosisSummary",
          d."personSlug" as "personSlug"
        from "AgentRun" r
        left join "DiagnosisResult" d on d."runId" = r.id
        order by r."startedAt" desc
        limit 8
      `,
      db<RecentSubjectRow[]>`
        select
          s.id,
          s."batchId" as "batchId",
          s."personId" as "personId",
          s."personSlug" as "personSlug",
          s.status,
          s."riskLevel" as "riskLevel",
          s."diagnosisRunId" as "diagnosisRunId",
          s."holdReason" as "holdReason",
          s."completedAt" as "completedAt",
          s."updatedAt" as "updatedAt"
        from "GovernanceSubject" s
        order by s."updatedAt" desc
        limit 8
      `,
      db<RecentActionRow[]>`
        select
          a.id,
          a."subjectId" as "subjectId",
          a."actionCode" as "actionCode",
          a.status,
          a."idempotencyKey" as "idempotencyKey",
          coalesce(a.action->>'title', a."actionCode") as "actionTitle",
          a."startedAt" as "startedAt",
          a."endedAt" as "endedAt",
          a."errorMessage" as "errorMessage"
        from "ActionExecution" a
        order by a."updatedAt" desc
        limit 8
      `,
      db<RecentDiagnosisRow[]>`
        select
          d.id,
          d."runId" as "runId",
          d.status,
          d."personSlug" as "personSlug",
          d.summary,
          case
            when jsonb_typeof(d.findings) = 'array' then jsonb_array_length(d.findings)
            else null
          end as "findingCount",
          case
            when jsonb_typeof(d.actions) = 'array' then jsonb_array_length(d.actions)
            else null
          end as "actionCount",
          d."createdAt" as "createdAt"
        from "DiagnosisResult" d
        order by d."createdAt" desc
        limit 8
      `,
    ]);

    return {
      source: "configured",
      updatedAt: toIso(updatedAtRows[0]?.updatedAt ?? null),
      counts: {
        agentRuns: normalizeCounts(agentRunStatusRows),
        governanceBatches: normalizeCounts(batchStatusRows),
        governanceSubjects: normalizeCounts(subjectStatusRows),
        actionExecutions: normalizeCounts(actionStatusRows),
      },
      recentRuns: recentRuns.map((row) => ({
        ...row,
        startedAt: row.startedAt.toISOString(),
        endedAt: toIso(row.endedAt),
      })),
      recentSubjects: recentSubjects.map((row) => ({
        ...row,
        completedAt: toIso(row.completedAt),
        updatedAt: row.updatedAt.toISOString(),
      })),
      recentActions: recentActions.map((row) => ({
        ...row,
        startedAt: toIso(row.startedAt),
        endedAt: toIso(row.endedAt),
      })),
      recentDiagnosisResults: recentDiagnosisResults.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
      note: "只读读取 agent 运行库，不包含原始输入输出。",
    };
  } catch (error) {
    console.error("observability_overview_failed", error);

    return {
      source: "error",
      updatedAt: null,
      counts: {
        agentRuns: {},
        governanceBatches: {},
        governanceSubjects: {},
        actionExecutions: {},
      },
      recentRuns: [],
      recentSubjects: [],
      recentActions: [],
      recentDiagnosisResults: [],
      note: "读取 agent 数据失败。",
    };
  }
}

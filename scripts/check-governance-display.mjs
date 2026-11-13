// Run with node --test scripts/check-governance-display.mjs (no runtime dependencies).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filename = path.resolve(__dirname, '../lib/governance-display.ts');
const compiled = new Module(filename);
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { usageFor, count, duration, errorExplanation } = compiled.exports;
const metrics = { llmCalls: 1, inputTokens: 100, outputTokens: 20, networkCalls: 0,
  estimatedCostUsd: 0, costKnown: true, researchCalls: [{ model: 'example' }] };

test('failed attempts retain usage without a finalized agent execution', () => {
  const result = usageFor({ agents: [], attempts: [{ id: 'a', batchId: 'b', journal: { call: metrics } }] });
  assert.equal(result.known, true);
  assert.equal(result.llmCalls, 1);
  assert.equal(result.inputTokens, 100);
  assert.equal(result.cost, null, 'zero configured prices are not verified free usage');
});
test('deduplication is scoped to the attempt, retaining repeated requests in later attempts', () => {
  const result = usageFor({
    agents: [{ attemptId: 'a', batchId: 'b', metrics: { ...metrics, accountedCallIds: ['call'] } }],
    attempts: [{ id: 'a', batchId: 'b', journal: { call: metrics } },
      { id: 'c', batchId: 'b', journal: { call: metrics } },
      { id: 'd', batchId: 'other', journal: { call: metrics } }],
  }, 'b');
  assert.equal(result.llmCalls, 2);
  assert.equal(result.inputTokens, 200);
  assert.equal(result.calls.length, 2);
});
test('missing metrics stay unknown; recorded zero and verified prices remain meaningful', () => {
  assert.equal(usageFor({ agents: [], attempts: [] }).known, false);
  assert.equal(count(null), '—');
  assert.equal(count(0), '0');
  const result = usageFor({ agents: [{ batchId: 'b', metrics: { ...metrics, estimatedCostUsd: 0.5 } }], attempts: [] });
  assert.equal(result.cost, 0.5);
});
test('human-readable duration rolls over minutes and explains application limits', () => {
  assert.equal(duration(119999, 'zh'), '2 分 0 秒');
  assert.equal(duration(null, 'zh'), '—');
  assert.match(errorExplanation('Cross-check model failure: research_scope_too_large', 'zh'), /本次请求未发给模型/);
});

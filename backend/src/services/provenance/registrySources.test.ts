import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { registryFrom } from './registrySources.ts';
import { guardResponse } from './aiGuard.ts';

function tempFile(contents: string, extension: string): string {
  const file = path.join(os.tmpdir(), `provenance_${Date.now()}_${Math.random()}${extension}`);
  fs.writeFileSync(file, contents, 'utf-8');
  return file;
}

test('text documents are indexed', async () => {
  const csv = tempFile('month,mrr\n2026-01,500000\n', '.csv');
  try {
    const registry = await registryFrom({
      documents: [{ mimeType: 'text/csv', localPath: csv }],
    });
    assert.equal(registry.has(500_000), true);
  } finally {
    fs.unlinkSync(csv);
  }
});

test('binary documents are skipped without failing', async () => {
  const registry = await registryFrom({
    documents: [{ mimeType: 'application/pdf', localPath: '/nonexistent/deck.pdf' }],
  });
  assert.equal(registry.size, 0);
});

test('an unreadable text document warns rather than throwing', async () => {
  const registry = await registryFrom({
    documents: [{ mimeType: 'text/csv', localPath: '/nonexistent/financials.csv' }],
  });
  assert.equal(registry.size, 0);
});

test("a figure from the founder's own answer is not a fabrication", async () => {
  const registry = await registryFrom({
    texts: ['{"stage":"seed"}', 'We are at 750000 MRR with 40 enterprise logos.'],
  });

  const verdict = {
    clarity_score: 62,
    fundability_verdict: 'Promising but Needs Metric Refinements',
    notes: ['Your 750000 MRR is real but concentrated.'],
  };

  const { report } = guardResponse(verdict, registry);
  assert.deepEqual(report.findings, []);
});

test('a figure the persona invented is caught', async () => {
  const registry = await registryFrom({
    texts: ['We are at 750000 MRR with 40 enterprise logos.'],
  });

  const verdict = {
    clarity_score: 62,
    notes: ['Your CAC payback of 19 months is far outside seed norms.'],
  };

  const { report } = guardResponse(verdict, registry);
  assert.equal(report.findings.length, 1);
  assert.deepEqual(report.findings[0]?.unsupported, [19]);
});

test('missing sources produce an empty registry, not an error', async () => {
  const registry = await registryFrom({});
  assert.equal(registry.size, 0);
});

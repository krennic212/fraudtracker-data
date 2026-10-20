import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildMeta, sha256 } from "./write-meta.mjs";

const rows = [
  { id: "a", name: "A", schemeId: "s1" },
  { id: "b", name: "B", schemeId: "s1" },
  { id: "c", name: "C", schemeId: "s2" },
];

test("meta: counts and hash follow harvest.json; updatedAt changes only when harvest.json does", () => {
  const text = `${JSON.stringify(rows, null, 2)}\n`;
  const first = buildMeta(text, null, "2026-10-20T15:00:00.000Z");
  assert.deepEqual({ rows: first.rows, schemes: first.schemes, harvestSha256: first.harvestSha256 }, { rows: 3, schemes: 2, harvestSha256: sha256(text) });
  assert.equal(first.updatedAt, "2026-10-20T15:00:00.000Z");
  // Same harvest.json again -> nothing changes, not even updatedAt.
  assert.deepEqual(buildMeta(text, first, "2026-10-20T16:00:00.000Z"), first);
  // A stale meta (counts from an older harvest.json, no hash: the 198-row / 9:58 AM case) is re-stamped.
  const stale = { updatedAt: "2026-10-20T14:58:12.304Z", rows: 198, schemes: 110 };
  const fixed = buildMeta(text, stale, "2026-10-20T16:24:36.000Z");
  assert.equal(fixed.rows, 3);
  assert.equal(fixed.updatedAt, "2026-10-20T16:24:36.000Z");
  const more = `${JSON.stringify([...rows, { id: "d", name: "D", schemeId: "s3" }], null, 2)}\n`;
  const next = buildMeta(more, first, "2026-10-20T17:00:00.000Z");
  assert.deepEqual([next.rows, next.schemes, next.updatedAt], [4, 3, "2026-10-20T17:00:00.000Z"]);
});

test("meta: the committed data/harvest-meta.json matches the committed data/harvest.json (run scripts/write-meta.mjs)", () => {
  const text = readFileSync(new URL("../data/harvest.json", import.meta.url), "utf8");
  const meta = JSON.parse(readFileSync(new URL("../data/harvest-meta.json", import.meta.url), "utf8"));
  const list = JSON.parse(text);
  assert.equal(meta.harvestSha256, sha256(text), "harvest-meta.json is stale: run node scripts/write-meta.mjs");
  assert.equal(meta.rows, list.length);
  assert.equal(meta.schemes, new Set(list.map((r) => r.schemeId || r.id || r.name)).size);
  assert.ok(Number.isFinite(Date.parse(meta.updatedAt)));
});

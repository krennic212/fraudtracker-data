#!/usr/bin/env node
/**
 * Row ids for data/harvest.json.
 *
 * Old ids cut the release URL slug at 48 chars, so two different releases that
 * share a long slug prefix (e.g. usao-md "maryland-man-facing-federal-...")
 * collided. An id is now the short readable prefix plus a hash of the FULL
 * source URL and the person's normalized name:
 *
 *   harvest-<48-char url slug>-<first 10 hex of sha1(sourceUrl + "|" + nameKey(name))>
 *
 * Same person + same release => same id on every run. Different release or
 * different defendant => different id.
 *
 *   node scripts/ledger-id.mjs data/harvest.json   # pre-publish check: exits 1 on duplicate ids
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { nameKey } from "./ledger-dedupe.mjs";

export function slug(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function rowId(sourceUrl, name) {
  const url = String(sourceUrl || "").trim();
  const hash = createHash("sha1").update(`${url}|${nameKey(name)}`).digest("hex").slice(0, 10);
  return `harvest-${slug(url)}-${hash}`;
}

/** Ids that appear on more than one row, with their counts. */
export function duplicateIds(rows) {
  const count = new Map();
  for (const r of rows) count.set(r?.id, (count.get(r?.id) || 0) + 1);
  return [...count].filter(([id, n]) => n > 1 || !id).map(([id, n]) => ({ id, n }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = process.argv[2] || "data/harvest.json";
  const rows = JSON.parse(readFileSync(file, "utf8"));
  const dups = duplicateIds(Array.isArray(rows) ? rows : []);
  if (dups.length) {
    console.error(`FAIL ${file}: duplicate or missing ids`);
    for (const { id, n } of dups) {
      const names = rows.filter((r) => r?.id === id).map((r) => r.name);
      console.error(`  ${id ?? "(missing)"} x${n}: ${names.join(" | ")}`);
    }
    process.exit(1);
  }
  console.log(`OK ${file}: ${rows.length} rows, all ids unique`);
}

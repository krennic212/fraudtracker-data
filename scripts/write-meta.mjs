#!/usr/bin/env node
/**
 * Writes data/harvest-meta.json from data/harvest.json: row and scheme counts, a sha256 of harvest.json, and
 * `updatedAt` = when the published rows last changed.
 *   node scripts/write-meta.mjs [ISO time]
 *
 * Safe to run every time (the hourly job runs it on every run, and `npm test` checks the committed pair):
 *   - harvest.json unchanged since the last stamp (same sha256) -> meta kept as is (updatedAt unchanged);
 *   - harvest.json changed and already committed (a seed / hand edit pushed without re-stamping) -> updatedAt = that
 *     commit's time;
 *   - harvest.json changed in the working tree (a harvest run) -> updatedAt = now.
 * Before 2026-10-20 the job stamped only when its own run changed harvest.json, so a pushed edit left the meta stale
 * (198 rows / 9:58 AM CDT while harvest.json had 328 rows).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const sha256 = (text) => createHash("sha256").update(text).digest("hex");

/** The meta object for this harvest.json text. prev = the current meta (or null); changedAt = time to use if changed. */
export function buildMeta(text, prev, changedAt) {
  const rows = JSON.parse(text);
  const list = Array.isArray(rows) ? rows : [];
  const hash = sha256(text);
  const meta = {
    updatedAt: prev && prev.harvestSha256 === hash && prev.updatedAt ? prev.updatedAt : changedAt,
    rows: list.length,
    schemes: new Set(list.map((r) => r.schemeId || r.id || r.name)).size,
    harvestSha256: hash,
    source: "https://github.com/krennic212/fraudtracker-data",
  };
  return meta;
}

function changedAt(file) {
  if (process.argv[2]) return process.argv[2];
  try {
    // Working tree equals HEAD -> the change was a commit: use that commit's time.
    execFileSync("git", ["diff", "--quiet", "HEAD", "--", file], { stdio: "ignore" });
    const iso = execFileSync("git", ["log", "-1", "--format=%cI", "--", file], { encoding: "utf8" }).trim();
    if (iso) return new Date(iso).toISOString();
  } catch {
    // Uncommitted change (or no git): now.
  }
  return new Date().toISOString();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = readFileSync("data/harvest.json", "utf8");
  const prev = existsSync("data/harvest-meta.json") ? JSON.parse(readFileSync("data/harvest-meta.json", "utf8")) : null;
  const hash = sha256(text);
  const meta = buildMeta(text, prev, prev?.harvestSha256 === hash ? prev.updatedAt : changedAt("data/harvest.json"));
  const out = `${JSON.stringify(meta, null, 2)}\n`;
  if (!existsSync("data/harvest-meta.json") || readFileSync("data/harvest-meta.json", "utf8") !== out) writeFileSync("data/harvest-meta.json", out);
  console.log(JSON.stringify(meta));
}

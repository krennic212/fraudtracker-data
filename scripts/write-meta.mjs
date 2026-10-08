#!/usr/bin/env node
/**
 * Writes data/harvest-meta.json. Run only when data/harvest.json changed, so
 * `updatedAt` is the time the published rows last changed.
 *   node scripts/write-meta.mjs [ISO time]
 */
import { readFileSync, writeFileSync } from "node:fs";

const rows = JSON.parse(readFileSync("data/harvest.json", "utf8"));
const list = Array.isArray(rows) ? rows : [];
const meta = {
  updatedAt: process.argv[2] || new Date().toISOString(),
  rows: list.length,
  schemes: new Set(list.map((r) => r.schemeId || r.id || r.name)).size,
  source: "https://github.com/krennic212/fraudtracker-data",
};
writeFileSync("data/harvest-meta.json", `${JSON.stringify(meta, null, 2)}\n`);
console.log(JSON.stringify(meta));

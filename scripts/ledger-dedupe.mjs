#!/usr/bin/env node
/**
 * Post-harvest cleanup for data/harvest.json. The ONLY things it changes:
 *  - cuts duplicate rows: same person + same case. "Same case" means the same
 *    source URL, or the same release slug posted at another official URL
 *    (e.g. justice.gov/usao-xx/pr/<slug> vs justice.gov/opa/pr/<slug>, or an
 *    OIG mirror of the same release). The first row in the file is kept as is.
 *  - blanks any photo field, so the data file never carries an image.
 * Every other row and field is left untouched. Writes only when something changed.
 *
 *   node scripts/ledger-dedupe.mjs data/harvest.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function nameKey(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function urlKey(url) {
  try {
    const u = new URL(String(url).trim());
    return `${u.hostname.replace(/^(www|legacy)\./, "")}${u.pathname.replace(/\/+$/, "")}`.toLowerCase();
  } catch {
    return String(url || "").trim().toLowerCase();
  }
}

/** Last path segment of a press-release URL, if it looks like a release slug. */
export function releaseSlug(url) {
  try {
    const seg = new URL(String(url).trim()).pathname.replace(/\/+$/, "").split("/").pop() || "";
    return seg.length >= 16 && /-/.test(seg) ? seg.toLowerCase() : "";
  } catch {
    return "";
  }
}

export function dedupeRows(rows) {
  const out = [];
  const merged = [];
  const seen = new Map(); // key -> kept row
  for (const r of rows) {
    const row = r && typeof r === "object" && r.photo ? { ...r, photo: "" } : r;
    const n = nameKey(row?.name);
    if (!n) {
      out.push(row);
      continue;
    }
    const keys = [`u|${n}|${urlKey(row.sourceUrl)}`];
    const s = releaseSlug(row.sourceUrl);
    if (s) keys.push(`s|${n}|${s}`);
    const hit = keys.map((k) => seen.get(k)).find(Boolean);
    if (hit) {
      merged.push({
        name: row.name,
        kept: hit.sourceUrl,
        dropped: row.sourceUrl,
        why: urlKey(hit.sourceUrl) === urlKey(row.sourceUrl) ? "same person, same URL" : "same person, same release at another URL",
      });
      continue;
    }
    keys.forEach((k) => seen.set(k, row));
    out.push(row);
  }
  return { rows: out, merged };
}

/** Each schemeId's dollars counted once, however many co-defendant rows it has. */
export function schemeTotals(rows) {
  const per = new Map();
  for (const r of rows) {
    const id = r.schemeId || r.id || r.name;
    const usd = r.usdPaid ?? r.usdBilled ?? r.usdRestitution ?? r.usdAlleged ?? r.allegedUsd ?? null;
    if (!per.has(id) || (per.get(id) == null && usd != null)) per.set(id, usd);
  }
  let usd = 0;
  for (const v of per.values()) usd += v ?? 0;
  return { schemes: per.size, usd };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = process.argv[2] || "data/harvest.json";
  const before = readFileSync(file, "utf8");
  const parsed = JSON.parse(before);
  const { rows, merged } = dedupeRows(Array.isArray(parsed) ? parsed : []);
  const after = `${JSON.stringify(rows, null, 2)}\n`;
  if (after !== before) writeFileSync(file, after);
  console.log(JSON.stringify({ file, rows: rows.length, merged, ...schemeTotals(rows), changed: after !== before }, null, 2));
}

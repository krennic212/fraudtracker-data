import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { keepBlob, strip, ingest } from "./harvest-gov.mjs";

// NDIL Oct 29, 2026: school board president charged with honest services fraud; the district paid with
// "Covid-era federal grant funds" (federal program money). Seeded with stage Charged; no nationality.
const rel = JSON.parse(readFileSync(new URL("./fixtures/ndil-2026-10-29-annette-johnson.json", import.meta.url), "utf8"));

test("Covid-era federal grant funds is program money (KEEP)", () => {
  assert.equal(keepBlob(strip(rel.title), strip(rel.body)), true);
  assert.equal(keepBlob("Man Charged With Wire Fraud", "He defrauded investors of $1 million."), false);
  assert.equal(keepBlob("Man Charged With Wire Fraud", "He defrauded investors during the Covid era."), false);
});

test("Annette Johnson seed: one Charged row, as printed, no nationality, no photo", () => {
  const seed = JSON.parse(readFileSync(new URL("../data/seed-releases.json", import.meta.url), "utf8"));
  const s = seed.releases.find((x) => x.link === rel.url);
  assert.ok(s);
  assert.deepEqual(s.names, ["ANNETTE JOHNSON"]);
  assert.equal(s.stage, "Charged");
  assert.ok(s.teaser.includes("ANNETTE JOHNSON") && strip(rel.body).includes(s.teaser));
  const existing = []; const added = [];
  ingest(existing, new Set(), added, { title: s.title, teaser: s.teaser, link: s.link, when: Date.parse(`${s.date}T12:00:00Z`), stage: s.stage, names: s.names, places: s.places, usdAlleged: s.usdAlleged }, "TheJusticeDept");
  assert.deepEqual(added, ["ANNETTE JOHNSON"]);
  const row = existing[0];
  assert.equal(row.stage, "Charged");
  assert.equal(row.city, "Aurora, IL");
  assert.equal(row.photo, "");
  assert.equal(row.voting, false);
  assert.equal(row.nationality, undefined);
});

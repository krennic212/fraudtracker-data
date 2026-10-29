// 2026-10-28 (Krennic approved): usao-nv "Two Aliens From Sudan and Afghanistan Charged for Illegal Voting" made no row:
// the DOJ API pass read it (body head, the teaser names nobody) but allPeople had no pattern for "<Name>, from <Country> and
// a lawful permanent resident, voted ...". Real release text: scripts/fixtures/usao-nv-2026-10-28-two-aliens-illegal-voting.json.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dojItem, rowsFromItem, ingest, alreadyListedVoter } from "./harvest-gov.mjs";
import { allPeople } from "./harvest-parse.mjs";

const rel = JSON.parse(readFileSync(new URL("./fixtures/usao-nv-2026-10-28-two-aliens-illegal-voting.json", import.meta.url), "utf8"));
const seed = JSON.parse(readFileSync(new URL("../data/seed-releases.json", import.meta.url), "utf8"));
const feed = JSON.parse(readFileSync(new URL("../data/harvest.json", import.meta.url), "utf8"));
const NAMES = ["Moneir Elzobier Ali Yousif", "Khalida Safi"];
const OFFICIALS = ["Sigal Chattah", "Erin Burke", "Christopher S. Delzotto", "Delzotto", "Chattah"];

describe("usao-nv Oct 28, 2026 illegal-voting release (DOJ API pass)", () => {
  const item = dojItem(rel);
  it("both named defendants, no quoted official", () => {
    assert.deepEqual(allPeople(item.title, item.teaser), NAMES);
    const rows = rowsFromItem(item, "TheJusticeDept");
    assert.deepEqual(rows.map((r) => r.name), NAMES);
    for (const r of rows) for (const o of OFFICIALS) assert.ok(!r.name.includes(o), `${r.name} ~ ${o}`);
  });
  it("rows are voting rows with one schemeId, no photo, district pin", () => {
    const rows = rowsFromItem(item, "TheJusticeDept");
    assert.ok(rows.every((r) => r.voting === true && r.photo === "" && r.city === "Las Vegas, NV"));
    assert.equal(new Set(rows.map((r) => r.schemeId)).size, 1);
  });
  it("ingest adds both, then nothing on a second pass", () => {
    const ex = [];
    const have = new Set();
    const added = [];
    ingest(ex, have, added, item, "TheJusticeDept");
    assert.deepEqual(added, NAMES);
    ingest(ex, have, added, item, "TheJusticeDept");
    assert.equal(ex.length, 2);
  });
});

describe("from-status wording", () => {
  it("needs non-citizen words after 'from <Country> and'", () => {
    assert.deepEqual(allPeople("X Charged", "On or about May 1, 2024, Jane Quincy Example, from Canada and a resident of Reno, voted in an election."), []);
  });
  it("a defendant sharing a quoted official's surname is kept (Desjon Antione Lang Burke style)", () => {
    const t = "On or about November 5, 2024, Desjon Antione Lang Burke, from Jamaica and a lawful permanent resident, voted in an election. “We will hold voters accountable,” said Erin Burke, Special Agent in Charge for HSI Los Angeles.";
    assert.deepEqual(allPeople("Alien Charged for Illegal Voting", t), ["Desjon Antione Lang Burke"]);
  });
});

describe("seed + live rows", () => {
  it("seed lists exactly the two defendants, Charged, voting, release nationality wording", () => {
    const s = seed.releases.find((r) => r.link === rel.url);
    assert.ok(s);
    assert.deepEqual(s.names, NAMES);
    assert.equal(s.stage, "Charged");
    assert.equal(s.voting, true);
    for (const n of NAMES) assert.ok(s.teaser.includes(s.nationality[n]), n);
  });
  it("feed: two Charged voting rows, one schemeId", () => {
    const rows = feed.filter((r) => r.sourceUrl === rel.url);
    assert.deepEqual(rows.map((r) => r.name).sort(), [...NAMES].sort());
    assert.ok(rows.every((r) => r.voting === true && r.stage === "Charged" && r.photo === ""));
    assert.equal(new Set(rows.map((r) => r.schemeId)).size, 1);
  });
});

describe("a later release of a listed voter is not a second voter row (any date)", () => {
  it("EDPA plea release (Oct 28) for a voter charged Sep 24", () => {
    const existing = [{ name: "Eduardo Gallardo Maldonado", voting: true, when: "2026-09-24", sourceUrl: "https://www.justice.gov/usao-edpa/pr/four-aliens-charged-election-fraud" }];
    assert.equal(alreadyListedVoter(existing, { name: "Eduardo Gallardo Maldonado", voting: true, when: "2026-10-28", sourceUrl: "https://www.justice.gov/usao-edpa/pr/alien-pleads-guilty-illegally-voting-2024-general-election" }), true);
    assert.equal(alreadyListedVoter(existing, { name: "Maria Gallardo Maldonado", voting: true, when: "2026-10-28", sourceUrl: "https://x.gov/y" }), false);
  });
});

describe("stage update: Eduardo Gallardo Maldonado pleaded guilty (EDPA Oct 28, 2026; Krennic 2026-10-28)", async () => {
  const { applyStageUpdates, dojItem: item, ingest: ing, harvestSeed } = await import("./harvest-gov.mjs");
  const ID = "harvest-https-www-justice-gov-usao-edpa-pr-four-aliens-c-60d1d58f3e";
  const PLEA = "https://www.justice.gov/usao-edpa/pr/alien-pleads-guilty-illegally-voting-2024-general-election";
  const rows = () => feed.filter((r) => r.name === "Eduardo Gallardo Maldonado");
  it("feed: exactly one row, same id and schemeId, Pleaded guilty, plea + sentencing sentences verbatim", () => {
    const [r, extra] = rows();
    assert.ok(r && !extra);
    assert.equal(r.id, ID);
    assert.equal(r.schemeId, "harvest-https-www-justice-gov-usao-edpa-pr-four-aliens-c-d646e1e39d");
    assert.equal(r.stage, "Pleaded guilty");
    assert.equal(r.stageSourceUrl, PLEA);
    assert.match(r.text, /Stage: Pleaded guilty\./);
    assert.ok(!/Stage: Charged/.test(r.text));
    assert.ok(r.text.includes("entered a plea of guilty today before United States Magistrate Judge Elizabeth L. Toplin to one count of voting as an alien."));
    assert.ok(r.text.includes("The defendant is scheduled to be sentenced on February 9"));
    assert.ok(r.text.includes("was charged by information with one count of voting as an alien.")); // DOJ wording kept
  });
  it("a harvest keeps it: seeds, the plea release itself and the update are all no-ops", () => {
    const ex = JSON.parse(JSON.stringify(feed));
    const have = new Set(ex.map((r) => `${r.sourceUrl || ""}|${r.id || ""}`));
    const added = [];
    harvestSeed(ex, have, added);
    const plea = { title: "Alien Pleads Guilty to Illegally Voting in 2024 General Election", url: PLEA, date: "1793188800", teaser: "", body: "<p>PHILADELPHIA – United States Attorney David Metcalf announced that Eduardo Gallardo Maldonado, 66, a Mexican citizen and lawful permanent resident of the United States who has been residing in Philadelphia, Pennsylvania, entered a plea of guilty today before United States Magistrate Judge Elizabeth L. Toplin to one count of voting as an alien.</p>" };
    ing(ex, have, added, item(plea), "TheJusticeDept");
    assert.deepEqual(applyStageUpdates(ex), []);
    assert.ok(!added.includes("Eduardo Gallardo Maldonado"));
    assert.equal(ex.filter((r) => r.name === "Eduardo Gallardo Maldonado").length, 1);
    assert.deepEqual(ex.find((r) => r.id === ID), rows()[0]);
  });
  it("a row reset to Charged is put back to Pleaded guilty once (idempotent)", () => {
    const r = { ...rows()[0], stage: "Charged", text: "X. As posted for this defendant: Y. Source: official Justice Department press. Stage: Charged (not convicted). Charges are allegations unless the page says convicted or a guilty plea." };
    delete r.stageSourceUrl;
    const ex = [r];
    assert.deepEqual(applyStageUpdates(ex), ["Eduardo Gallardo Maldonado"]);
    assert.equal(ex[0].stage, "Pleaded guilty");
    assert.equal((ex[0].text.match(/Stage: /g) || []).length, 1);
    const once = ex[0].text;
    assert.deepEqual(applyStageUpdates(ex), []);
    assert.equal(ex[0].text, once);
  });
});

// 2026-10-20 (9:46 AM CDT) Krennic: cross-post official voting cases from Invasion Update via the seed path.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { harvestSeed, rowsFromItem, nationalityAsPosted } from "./harvest-gov.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const seed = JSON.parse(readFileSync(join(root, "data/seed-releases.json"), "utf8"));
const feed = JSON.parse(readFileSync(join(root, "data/harvest.json"), "utf8"));

function runSeed(releases) {
  const dir = mkdtempSync(join(tmpdir(), "seed-"));
  const file = join(dir, "seed.json");
  writeFileSync(file, JSON.stringify({ releases }));
  const existing = [];
  harvestSeed(existing, new Set(), [], file);
  return existing;
}

const MN = "https://www.justice.gov/usao-mn/pr/federal-grand-jury-indicts-ten-foreign-nationals-voter-fraud-minnesota-elections";

describe("voting seeds", () => {
  const rows = runSeed([
    {
      link: MN,
      title: "Federal Grand Jury Indicts Ten Foreign Nationals for Voter Fraud in Minnesota Elections",
      date: "2026-09-30",
      teaser:
        "Fadil Rasim Ozegovic, 49, a Bosnian national, on one count of voting by alien. The defendant had his initial appearance in the District of Massachusetts on September 29, 2026. Hester Sophia Weihmann, 69, a South African national, on one count of making a false claim of citizenship in order to vote and one count of voting by alien.",
      stage: "Charged",
      names: ["Fadil Rasim Ozegovic", "Hester Sophia Weihmann"],
      voting: true,
    },
    {
      link: "https://www.justice.gov/usao-ndga/pr/three-aliens-charged-voting-federal-elections",
      title: "Three aliens charged with voting in federal elections",
      date: "2026-09-18",
      teaser: "Gabriel Covarrubias, 50, of Lawrenceville. Covarrubias is allegedly a citizen of Mexico who falsely claimed in a U.S. passport application to be a citizen.",
      stage: "Charged",
      names: ["Gabriel Covarrubias"],
      voting: true,
      nationality: { "Gabriel Covarrubias": "a citizen of Mexico" },
    },
  ]);
  it("files rows as voting with the voting origin and the given stage", () => {
    assert.equal(rows.length, 3);
    for (const r of rows) {
      assert.equal(r.voting, true);
      assert.equal(r.origin, "Voting / elections");
      assert.match(`${r.usa} ${r.text}`, /Stage: Charged/);
      assert.ok(!r.photo && !r.photoUrl, "no photos on seeded voting rows");
    }
  });
  it("one schemeId per release", () => {
    const mn = rows.filter((r) => r.sourceUrl === MN);
    assert.equal(new Set(mn.map((r) => r.schemeId)).size, 1);
  });
  it("an initial appearance in another district does not move the case there", () => {
    for (const r of rows.filter((r) => r.sourceUrl === MN)) assert.equal(r.city, "Minneapolis, MN");
  });
  it("uses the release's own nationality wording", () => {
    assert.equal(rows.find((r) => r.name === "Gabriel Covarrubias").nationality, "a citizen of Mexico");
    assert.equal(rows.find((r) => r.name === "Hester Sophia Weihmann").nationality, "a South African national");
  });
  it("a justice.gov link is a DOJ row, not DHS", () => {
    assert.equal(rows.find((r) => r.name === "Gabriel Covarrubias").office, "TheJusticeDept");
  });
});

describe("seed file voting entries", () => {
  const votes = seed.releases.filter((r) => r.voting === true);
  it("every person on a voting seed has non-citizen wording from the release", () => {
    assert.ok(votes.length >= 12);
    for (const r of votes) {
      const blob = `${r.title} ${r.teaser}`;
      for (const n of r.names) {
        const own = r.nationality?.[n];
        const ok = own ? blob.includes(own) : nationalityAsPosted(r.teaser.slice(r.teaser.indexOf(n)), n);
        assert.ok(ok, `${n}: no nationality wording`);
        assert.ok(r.teaser.includes(n), `${n} not in excerpt`);
      }
    }
  });
});

describe("live voting rows", () => {
  it("every voting row has a state", () => {
    for (const r of feed.filter((r) => r.voting)) assert.match(r.city, /, [A-Z]{2}$/, r.name);
  });
  it("no person is listed twice as a voter", () => {
    const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();
    const seen = new Map();
    for (const r of feed.filter((r) => r.voting)) {
      const k = norm(r.name);
      assert.ok(!seen.has(k), `duplicate voter ${r.name}`);
      seen.set(k, r);
    }
  });
});

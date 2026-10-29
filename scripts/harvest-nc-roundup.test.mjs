// 2026-10-29 (Krennic approved): OPA "Justice Department Charges 18 More in North Carolina with Illegally Voting in 2024
// Election" (real text: scripts/fixtures/opa-2026-10-29-nc-18-illegal-voting.json). The 12:11 PM CT run added 13 from the
// OPA body (EDNC 9 + WDNC 4) and 4 MDNC people came in via the Invasion Update cross-post; Phillip Alexander Carter (MDNC,
// "a native of Barbados and a lawful permanent resident", no age) was on neither. Fix: PERSON_NATIVE_STATUS; seed for the
// release (stage Charged + the release's own nationality words, filled on existing rows only when missing).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dojItem, rowsFromItem, harvestSeed } from "./harvest-gov.mjs";
import { allPeople } from "./harvest-parse.mjs";

const rel = JSON.parse(readFileSync(new URL("./fixtures/opa-2026-10-29-nc-18-illegal-voting.json", import.meta.url), "utf8"));
const seed = JSON.parse(readFileSync(new URL("../data/seed-releases.json", import.meta.url), "utf8"));
const feed = JSON.parse(readFileSync(new URL("../data/harvest.json", import.meta.url), "utf8"));
const NAMES = [
  "Selvin Porfidio Gonzalez Escobar", "Amerigo Di Nolfi", "Elizabeth Margaret Crudup", "Gregory Eugene Wade",
  "Jacqueline Yvonne Papandreou Brown", "Karl Anthony Wilkins", "Patricia Elena Valencia Cardona", "Richard John Reid",
  "Taso Gretes", "Adrianus Marinus Van Der Staak", "Saida Adali Hirachete Olivarez", "Juan Florencio Ramos",
  "Phillip Alexander Carter", "Yamila Avalos", "Michael Agah", "Luis Alberto DeJesus", "Serge Christian Dupont", "Edread Ray Stanley",
];
const OFFICIALS = ["McCotter", "Boyle", "Bishop", "Ferguson", "Reid Davis", "Zito"];

describe("OPA Oct 29, 2026 NC roundup (DOJ API pass)", () => {
  const item = dojItem(rel);
  it("all 18 defendants, no quoted official", () => {
    const got = allPeople(item.title, item.teaser);
    assert.deepEqual([...got].sort(), [...NAMES].sort());
    for (const o of OFFICIALS) assert.ok(!got.some((n) => n.includes(o) && n !== "Richard John Reid"), o);
  });
  it("18 voting rows from the release", () => {
    const rows = rowsFromItem(item, "TheJusticeDept");
    assert.equal(rows.length, 18);
    for (const r of rows) assert.equal(r.voting, true, r.name);
  });
  it("no-age native/national + permanent-resident wording only; a plain resident or a quoted official is not a name", () => {
    assert.deepEqual(allPeople("X", "Jane Q Example, a native of Canada and a resident of Wake County, North Carolina, is charged with voting."), []);
    assert.ok(!allPeople("X", "“Every vote matters,” said U.S. Attorney Russ Ferguson for the Western District of North Carolina, a native of Ohio and a lawful permanent resident.").some((n) => /Ferguson/.test(n)));
    assert.deepEqual(allPeople("X", "Phillip Alexander Carter, a native of Barbados and a lawful permanent resident of the United States living in Winston-Salem, North Carolina, is charged."), ["Phillip Alexander Carter"]);
  });
});

describe("seed for the NC roundup", () => {
  const s = seed.releases.filter((r) => r.link === rel.url);
  it("one seed: 18 names, Charged, voting, nationality verbatim in the release", () => {
    assert.equal(s.length, 1);
    assert.deepEqual(s[0].names, NAMES);
    assert.equal(s[0].stage, "Charged");
    assert.equal(s[0].voting, true);
    for (const n of NAMES) assert.ok(s[0].teaser.includes(s[0].nationality[n]), n);
  });
  it("feed: each of the 18 exactly once, Charged; seeding again is a no-op", () => {
    for (const n of NAMES) {
      const rows = feed.filter((r) => r.name === n && r.voting);
      assert.equal(rows.length, 1, n);
      assert.equal(rows[0].stage, "Charged", n);
      assert.ok(rows[0].nationality, n);
    }
    const ex = JSON.parse(JSON.stringify(feed));
    const have = new Set(ex.map((r) => `${r.sourceUrl || ""}|${r.id || ""}`));
    const added = [];
    harvestSeed(ex, have, added);
    assert.deepEqual(added, []);
    assert.deepEqual(ex, feed);
  });
  it("an existing stage or nationality is never replaced (Agah keeps 'a Nigerian national')", () => {
    const agah = feed.find((r) => r.name === "Michael Agah");
    assert.equal(agah.nationality, "a Nigerian national");
  });
});

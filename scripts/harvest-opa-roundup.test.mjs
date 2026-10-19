import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { allPeople } from "./harvest-parse.mjs";
import { dojItem, ingest, isOpaElectionRoundup, keepBlob, nationalityAsPosted, ownLine, rowsFromItem } from "./harvest-gov.mjs";
import { duplicateIds, schemeIdFor } from "./ledger-id.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const seed = JSON.parse(readFileSync(join(root, "data/seed-releases.json"), "utf8"));
const OPA = "https://www.justice.gov/opa/pr/justice-department-charges-28-foreign-nationals-california-election-crimes";
const rel = seed.releases.find((r) => r.link === OPA);
const TITLE = "Justice Department Charges 28 Foreign Nationals in California for Election Crimes";

const EXPECTED = [
  ["Omar Alexander Muñoz", "Los Angeles, CA", "a Belizean national"],
  ["Amandeep Kaur", "Los Angeles, CA", "an Indian national"],
  ["Ana Domínguez", "Los Angeles, CA", "a Salvadoran national"],
  ["Axel Giovani Prera García", "Los Angeles, CA", "a Guatemalan national"],
  ["Flavio Alejandro Zúñiga", "Los Angeles, CA", "a Mexico national"],
  ["Butleng Taing", "Los Angeles, CA", "a Cambodian national"],
  ["Carlos Antonio Galeas", "Los Angeles, CA", "a Honduran national"],
  ["Ernest Gutiérrez Ruvalcaba", "Los Angeles, CA", "a Mexican national"],
  ["Jesús Narez-Madrigal", "Los Angeles, CA", "a Mexican national"],
  ["José Antonio Bañuelos-Díaz", "Los Angeles, CA", "a Mexican national"],
  ["Muhammad Khan", "Los Angeles, CA", "a Pakistani national"],
  ["Rouzbeh Seyamaknejad", "Los Angeles, CA", "a Canadian national"],
  ["Sulema de León", "Los Angeles, CA", "a Mexican national"],
  ["Maricela Nazarín González", "Sacramento, CA", "a Mexican national"],
  ["Rony de Jesús Sicaja", "Sacramento, CA", "a Guatemalan national"],
  ["Camino Giles Jiménez", "Sacramento, CA", "a Mexican national"],
  ["Juan Antonio Rivas García", "Sacramento, CA", "a Mexican national"],
  ["Giezell Viduya Adawag", "Sacramento, CA", "a Philippines national"],
  ["Kamlesh Navnitlal Shah", "Sacramento, CA", "an Indian national"],
  ["Verónica Bullene", "San Francisco, CA", "a Mexican national"],
  ["David Shapiro", "San Francisco, CA", "a Georgian national"],
  ["Moe Thida Lwin", "San Francisco, CA", "a Myanmar national"],
  ["Manakotau Mataele Finau", "San Francisco, CA", "a Tongan national"],
  ["Maribel del Carmen Garcés Barriga", "San Francisco, CA", "an Ecuadoran national"],
  ["José Probitsado Amaro", "San Diego, CA", "a citizen of the Philippines"],
  ["Jennifer Jung", "San Diego, CA", "a Canadian national"],
  ["Erick Ronaldo Soto Mendizábal", "San Diego, CA", "a citizen of Guatemala"],
  ["Pamele Arbués Line", "San Diego, CA", "a citizen of the Philippines"],
];

describe("OPA multi-district election roundup (Operation Protect the Vote, 2026-10-19)", () => {
  it("parses all 28 names cleanly (accents, de León, del Carmen, no sentence run-on, no nationality rows)", () => {
    const names = allPeople(TITLE, rel.teaser);
    assert.deepEqual(names, EXPECTED.map((e) => e[0]));
    for (const n of names) {
      assert.doesNotMatch(n, /\./, `no sentence run-on: ${n}`);
      assert.doesNotMatch(n, /\b(?:national|citizen|states|california|district)\b/i, `not a person: ${n}`);
    }
  });

  it("never turns a nationality phrase or a run-on into a person", () => {
    const names = allPeople("", "in the United States. Camino Giles Jiménez, 51, a Mexican national living in Kerman, California, voted. Belizean National, 72, voted.");
    assert.deepEqual(names, ["Camino Giles Jiménez"]);
  });

  it("builds 28 rows: one shared schemeId, district pins, charged only, DOJ nationality verbatim, no dollars, no photos", () => {
    const item = { title: rel.title, teaser: rel.teaser, link: rel.link, when: Date.parse(`${rel.date}T12:00:00Z`), stage: rel.stage };
    assert.equal(keepBlob(item.title, item.teaser), true);
    const rows = rowsFromItem(item, "TheJusticeDept");
    assert.equal(rows.length, 28);
    assert.deepEqual(rows.map((r) => [r.name, r.city, r.nationality]), EXPECTED);
    assert.deepEqual([...new Set(rows.map((r) => r.schemeId))], [schemeIdFor(OPA)]);
    assert.equal(duplicateIds(rows).length, 0);
    for (const r of rows) {
      assert.equal(r.photo, "");
      assert.equal(r.stage, "Charged");
      assert.equal(r.voting, true);
      assert.equal(r.sourceUrl, OPA);
      assert.ok(!("usdAlleged" in r));
      assert.equal(r.entered, "Amount not stated");
      assert.doesNotMatch(r.text, /Stage: Convicted|pleaded guilty/);
      assert.match(r.text, /Stage: Charged \(not convicted\)/);
      assert.ok(r.text.includes(`As posted for this defendant: ${r.name}, `));
      assert.doesNotMatch(r.text, /illegal alien|unlawfully present|undocumented/i);
    }
  });

  it("quotes each defendant's own line, stopping at the next defendant or district header", () => {
    const names = allPeople(TITLE, rel.teaser);
    assert.equal(
      ownLine(rel.teaser, "Sulema de León", names),
      "Sulema de León, 35, a Mexican national and Long Beach, California, resident, fraudulently registered to vote in 2013, lied on her naturalization application in 2019, and voted in the November 2020 U.S. general election.",
    );
    const v = ownLine(rel.teaser, "Verónica Bullene", names);
    assert.match(v, /^Verónica Bullene, 43, a\.k\.a\. “Verónica Hernández Martínez,” a Mexican national living in Petaluma/);
    assert.equal(nationalityAsPosted(v, "Verónica Bullene"), "a Mexican national");
  });

  it("the hourly DOJ API path reads the full body of an OPA multi-district election release", () => {
    const api = {
      title: TITLE,
      url: OPA,
      date: String(Date.parse("2026-10-19T12:00:00Z") / 1000),
      teaser: "<p>Federal law enforcement throughout California today arrested 11 foreign nationals living in the United States who are among 28 total charged.</p>",
      body: `<p>${rel.teaser.replace(/ (Central|Eastern|Northern|Southern) District of California /g, "</p><h3>$1 District of California</h3><ul><li>").replace(/\. ([A-Z][^ ]+ [^,]+, \d{2},)/g, ".</li><li>$1")}</p>`,
    };
    assert.equal(isOpaElectionRoundup(api.url, api.title, dojItem(api).teaser), true);
    const existing = [];
    const added = [];
    ingest(existing, new Set(), added, dojItem(api), "TheJusticeDept");
    assert.deepEqual(added, EXPECTED.map((e) => e[0]));
    assert.deepEqual(existing.map((r) => r.city), EXPECTED.map((e) => e[1]));
    // Same release again (seed + API in one run): nothing added twice.
    const again = [];
    ingest(existing, new Set(existing.map((r) => `${r.sourceUrl}|${r.id}`)), again, dojItem(api), "TheJusticeDept");
    assert.deepEqual(again, []);
    // The USAO mirror of the same roundup does not re-add the same voters.
    const mirror = [];
    ingest(existing, new Set(existing.map((r) => `${r.sourceUrl}|${r.id}`)), mirror, {
      ...dojItem(api),
      link: "https://www.justice.gov/usao-cdca/pr/11-foreign-nationals-arrested-california-federal-charges-alleging-they-illegally",
    }, "TheJusticeDept");
    assert.deepEqual(mirror, []);
  });

  it("a usao- release keeps the short teaser (body is read only for OPA election roundups)", () => {
    const r = { title: "Man Sentenced", url: "https://www.justice.gov/usao-wdpa/pr/x-y-z-sentenced", date: "1792000000", teaser: "<p>short</p>", body: "<p>long body District of A District of B</p>" };
    assert.equal(dojItem(r).teaser, "short");
  });
});

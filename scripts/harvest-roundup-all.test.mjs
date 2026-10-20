// Multi-defendant DOJ voting roundups: every named defendant becomes a row (Krennic 2026-10-20). The Oct 12, Oct 5
// and Sept 18, 2026 OPA roundups were only partly captured: section headers / photo captions glued onto names ("New
// Mexico Patrick Perea", "Photo of Avila Gomez"), a stray space before a comma ("Celestin Katubadi , 20,"), no-age
// "Name of County, State, was charged" cases, and roundups whose district headers were the only place words.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dojItem, ingest, alreadyListedVoter, districtNearName } from "./harvest-gov.mjs";
import { allPeople, stripLeadPlace } from "./harvest-parse.mjs";

const fx = JSON.parse(readFileSync(new URL("./fixtures/opa-voting-roundups-2026.json", import.meta.url), "utf8"));
const rel = (k) => fx.find((r) => r.url.includes(k));
const rowsOf = (r) => {
  const existing = [];
  const added = [];
  ingest(existing, new Set(), added, dojItem(r), "TheJusticeDept");
  return existing;
};

describe("OPA voting roundups: every named defendant", () => {
  it("Oct 5, 2026 (16 aliens): all 16, each pinned to its district", () => {
    const rows = rowsOf(rel("involving-16-aliens-election-crimes"));
    assert.deepEqual(rows.map((r) => r.name), ["Andrea Catanese", "Terrance Patrick Evans", "Pedro Pablo Ruiz", "Zianya Yllaly Zamorano", "Dudley Francisco Zeledon", "Sara Luma", "Bhator Konah Bryant", "Edvile Vaidoto Edmunds", "Joshua Frederick Kofi Edzie", "Alan Barbu Kargbo", "Paul Kras", "Fadil Rasim Ozegovic", "Aparecido Donizetti Padovan", "Chris Adam Pettiquoi", "Christian Liam Schenk", "Hester Sophia Weihmann"]);
    assert.equal(rows.find((r) => r.name === "Andrea Catanese").city, "Tampa, FL");
    assert.equal(rows.find((r) => r.name === "Pedro Pablo Ruiz").city, "New Orleans, LA");
    assert.equal(rows.find((r) => r.name === "Paul Kras").city, "Minneapolis, MN");
    for (const r of rows) assert.equal(r.voting, true, r.name);
    assert.equal(new Set(rows.map((r) => r.schemeId)).size, 1, "one shared schemeId per release");
  });
  it("Oct 12, 2026 (16 individuals): all 16, no state / country glued onto a name", () => {
    const names = rowsOf(rel("involving-16-individuals-election-crimes")).map((r) => r.name);
    assert.equal(names.length, 16);
    for (const n of ["Patrick Perea", "Hacina Saadi", "Jamil Ahmad", "Nighat Jamil", "Paulo Silva", "Silvia Delgado Phelps", "Staciann Pollion Davis", "Forrest Scott Woody", "Stanley Walton", "Lizabeth Almonte Rosa", "Cary Ann Patterson", "Arshed Zuberi", "Eliza M. Moss", "Dawid Nalepa", "Sandra Madeline Watson"]) assert.ok(names.includes(n), n);
    assert.ok(!names.some((n) => /^(?:New Mexico|New Jersey|Dominican Republic) /.test(n)), names.join(" | "));
  });
  it("Sept 18, 2026 (16 individuals): all 16, incl. Katubadi (space before comma) and Avila Gomez (photo caption)", () => {
    const names = allPeople(rel("16-individuals-illegal-voting").title, dojItem(rel("16-individuals-illegal-voting")).teaser);
    for (const n of ["Moises Anwar Arellano-Alba", "Helen Sayen Adams", "Celestin Katubadi", "Monica Carzoli", "Julieta Englestad", "Avila Gomez", "Santana Coulibaly", "Victoria Viktorivna Aquilina"]) assert.ok(names.includes(n), n);
    assert.ok(!names.some((n) => /^(?:Photo of|of) /.test(n)), names.join(" | "));
    assert.equal(rowsOf(rel("16-individuals-illegal-voting")).length, 16);
  });
  it("Sept 4, 2026 (five charged): Mercedes Alexandra Cardoso (no age, 'of Union County, New Jersey, was charged')", () => {
    const names = rowsOf(rel("five-charged-pennsylvania")).map((r) => r.name);
    assert.deepEqual(names.sort(), ["Jesus Javier Jurado Garcia", "Katya Rodriguez", "Marisol Guzman", "Mercedes Alexandra Cardoso", "Thomas Holtzman"]);
  });
});

describe("lead-in strip and short-name dedupe", () => {
  it("strips a place / caption lead-in only when the text has it right before the person", () => {
    assert.equal(stripLeadPlace("New Mexico Patrick Perea", "District of New Mexico Patrick Perea, 62,"), "Patrick Perea");
    assert.equal(stripLeadPlace("Haiti Dilea Ochoa-Perez", "an illegal alien from Haiti Dilea Ochoa-Perez, 43,"), "Dilea Ochoa-Perez");
    assert.equal(stripLeadPlace("Virginia Lopez Garcia", "Virginia Lopez Garcia, 40, was charged."), "Virginia Lopez Garcia");
    assert.equal(stripLeadPlace("Jordan Lee Smith", "Jordan Lee Smith, 33, pleaded guilty."), "Jordan Lee Smith");
  });
  it("district header before the name pins the row; an initial-appearance district does not", () => {
    assert.equal(districtNearName("Eastern District of Louisiana Three aliens ... Cuban national Pedro Pablo Ruiz, 68,", "Pedro Pablo Ruiz").city, "New Orleans, LA");
    assert.equal(districtNearName("had an initial appearance in the District of Massachusetts. Jane Roe, 40,", "Jane Roe"), null);
  });
  it("a roundup's short form of a listed voter is the same person (within 14 days)", () => {
    const e = [{ name: "Fredy Avila Gomez", voting: true, when: "2026-09-18", sourceUrl: "https://www.justice.gov/usao-id/pr/x" }, { name: "Monica Ivette Carzoli Carillo", voting: true, when: "2026-09-18", sourceUrl: "https://www.justice.gov/usao-wdtx/pr/y" }];
    const row = (name) => ({ name, voting: true, when: "2026-09-18", sourceUrl: "https://www.justice.gov/opa/pr/z" });
    assert.ok(alreadyListedVoter(e, row("Avila Gomez")));
    assert.ok(alreadyListedVoter(e, row("Monica Carzoli")));
    assert.ok(!alreadyListedVoter(e, row("Gomez")));
    assert.ok(!alreadyListedVoter(e, row("Maria Gomez")));
  });
});

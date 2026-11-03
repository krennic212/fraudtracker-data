import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { strip, ingest, dojItem, rowsFromItem, sectionGeo, ofPlaceNearName, titleNationalsCoverAll } from "./harvest-gov.mjs";
import { allPeople } from "./harvest-parse.mjs";

// Krennic 2026-11-03: filter + name-parser fixes from the Nov 2 missed-cases check. Real release text in scripts/fixtures.
const fx = (f) => JSON.parse(readFileSync(new URL(`./fixtures/${f}`, import.meta.url), "utf8"));
const opa63 = fx("opa-2026-11-02-63-individuals-election.json");
const mailyan = fx("opa-2026-10-30-mailyan-botox.json");
const kalder = fx("sdny-2026-10-30-kalder-guven.json");
const mdpa = fx("mdpa-2026-10-30-chinese-nationals-elderly-scam.json");
const rows63 = rowsFromItem(dojItem(opa63), "TheJusticeDept");
const at = (n) => rows63.find((r) => r.name === n);

describe("plural title 'Chinese Nationals' covers every named defendant only with no U.S.-citizen wording", () => {
  const title = strip(mdpa.title);
  const body = strip(mdpa.body);
  it("MDPA Oct 30, 2026: Jiang, Yang and Bao all qualify", () => {
    assert.equal(titleNationalsCoverAll(title, body), true);
    const ex = [], added = [];
    ingest(ex, new Set(), added, { title, teaser: body.slice(0, 3000), fullText: body, link: mdpa.url, when: Date.parse("2026-10-30T12:00:00Z"), names: ["Yankun Jiang", "Hanlin Yang", "Lei Bao"] }, "TheJusticeDept");
    assert.deepEqual(added.sort(), ["Hanlin Yang", "Lei Bao", "Yankun Jiang"]);
  });
  it("never with a U.S. citizen, dual, naturalized or 'one U.S. citizen' wording, or a singular title", () => {
    for (const extra of ["Five Chinese nationals and one U.S. citizen were sentenced.", "Bao is a dual citizen.", "Yang is a naturalized citizen.", "Jiang, a citizen of the United States, ...", "Bao, an American citizen, ...", "Yang was U.S.-born."]) assert.equal(titleNationalsCoverAll(title, `${body} ${extra}`), false, extra);
    assert.equal(titleNationalsCoverAll("Chinese National Sentenced", body), false);
    assert.equal(titleNationalsCoverAll("Cuban Nationals and Florida Man Sentenced", "Five Cuban nationals and one U.S. citizen were sentenced today."), false);
  });
});

describe("name parsers", () => {
  it("nationality words are not part of the name (Toleafoa, Ramadhani, Gudino)", () => {
    for (const n of ["Valelia Toleafoa", "Mlebinge Riziki Ramadhani", "Juan Manuel Gudino", "Adrianus Marinus Van Der Staak", "Yamila Avalos"]) assert.ok(at(n), n);
    assert.ok(!rows63.some((r) => /\bnational\b/i.test(r.name)), rows63.map((r) => r.name).filter((n) => /national/i.test(n)).join(";"));
  });
  it("'St.' stays inside a name: Garfield St. Vincent Bruce", () => {
    assert.ok(at("Garfield St. Vincent Bruce"));
    assert.ok(!at("Vincent Bruce"));
    assert.deepEqual(allPeople("", "St. Kitts and Nevis national Edread Ray Stanley, 63, a lawful permanent resident, has been charged."), ["Edread Ray Stanley"]);
  });
  it("each roundup defendant is pinned to its own district section", () => {
    const pins = { "Ali Khan": "Houston, TX", "Jose Vasquez-Mendoza": "Houston, TX", "Pooja Pawse": "Albany, NY", "Mobin Tora Kheil": "Albany, NY", "Valelia Toleafoa": "Salt Lake City, UT", "Mlebinge Riziki Ramadhani": "Las Vegas, NV", "Juan Manuel Gudino": "Little Rock, AR", "Gavin Moir": "Philadelphia, PA", "Benito Covarrubias Iniguez": "Atlanta, GA", "Sirgalahad Camua": "Los Angeles, CA" };
    for (const [n, c] of Object.entries(pins)) assert.equal(at(n)?.city, c, n);
    assert.equal(sectionGeo("Usual single-district text about John Doe, 40, of Atlanta.", "John Doe"), null);
  });
  it("ALL-CAPS names with Unicode letters: GÖKÇE GÜVEN, not 'Kalder Inc.'", () => {
    const rows = rowsFromItem(dojItem(kalder), "TheJusticeDept");
    assert.deepEqual(rows.map((r) => r.name), ["GÖKÇE GÜVEN"]);
  });
  it("'California doctor Violetta Mailyan was sentenced' gets a row, placed by her own 'of Glendale, California'", () => {
    const rows = rowsFromItem(dojItem(mailyan), "TheJusticeDept");
    assert.deepEqual(rows.map((r) => `${r.name} @ ${r.city}`), ["Violetta Mailyan @ Glendale, CA"]);
    assert.equal(ofPlaceNearName("Violetta Mailyan, 45, of Glendale, California, owned a clinic.", "Violetta Mailyan").city, "Glendale, CA");
  });
  it("a one-word name only in a clearly structured list entry (Widarto)", () => {
    assert.equal(at("Widarto")?.city, "Philadelphia, PA");
    assert.deepEqual(allPeople("", "Indonesian national Widarto, 56, a lawful permanent resident, has been charged with voting by an alien. Widarto allegedly voted."), []);
    const list = "Canadian national Gavin Moir, 55, a lawful permanent resident, has been charged. Jamaican national Antonio Lyttle, 68, a lawful permanent resident, has been charged. Finnish national Eija Annikki Yaroma, 66, a lawful permanent resident, has been charged. ";
    assert.ok(allPeople("", `${list}Indonesian national Widarto, 56, a lawful permanent resident, has been charged with voting by an alien. Widarto allegedly voted.`).includes("Widarto"));
    assert.ok(!allPeople("", `${list}Indonesian national Widarto, 56, a lawful permanent resident, has been charged with voting by an alien. He allegedly voted.`).includes("Widarto"));
  });
});

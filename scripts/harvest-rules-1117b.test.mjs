import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { keepBlob, isExcluded, loadExclude } from "./harvest-gov.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const seed = JSON.parse(readFileSync(join(root, "data/seed-releases.json"), "utf8"));
const byName = (n) => seed.releases.find((r) => (r.names || []).includes(n));

// Krennic 2026-11-17 evening: Affordable Connectivity Program + "defrauded the U.S, government"
// typo; state-government / unclaimed-property money counts as government money; Dila Belmili excluded.

describe("government-program: Affordable Connectivity Program / defrauded the government typo (Krennic 2026-11-17)", () => {
  it("Krandon Wenger (EDPA Nov 17, $741k ACP / 'defrauded the U.S, government') now keeps", () => {
    const r = byName("Krandon Wenger");
    assert.ok(r, "Wenger seed");
    assert.equal(keepBlob(r.title, r.teaser), true);
  });

  it("the official typo 'defrauded the U.S, government' and the corrected 'U.S. government' both keep", () => {
    assert.equal(keepBlob("Man Sentenced", "a pandemic program fraud scheme that defrauded the U.S, government of more than $741,000"), true);
    assert.equal(keepBlob("Man Sentenced", "a scheme that defrauded the U.S. government of more than $741,000"), true);
  });

  it("'Affordable Connectivity Program' in the body is enough even without the defraud typo", () => {
    assert.equal(keepBlob("Man Sentenced for Wire Fraud", 'The Affordable Connectivity Program ("ACP") was funded by the 2021 Infrastructure Investment and Jobs Act.'), true);
  });

  it("still does not keep a private-investor defraud (existing rule)", () => {
    assert.equal(keepBlob("Man Pleads Guilty to Wire Fraud", "He defrauded investors of $2 million."), false);
  });
});

describe("government money taken from a state government (Krennic 2026-11-17)", () => {
  it("Cirt Lindsay (D. Vt. unclaimed property maintained by state governments) now keeps", () => {
    const r = byName("Cirt Lindsay");
    assert.ok(r, "Lindsay seed");
    assert.equal(keepBlob(r.title, r.teaser), true);
  });

  it("Robert Armstrong keeps because the release says funds were taken from 'the State of Texas' (school districts were not approved)", () => {
    const r = byName("Robert Armstrong");
    assert.ok(r, "Armstrong seed");
    assert.equal(keepBlob(r.title, r.teaser), true);
    assert.match(r.teaser, /the State of Texas/);
  });

  it("funds taken only from school districts, with no state-government money, still do not keep", () => {
    assert.equal(
      keepBlob(
        "Turnersville Man Charged with Defrauding School Districts",
        "Armstrong devised and executed schemes to fraudulently obtain funds from various school districts around the country.",
      ),
      false,
    );
  });
});

describe("person-scoped exclude: Dila Belmili alias (Krennic 2026-11-17)", () => {
  const url = "https://www.justice.gov/usao-wdny/pr/algerian-man-pleads-guilty-his-role-black-market-fraud-conspiracy-targeted-thousands";
  it("excludes Dila Belmili on the WDNY release and keeps Abdellah Belmili", () => {
    const live = loadExclude();
    const dila = { name: "Dila Belmili", sourceUrl: url, id: "harvest-https-www-justice-gov-usao-wdny-pr-algerian-man--98e99a262f" };
    const abdellah = { name: "Abdellah Belmili", sourceUrl: url, id: "harvest-https-www-justice-gov-usao-wdny-pr-algerian-man--2127167176" };
    assert.equal(isExcluded(dila, live), true);
    assert.equal(isExcluded(abdellah, live), false);
  });
});

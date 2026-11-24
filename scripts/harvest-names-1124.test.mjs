import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { tidyName, allPeople } from "./harvest-parse.mjs";
import { rewriteExisting, isExcluded } from "./harvest-gov.mjs";
import { dedupeRows } from "./ledger-dedupe.mjs";

// Krennic 2026-11-24: standing OK for name and duplicate cleanups.
describe("boilerplate glued onto a name", () => {
  it("strips Press Release / Convictions lead-ins", () => {
    assert.equal(tidyName("Press Release Jovan Renee Darbonne"), "Jovan Renee Darbonne");
    assert.equal(tidyName("Convictions Muna Wais Fidhin"), "Muna Wais Fidhin");
    assert.equal(tidyName("News Release Sentencings John Doe"), "John Doe");
  });
  it("leaves real names alone", () => {
    assert.equal(tidyName("Jovan Renee Darbonne"), "Jovan Renee Darbonne");
    assert.equal(tidyName("Charles Pressley"), "Charles Pressley");
    assert.equal(tidyName("Convictions"), "Convictions");
  });
  it("roundup section header does not reach the parsed name", () => {
    const names = allPeople("Enforcement Surge", "Convictions Muna Wais Fidhin, 45, of Savage, Minnesota, was found guilty of three counts of wire fraud.");
    assert.ok(names.includes("Muna Wais Fidhin"), names.join(", "));
    assert.ok(!names.some((n) => /Convictions/.test(n)));
  });
});

describe("glued surname", () => {
  const text = "As posted for this defendant: Salim Said SaidFarah , 44, of Minneapolis, Minnesota, was sentenced. Beginning in April 2024, Farah and several co-defendants were on trial.";
  it("splits when the release uses the right half alone", () => {
    assert.equal(tidyName("Salim Said SaidFarah", text), "Salim Said Said Farah");
  });
  it("never splits Mc/Mac/De/La names or a word the release prints again", () => {
    assert.equal(tidyName("Douglas MacArthur", "Douglas MacArthur pleaded guilty. Arthur testified."), "Douglas MacArthur");
    assert.equal(tidyName("Ron DeSantis", "Santis"), "Ron DeSantis");
    assert.equal(tidyName("Ana LaFleur", "Fleur"), "Ana LaFleur");
    assert.equal(tidyName("Jon BonJovi", "Jon BonJovi was charged. BonJovi and Jovi"), "Jon BonJovi");
    assert.equal(tidyName("Jon BonJovi", ""), "Jon BonJovi");
  });
});

describe("existing rows and duplicates", () => {
  it("renames existing rows and their scheme label", () => {
    const r = rewriteExisting({ name: "Press Release Jovan Renee Darbonne", scheme: "Press Release Jovan Renee Darbonne", text: "" });
    assert.equal(r.name, "Jovan Renee Darbonne");
    assert.equal(r.scheme, "Jovan Renee Darbonne");
  });
  it("the SBA copy of the Darbonne plea collapses into the DOJ row", () => {
    const rows = [
      { name: "Jovan Renee Darbonne", when: "2026-11-18", crime: "LOCAL BUSINESSWOMAN PLEADS GUILTY TO PANDEMIC RELIEF PROGRAM FRAUD", sourceUrl: "https://www.justice.gov/usao-mdla/pr/local-businesswoman-pleads-guilty-pandemic-relif-program-fraud" },
      rewriteExisting({ name: "Press Release Jovan Renee Darbonne", when: "2026-11-18", crime: "Local Businesswoman Pleads Guilty To Pandemic Relief Program Fraud", sourceUrl: "https://www.sba.gov/article/2026/11/18/local-businesswoman-pleads-guilty-pandemic-relief-program-fraud", text: "" }),
    ];
    const { rows: out } = dedupeRows(rows);
    assert.equal(out.length, 1);
    assert.match(out[0].sourceUrl, /justice\.gov/);
  });
  it("the OPA SaidFarah duplicate is excluded, person-scoped", () => {
    const url = "https://www.justice.gov/opa/pr/dojs-fraud-division-and-us-attorneys-office-district-minnesota-uncover-voter-fraud-and";
    assert.equal(isExcluded({ name: "Salim Said Said Farah", sourceUrl: url }), true);
    assert.equal(isExcluded({ name: "Salim Said SaidFarah", sourceUrl: url }), true);
    assert.equal(isExcluded({ name: "Muna Wais Fidhin", sourceUrl: url }), false);
    assert.equal(isExcluded({ name: "Salim Said Said Farah", sourceUrl: "https://www.justice.gov/usao-mn/pr/dojs-fraud-division-and-united-states-attorneys-office-district-minnesota-uncover-nearly" }), false);
  });
});

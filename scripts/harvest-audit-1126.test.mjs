import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { igWhen, rewriteExisting, isExcluded, loadNameFixes } from "./harvest-gov.mjs";
import { officialUrl } from "./harvest-parse.mjs";

// Krennic 2026-11-24 standing OK: name and duplicate cleanups, rule fixes that pass the dry run.
describe("OIG list release date (igWhen)", () => {
  it("full month date in the body wins", () => {
    assert.equal(new Date(igWhen("https://www.sba.gov/article/2026/09/16/x", "On October 7, 2026, a jury ...")).toISOString().slice(0, 10), "2026-10-07");
  });
  it("SBA URL with slashes", () => {
    assert.equal(new Date(igWhen("https://www.sba.gov/article/2026/09/17/two-defendants-indicted-covid-19-fraud", "boilerplate")).toISOString().slice(0, 10), "2026-09-17");
  });
  it("DOL compact URL date still works", () => {
    assert.equal(new Date(igWhen("https://www.oig.dol.gov/public/Press%20Releases/x/20261016_a.htm", "")).toISOString().slice(0, 10), "2026-10-16");
  });
  it("IRS-CI abbreviated lead date", () => {
    assert.equal(new Date(igWhen("https://www.irs.gov/compliance/criminal-investigation/los-angeles-man", "Oct. 20, 2026 — Lamont McCarthy ...")).toISOString().slice(0, 10), "2026-10-20");
    assert.equal(new Date(igWhen("https://www.irs.gov/x", "Sept. 3, 2026 — X")).toISOString().slice(0, 10), "2026-09-03");
  });
  it("no date, or a future date, stays empty", () => {
    assert.ok(Number.isNaN(igWhen("https://www.irs.gov/x", "no date here")));
    assert.ok(Number.isNaN(igWhen("https://www.irs.gov/x", "Jan. 5, 2099 — X", Date.UTC(2026, 10, 26))));
  });
});

describe("empty dates backfilled on rows already in the feed", () => {
  it("fills an empty date from the URL", () => {
    const r = rewriteExisting({ id: "t1", name: "Michelle Green", when: "", picked: "", sourceUrl: "https://www.sba.gov/article/2026/09/17/two-defendants-indicted-covid-19-fraud", crime: "Two Defendants Indicted for COVID-19 Fraud", text: "" });
    assert.equal(r.when, "2026-09-17");
    assert.equal(r.picked, "9/17/2026");
  });
  it("never changes a row that has a date", () => {
    const r = rewriteExisting({ id: "t2", name: "A B", when: "2026-11-01", picked: "11/1/2026", sourceUrl: "https://www.sba.gov/article/2026/09/17/x", crime: "October 7, 2026", text: "" });
    assert.equal(r.when, "2026-11-01");
    assert.equal(r.picked, "11/1/2026");
  });
});

describe("Nov 26 name and duplicate cleanups", () => {
  const fixes = loadNameFixes();
  it("name fixes keep the id", () => {
    const id = "harvest-https-www-justice-gov-usao-sdca-pr-tax-preparer--4a835d0a35";
    assert.equal(fixes.get(id), "Oladapo Olagbemi");
    const r = rewriteExisting({ id, name: "San Diego CPA Oladapo Olagbemi", scheme: "San Diego CPA Oladapo Olagbemi", when: "x", picked: "x" });
    assert.equal(r.id, id);
    assert.equal(r.name, "Oladapo Olagbemi");
    assert.equal(r.scheme, "Oladapo Olagbemi");
  });
  it("Syed roundup repeat is excluded, his sentencing row stays", () => {
    assert.ok(isExcluded({ name: "Ahmed Maqbul Syed", sourceUrl: "https://www.justice.gov/usao-az/pr/us-attorney-district-arizona-announces-contribution-largest-enforcement-surge-against" }));
    assert.ok(!isExcluded({ name: "Ahmed Maqbul Syed", sourceUrl: "https://www.justice.gov/usao-az/pr/indian-national-sentenced-eight-years-prison-laundering-money-fraud-scheme-targeting" }));
    assert.ok(!isExcluded({ name: "Other Defendant", sourceUrl: "https://www.justice.gov/usao-az/pr/us-attorney-district-arizona-announces-contribution-largest-enforcement-surge-against" }));
  });
  it("junk-name rows are excluded", () => {
    assert.ok(isExcluded({ id: "harvest-https-www-irs-gov-compliance-criminal-investigat-e597013481", name: "Nonprofits Help News Tax Pros Search Inc" }));
    assert.ok(isExcluded({ id: "harvest-https-www-justice-gov-opa-pr-federal-court-san-d-95ed43df00", name: "Taxation, Inc." }));
    assert.ok(!isExcluded({ name: "Tarek Mohamad Kassem", sourceUrl: "https://www.justice.gov/usao-co/pr/parker-man-sentenced-covid-19-related-fraud" }));
  });
});

// Krennic 2026-11-26: "fix the 5 Fraud Ledger source links ... and add Hayward Tyler, Inc."
describe("tip pages are never a row's source", () => {
  const footer = "Individuals with information ... via the NCDF Web Complaint Form at: https://www.justice.gov/disaster-fraud/ncdf-disaster-complaint-form The claims resolved by the settlement are allegations only.";
  it("skips the NCDF complaint form and the HHS-OIG report-fraud page", () => {
    assert.equal(officialUrl(`DETROIT – Energy Steel & Supply, Co. ... ${footer}`), null);
    assert.equal(officialUrl("Report at https://oig.hhs.gov/fraud/report-fraud/ ."), null);
  });
  it("uses the next official link when there is one", () => {
    assert.equal(officialUrl(`${footer} Release: https://www.justice.gov/usao-edmi/pr/foreign-owned-companies-pay-49-million.`), "https://www.justice.gov/usao-edmi/pr/foreign-owned-companies-pay-49-million");
  });
  it("leaves ordinary release links alone", () => {
    assert.equal(officialUrl("see https://www.justice.gov/usao-ks/pr/florida-company-agrees-pay, and more"), "https://www.justice.gov/usao-ks/pr/florida-company-agrees-pay");
  });
  it("rows carrying a tip page are excluded; the real releases are not", () => {
    assert.ok(isExcluded({ name: "3CON Corporation", sourceUrl: "https://www.justice.gov/disaster-fraud/ncdf-disaster-complaint-form" }));
    assert.ok(isExcluded({ name: "Cyion Technologies LLC", sourceUrl: "https://oig.hhs.gov/fraud/report-fraud/" }));
    assert.ok(!isExcluded({ name: "3CON Corporation", sourceUrl: "https://www.justice.gov/usao-edmi/pr/foreign-owned-industrial-manufacturing-company-pay-15-million-settle-false-claims-act" }));
  });
  it("the five releases are seeded with their own USAO links, Hayward Tyler included", () => {
    const seeds = JSON.parse(readFileSync(new URL("../data/seed-releases.json", import.meta.url), "utf8")).releases;
    const by = (frag) => seeds.find((s) => s.link.includes(frag));
    assert.deepEqual(by("usao-edmi/pr/foreign-owned-companies-pay-49-million").names, ["Energy Steel & Supply, Co.", "Hayward Tyler, Inc."]);
    for (const frag of ["usao-ks/pr/florida-company-agrees-pay-over-23", "usao-edmi/pr/foreign-owned-industrial", "usao-de/pr/carten-fujikin", "usao-ndca/pr/pleasanton-biotech"]) {
      const s = by(frag);
      assert.ok(s, frag);
      assert.match(s.stage, /^Civil settlement/);
      for (const n of s.names) assert.ok(s.teaser.includes(n.replace(/\.$/, "")), n);
    }
  });
});

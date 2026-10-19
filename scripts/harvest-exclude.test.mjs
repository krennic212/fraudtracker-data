import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ingest, isExcluded, isServicememberRightsCase, keepBlob } from "./harvest-gov.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const VC = "https://www.justice.gov/usao-nv/pr/va-home-loan-servicer-village-capital-pay-over-500000-violating-servicemembers-rights";
const VC_TITLE = "VA Home Loan Servicer Village Capital to Pay Over $500,000 for Violating Servicemembers’ Rights";
const VC_TEASER = "LAS VEGAS — The Justice Department today announced that Village Capital & Investment LLC, a servicer of home loans guaranteed by the Department of Veterans Affairs, will pay over $500,000 to resolve allegations that it failed to properly apply Servicemembers Civil Relief Act (SCRA) interest rate benefits to at least 41 servicemembers’ mortgages and retaliated against servicemembers who requested interest rate benefits.";

describe("exclude list (data/exclude.json)", () => {
  it("lists the Village Capital SCRA settlement (Krennic 2026-10-19)", () => {
    const ex = JSON.parse(readFileSync(join(root, "data/exclude.json"), "utf8"));
    assert.ok(ex.rows.some((e) => e.sourceUrl === VC));
  });
  it("matches by source URL (www / trailing slash ignored) or by id", () => {
    assert.equal(isExcluded({ sourceUrl: VC }), true);
    assert.equal(isExcluded({ link: `${VC.replace("www.", "")}/` }), true);
    assert.equal(isExcluded({ id: "harvest-https-www-justice-gov-usao-nv-pr-va-home-loan-se-6afb12a55e" }), true);
    assert.equal(isExcluded({ sourceUrl: "https://www.justice.gov/usao-nv/pr/other-release" }), false);
  });
  it("the hourly ingest never adds an excluded release back, even if a rule would keep it", () => {
    const existing = [];
    const added = [];
    ingest(existing, new Set(), added, { title: `${VC_TITLE} wire fraud`, teaser: VC_TEASER, link: VC, when: Date.parse("2026-10-19T12:00:00Z") }, "TheJusticeDept");
    assert.deepEqual(added, []);
  });
});

describe("servicemember-rights civil settlements are not fraud", () => {
  it("drops an SCRA settlement with no fraud wording", () => {
    assert.equal(isServicememberRightsCase(`${VC_TITLE} ${VC_TEASER}`), true);
    assert.equal(keepBlob(VC_TITLE, VC_TEASER), false);
    assert.equal(keepBlob("Landlord Agrees to Settle USERRA Claims", "resolves Uniformed Services Employment and Reemployment Rights Act allegations; Department of Veterans Affairs"), false);
  });
  it("keeps fraud and False Claims Act cases that mention servicemembers or the VA", () => {
    // The servicemember rule never drops a False Claims Act case (whether KEEP picks it up is a separate filter).
    assert.equal(isServicememberRightsCase("Lender Pays $10 Million to Resolve False Claims Act Allegations Over VA-Guaranteed Loans. Servicemembers Civil Relief Act rights were also at issue."), false);
    assert.equal(keepBlob("Man Charged With VA Benefits Fraud", "He is charged with wire fraud for stealing VA disability compensation."), true);
    assert.equal(isServicememberRightsCase("Contractor pleads guilty to wire fraud scheme targeting servicemembers"), false);
  });
});

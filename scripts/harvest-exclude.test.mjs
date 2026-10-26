import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { crossPostInvasionVoting, ingest, isExcluded, isServicememberRightsCase, keepBlob } from "./harvest-gov.mjs";

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

describe("person-scoped exclude: Anthony Tyrone Higgs (Krennic 2026-10-26)", () => {
  const DHS = "https://www.dhs.gov/news/2026/10/23/hsi-and-fbi-arrest-ten-aliens-voter-fraud-north-carolina";
  const higgs = {
    name: "Anthony Tyrone Higgs", status: "approved", voting: true, when: "23 Oct 2026", city: "North Carolina", lat: 35.7596, lon: -79.0193,
    usa: "DHS release Oct 23, 2026: HSI and FBI Arrest Ten Aliens for Voter Fraud in North Carolina | Homeland Security",
    crime: "As posted: In September, ICE arrested Anthony Tyrone Higgs, an alien from the Bahamas who had illegally voted in the 2020 election.",
    sourceUrl: DHS,
  };
  it("is listed, matches name + source URL only, and not the release's other people", () => {
    const ex = JSON.parse(readFileSync(join(root, "data/exclude.json"), "utf8"));
    assert.ok(ex.rows.some((e) => e.name === "Anthony Tyrone Higgs" && e.sourceUrl === DHS && e.match === "person"));
    assert.equal(isExcluded({ name: "Anthony Tyrone Higgs", sourceUrl: DHS }), true);
    assert.equal(isExcluded({ name: "ANTHONY TYRONE HIGGS", sourceUrl: `${DHS.replace("www.", "")}/` }), true);
    assert.equal(isExcluded({ name: "Mariana Alexandra Dewey", sourceUrl: DHS }), false);
    assert.equal(isExcluded({ link: DHS }), false);
    assert.equal(isExcluded({ name: "Anthony Tyrone Higgs", sourceUrl: "https://www.dhs.gov/news/2026/11/01/other" }), false);
  });
  it("the Invasion Update cross-post never adds him back; another person from the release still can be", () => {
    const existing = [];
    const added = [];
    const dewey = { ...higgs, name: "Mariana Alexandra Dewey", crime: "As posted: In September, ICE arrested Mariana Alexandra Dewey, an alien from Peru, for illegally misrepresenting herself as a U.S. citizen to vote in the 2024 election in Kansas." };
    crossPostInvasionVoting(existing, new Set(), added, [higgs, dewey]);
    assert.deepEqual(added, ["Mariana Alexandra Dewey"]);
  });
  it("is not in the feed", () => {
    const feed = JSON.parse(readFileSync(join(root, "data/harvest.json"), "utf8"));
    assert.ok(!feed.some((r) => /higgs/i.test(r.name)));
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

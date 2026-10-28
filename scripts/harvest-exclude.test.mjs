import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { crossPostInvasionVoting, dojItem, harvestSeed, ingest, isExcluded, isServicememberRightsCase, keepBlob } from "./harvest-gov.mjs";
import { allPeople, onlyQuotedSpeaker } from "./harvest-parse.mjs";

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

// Krennic 2026-10-28: the usao-ndga $100M stolen-identity tax row was named after the IRS-CI official quoted in the
// release ("said Special Agent in Charge Christopher J. Altemus Jr., of IRS-CI’s Texas Field Office"), not the defendant.
describe("quoted official is never the defendant (usao-ndga Raheem, 2026-10-28)", () => {
  const URL = "https://www.justice.gov/usao-ndga/pr/nigerian-man-extradited-benin-face-federal-charges-100-million-stolen-identity-tax";
  const TITLE = "Nigerian Man Extradited from Benin to Face Federal Charges in $100 Million Stolen Identity Tax Scheme";
  const TEASER = "<p>Akinade Adedeji Raheem, a Nigerian citizen who allegedly conspired to file fraudulent tax returns seeking over $100 million in refunds using stolen identities, was arraigned yesterday on federal fraud, money laundering, and aggravated identity theft charges after his extradition from Benin.&nbsp;</p>";
  const BODY = "<p>ATLANTA - Akinade Adedeji Raheem, a Nigerian citizen who allegedly conspired to file fraudulent tax returns seeking over $100 million in refunds using stolen identities, was arraigned yesterday on federal fraud, money laundering, and aggravated identity theft charges after his extradition from Benin.&nbsp;</p><p>“Raheem and his co-conspirators allegedly obtained hundreds of stolen identities, filed fraudulent tax returns using that information, and laundered the proceeds through prepaid debit cards and purchases of used cars that were shipped to Nigeria and other locations,” said U.S. Attorney Theodore S. Hertzberg. “The scope of the alleged fraud is staggering. Thanks to the dedication of the prosecution team and our law enforcement partners around the world, Raheem has been extradited to the United States, and his arrest confirms again that no alleged criminal can escape the reach of American justice.”</p><p>“Raheem is an alleged co-conspirator in a nationwide identity theft scheme that victimized hundreds of taxpayers.&nbsp;The fraud also stole from the U.S. Treasury, impacting programs serving us all. These come with repercussions that are long lasting, which is why we place a global emphasis on arresting and extraditing these individuals,” said Special Agent in Charge Christopher J. Altemus Jr., of IRS-CI’s Texas Field Office. “Protect your tax returns with an identity protection pin at IRS.gov and know that we are pursuing financial criminals to take back the stolen money and their freedom.”</p><p>According to U.S. Attorney Hertzberg, the charges, and other information presented in court: Between 2018 and 2023, Raheem, who resided in Atlanta, and Abayomi Quadri Eletu, a resident of the United Kingdom and Nigeria, conspired together and with others to claim fraudulent tax refunds using the stolen identities of accountants and American taxpayers. Over the course of their scheme, they allegedly filed more than 300 false tax returns claiming over $100 million in refunds from the IRS.</p><p>Yesterday, Akinade Adedeji Raheem, 43, of Nigeria, was arraigned on a federal indictment and detained in the custody of the U.S. Marshals Service pending further proceedings. On February 24, 2026, a federal grand jury in the Northern District of Georgia indicted Raheem on one count of conspiracy to commit wire and mail fraud, one count of conspiracy to commit money laundering, 14 counts of access device fraud, and 14 counts of aggravated identity theft. Raheem faces maximum penalties of 20 years in prison for conspiracy to commit mail and wire fraud, 20 years for money laundering, and 10 years for access device fraud, as well as a mandatory sentence of two years for aggravated identity theft.&nbsp;</p>";
  const api = { title: TITLE, url: URL, teaser: TEASER, body: BODY, date: "1793102400" };
  it("onlyQuotedSpeaker: the quoted official yes, the defendant no", () => {
    const text = dojItem(api).teaser;
    assert.equal(onlyQuotedSpeaker("Christopher J. Altemus Jr.", text), true);
    assert.equal(onlyQuotedSpeaker("Akinade Adedeji Raheem", text), false);
    // A name printed anywhere else too is kept (not only a "said" speaker).
    assert.equal(onlyQuotedSpeaker("Jane Roe", "“We did it,” said Director Jane Roe. Jane Roe, 50, of Austin, was charged."), false);
  });
  it("allPeople never returns the quoted official; the defendant is found where the text names him", () => {
    assert.ok(!allPeople(TITLE, dojItem(api).teaser).includes("Christopher J. Altemus Jr."));
    assert.ok(allPeople(TITLE, BODY.replace(/<[^>]+>/g, " ")).includes("Akinade Adedeji Raheem"));
  });
  it("the DOJ pass on this release does not add Altemus", () => {
    const existing = [];
    const added = [];
    ingest(existing, new Set(), added, dojItem(api), "TheJusticeDept");
    assert.ok(!added.some((n) => /altemus/i.test(n)));
  });
  it("Altemus is excluded for this release only (person-scoped); Raheem is not", () => {
    assert.equal(isExcluded({ name: "Christopher J. Altemus Jr.", sourceUrl: URL }), true);
    assert.equal(isExcluded({ id: "harvest-https-www-justice-gov-usao-ndga-pr-nigerian-man--d741009c05" }), true);
    assert.equal(isExcluded({ name: "Akinade Adedeji Raheem", sourceUrl: URL }), false);
  });
  it("the seed adds Raheem (Charged, same schemeId) on an empty ledger and nothing on the live feed", () => {
    const fresh = [];
    const added = [];
    harvestSeed(fresh, new Set(), added);
    const mine = fresh.filter((r) => r.sourceUrl === URL);
    assert.deepEqual(mine.map((r) => r.name), ["Akinade Adedeji Raheem"]);
    assert.equal(mine[0].stage, "Charged");
    assert.equal(mine[0].schemeId, "harvest-https-www-justice-gov-usao-ndga-pr-nigerian-man--a96ea5b29f");
    const feed = JSON.parse(readFileSync(join(root, "data/harvest.json"), "utf8"));
    const have = new Set(feed.map((r) => `${r.sourceUrl || ""}|${r.id || ""}`));
    const again = [];
    harvestSeed(feed, have, again);
    assert.ok(!again.includes("Akinade Adedeji Raheem"));
  });
  it("the feed row is Raheem, Charged, original schemeId, and no Altemus anywhere", () => {
    const raw = readFileSync(join(root, "data/harvest.json"), "utf8");
    assert.ok(!/altemus/i.test(raw));
    const rows = JSON.parse(raw).filter((r) => r.sourceUrl === URL);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].name, "Akinade Adedeji Raheem");
    assert.equal(rows[0].scheme, "Akinade Adedeji Raheem");
    assert.equal(rows[0].stage, "Charged");
    assert.equal(rows[0].schemeId, "harvest-https-www-justice-gov-usao-ndga-pr-nigerian-man--a96ea5b29f");
  });
});

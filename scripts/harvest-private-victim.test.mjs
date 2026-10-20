// Krennic 2026-10-20: private-victim fraud (victims are private people, businesses, banks, clients, investors,
// nonprofits, churches, sports betting ...) stays on the ledger ONLY when the official release states the person
// is a non-citizen. Government-program / government-money fraud is unchanged. Texts are the releases' own words.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { allPeople } from "./harvest-parse.mjs";
import {
  dojItem, ingest, isExcluded, keepBlob, nonCitizenInRelease, nonCitizenStatedFor, privateVictimNonCitizen,
} from "./harvest-gov.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const exclude = JSON.parse(readFileSync(join(root, "data/exclude.json"), "utf8"));
const DATE = String(Date.parse("2026-10-15T12:00:00Z") / 1000);
const run = (api) => {
  const existing = [];
  const added = [];
  ingest(existing, new Set(), added, dojItem(api), "TheJusticeDept");
  return added;
};

const JIN = {
  title: "Illegal alien sentenced for being a courier in an investment scam",
  url: "https://www.justice.gov/usao-sdil/pr/illegal-alien-sentenced-being-courier-investment-scam",
  date: DATE,
  teaser: "<p>BENTON, Ill. – A district judge sentenced a Chinese national to 27 months in federal prison for acting as a courier in an investment scam.</p>",
  body: "<p>BENTON, Ill. – A district judge sentenced a Chinese national to 27 months in federal prison for acting as a courier in an investment scam.</p><p>Shenghan Jin, 24, pleaded guilty to one count of conspiracy to commit wire fraud and one count of wire fraud.</p><p>Jin was in the country on a student visa that expired in 2022. Following imprisonment, Jin will be deported.</p>",
};
const ANGHEL = {
  title: "Illegal Alien Admits Nationwide Sleight-of-Hand Fraud",
  url: "https://www.justice.gov/usao-edmo/pr/illegal-alien-admits-nationwide-sleight-hand-fraud",
  date: DATE,
  teaser: "<p>ST. LOUIS – An illegal immigrant pleaded guilty Thursday and admitted involvement in a conspiracy that stole or tried to steal $157,229 from a national retailer via sleight-of-hand fraud.</p>",
  body: "<p>ST. LOUIS – An illegal immigrant pleaded guilty Thursday and admitted involvement in a conspiracy that stole or tried to steal $157,229 from a national retailer via sleight-of-hand fraud. Bazili Anghel Anghel, 28, pleaded guilty in U.S. District Court in St. Louis to one count of illegal reentry and one count of conspiracy to commit wire fraud.</p><p>Anghel is a citizen of Romania and national of Spain. He unlawfully entered the U.S. prior to Aug. 29, 2018.</p>",
};
const JAVIER = {
  title: "Three Sentenced for Multi-State Bank Fraud Scheme Involving Fake U.S. Military IDs",
  url: "https://www.justice.gov/usao-sdin/pr/three-sentenced-multi-state-bank-fraud-scheme-involving-fake-us-military-ids",
  date: DATE,
  teaser: "<p>INDIANAPOLIS – Samuel B. Javier, 31, and Courtney J. Jackson, 33, were sentenced for a bank fraud scheme that used fake U.S. military IDs to open accounts at credit unions.</p>",
  body: "<p>INDIANAPOLIS – Samuel B. Javier, 31, and Courtney J. Jackson, 33, were sentenced for a bank fraud scheme that used fake U.S. military IDs to open accounts at credit unions.</p><p>Samuel Javier is a citizen of the Dominican Republic whose visa has expired. At the time he entered his guilty plea, Javier acknowledged that he will be subject to removal from the United States upon completion of his sentence.</p>",
};

describe("private-victim fraud: kept only for defendants the release states are non-citizens", () => {
  it("Jin (single defendant; 'Chinese national', expired student visa) is added from the body", () => {
    assert.equal(keepBlob(JIN.title, JIN.teaser), false);
    assert.deepEqual(run(JIN), ["Shenghan Jin"]);
  });
  it("Anghel ('citizen of Romania', 'illegal immigrant'): illegal reentry count does not drop it", () => {
    assert.deepEqual(run(ANGHEL), ["Bazili Anghel Anghel"]);
  });
  it("Javier: only the co-defendant the release states is a non-citizen; Jackson is not added", () => {
    assert.deepEqual(run(JAVIER), ["Samuel B. Javier"]);
    const plain = JAVIER.body.replace(/<[^>]+>/g, " ");
    assert.equal(nonCitizenStatedFor("Courtney J. Jackson", plain, false), false);
    assert.equal(nonCitizenStatedFor("Samuel B. Javier", plain, false), true);
  });
  it("private-victim releases with no stated status are not added (bank teller, seniors, investors, BEC)", () => {
    const cases = [
      { title: "Former Bank Teller Charged with Bank Fraud", url: "https://www.justice.gov/usao-ndga/pr/former-bank-teller-charged-bank-fraud", date: DATE, teaser: "<p>ATLANTA - Mercedes Henry, a former banker at Ameris Bank, was arrested last week on federal charges of bank fraud after she allegedly defrauded Ameris Bank out of more than $900,000.</p>", body: "<p>ATLANTA - Mercedes Henry, a former banker at Ameris Bank, was arrested.</p><p>“Ms. Henry and her conspirators allegedly stole consumers’ hard-earned money,” said the FBI.</p>" },
      { title: "Maryland Man Charged With Stealing More Than $1 Million From Dozens of Seniors", url: "https://www.justice.gov/usao-md/pr/maryland-man-charged-stealing-more-1-million-dozens-seniors", date: DATE, teaser: "<p>Roy Dave Davis, 34, of Hyattsville, is charged with wire fraud.</p>", body: "<p>Roy Dave Davis, 34, of Hyattsville, is charged with wire fraud in a fraud scheme that targeted senior citizens. Davis defrauded more than 40 victims, targeting senior citizens who averaged 81 years old.</p>" },
      { title: "Castle Rock Man Sentenced for Defrauding Investors", url: "https://www.justice.gov/usao-co/pr/x", date: DATE, teaser: "<p>John Doe, 40, was sentenced for wire fraud for defrauding investors.</p>", body: "<p>John Doe, 40, was sentenced for wire fraud for defrauding investors. The National Fraud Enforcement Division coordinated. Our office will protect the citizens of Colorado.</p>" },
    ];
    for (const c of cases) assert.deepEqual(run(c), [], c.title);
  });
  it("boilerplate and U.S.-citizen wording do not count as stated non-citizen status", () => {
    // HSTF boilerplate on a private bank case (Ramirez); dual U.S. national (Pinhasi, MonsterCloud).
    assert.equal(nonCitizenInRelease("HSTF further utilizes all available tools to prosecute and remove the most violent criminal aliens from the United States."), false);
    assert.equal(nonCitizenInRelease("Pinhasi, a national of the United States and Israel, was indicted by a grand jury."), false);
    assert.equal(nonCitizenInRelease("Davis defrauded more than 40 victims, targeting senior citizens who averaged 81 years old."), false);
    assert.equal(nonCitizenInRelease("The National Fraud Enforcement Division will fulfill that mission."), false);
    assert.equal(nonCitizenInRelease("He is a lawful permanent resident."), true);
    assert.equal(nonCitizenInRelease("Smith, a Mexican national, pleaded guilty."), true);
    assert.equal(nonCitizenInRelease("Doe, a citizen of the Philippines, overstayed his tourist visa."), true);
    assert.equal(nonCitizenInRelease("Roe is a green card holder."), true);
  });
  it("Amachukwu: 'Nigerian Man' / '40, of Nigeria' is origin, not stated status; release stays on exclude.json", () => {
    const t = "Nigerian Man Sentenced To Eight Years For Hacking, Fraud, And Identity Theft Schemes. AMACHUKWU, his co-conspirator Kinglsey Uchelue Utulu, and other Nigeria-based conspirators took part in a scheme to hack into U.S-based tax preparation businesses. In addition to the prison term, AMACHUKWU, 40, of Nigeria, was sentenced to one year of supervised release.";
    assert.equal(nonCitizenInRelease(t), false);
    const url = "https://www.justice.gov/usao-sdny/pr/nigerian-man-sentenced-eight-years-hacking-fraud-and-identity-theft-schemes";
    assert.ok(exclude.rows.some((r) => r.sourceUrl === url));
    assert.equal(isExcluded({ sourceUrl: url }), true);
  });
  it("non-citizen wording alone is not enough: smuggling roundups, drug-money laundering, sanctions, ID documents", () => {
    for (const [t, x] of [
      ["Western District of Texas U.S. Attorney’s Office Files Nearly 500 Immigration Cases Through First Half of October", "A Lebanese man was charged with alien smuggling. Reyes-Hernandez was convicted in 2023 for alien smuggling and money laundering. Others face wire fraud charges."],
      ["Brazilian Man Sentenced to 12 Years in Prison for Managerial Role in Conspiracy to Launder Tens of Millions of Dollars in Illicit Cash Proceeds", "Ygor Fokin Saviolli, 35, a Brazilian national, laundered more than $30 million in illicit proceeds, including the proceeds of drug trafficking and fraud schemes."],
      ["Russian National Arrested and Extradited to New York on Charges of Evading Sanctions on Russia", "Alexander Suvorov, a Russian national, used a front company and defrauded U.S. distributors."],
      ["Illegal Alien Charged with Knowingly Transferring a False Identification Document", "A Brazilian national was charged. He defrauded no one."],
    ]) assert.equal(privateVictimNonCitizen(t, x), false, t);
  });
  it("a grant announcement is not government-money fraud (weak words need a crime title)", () => {
    assert.equal(keepBlob("SBA Awards $9.5 Million to Tribal Colleges and Training Hubs in Support of Small Manufacturers", "Grants of federal funds and government contracts for Engineering, Inc."), false);
    assert.equal(keepBlob("Former Employee Pleads Guilty to Stealing Public Funds", "She diverted public funds to herself."), true);
  });
  it("a dropped crime with non-citizen wording is still dropped (no private-victim path for drug cases)", () => {
    assert.equal(privateVictimNonCitizen("Mexican National Sentenced for Fentanyl Trafficking and Money Laundering", "Doe, a Mexican national, laundered fentanyl proceeds."), false);
  });
});

describe("government-program / government-money fraud is unchanged (no citizenship needed)", () => {
  it("PPP, Treasury check, tax, state agency and MBTA releases stay in scope", () => {
    assert.equal(keepBlob("Denver Man Sentenced", "Howe obtained $1,243,799.91 in emergency Paycheck Protection Program (PPP) loans."), true);
    assert.equal(keepBlob("New Jersey Woman Pleads Guilty to Bank Fraud Relating to Stolen U.S. Treasury Check", ""), true);
    assert.equal(keepBlob("Construction Company Owner and Employees Indicted", "The defendants filed false tax returns and evaded payroll taxes."), true);
    assert.equal(keepBlob("Former President Of Non-Profit Pleads Guilty", "Ghosala pleaded guilty to conspiracy to commit wire fraud and conspiracy to defraud the United States."), true);
    assert.equal(keepBlob("Springfield Man Sentenced for Submitting False Documents to the Missouri Department of Revenue", ""), true);
    assert.equal(keepBlob("Former MBTA Employee Pleads Guilty to Conspiracies to Falsify Track Inspection Reports", ""), true);
  });
  it("a government-program release is added without any citizenship wording", () => {
    const api = { title: "El Paso Woman Pleads Guilty to Defrauding Paycheck Protection Program of More Than $2 Million", url: "https://www.justice.gov/usao-wdtx/pr/el-paso-woman-pleads-guilty-defrauding-paycheck-protection-program-more-2-million", date: DATE, teaser: "<p>Araceli Benitez, 52, of El Paso, pleaded guilty to wire fraud in connection with PPP loans.</p>" };
    assert.deepEqual(run(api), ["Araceli Benitez"]);
  });
  it("payroll-tax indictment names the charged CEO, not her company ('indictment charging Rosa Cazares , ...')", () => {
    assert.deepEqual(allPeople("", "A federal grand jury in Portland has returned an eight-count indictment charging Rosa Cazares , Chief Executive Officer of La Mota, LLC, and 503 Staffing LLC, with willfully failing to pay over federal payroll taxes."), ["Rosa Cazares"]);
  });
  it("IRS-CI credit on a private-victim case is not 'tax'", () => {
    assert.equal(keepBlob("Board Chairman and Co-Owner of Puerto Rican Bank Sentenced in Multimillion-Dollar Wire Fraud Conspiracy", "IRS Criminal Investigation investigated the case. Ramirez conspired with others to siphon money from Nodus Bank."), false);
  });
});

describe("exclude.json: 2026-10-20 private-victim removals", () => {
  it("every removal carries Krennic's reason and is excluded by source URL", () => {
    const rm = exclude.rows.filter((r) => /private-victim, citizenship not stated/.test(r.reason || ""));
    assert.ok(rm.length >= 20);
    for (const r of rm) {
      assert.equal(r.reason, "Krennic 2026-10-20: private-victim, citizenship not stated");
      assert.equal(isExcluded({ sourceUrl: r.sourceUrl }), true, r.name);
    }
  });
  it("the non-citizen private-victim rows and the government-money rows are not excluded", () => {
    for (const u of [JIN.url, ANGHEL.url, JAVIER.url,
      "https://www.justice.gov/usao-ct/pr/new-jersey-woman-pleads-guilty-bank-fraud-relating-stolen-us-treasury-check",
      "https://www.justice.gov/usao-wdmo/pr/springfield-man-sentenced-153-months-federal-prison-submitting-false-documents",
      "https://www.justice.gov/usao-co/pr/denver-man-sentenced-30-months-federal-prison-after-pleading-guilty-bank-fraud-money",
      "https://www.justice.gov/usao-co/pr/castle-rock-man-sentenced-20-months-federal-prison-more-5-million-restitution"]) {
      assert.equal(isExcluded({ sourceUrl: u }), false, u);
    }
  });
});

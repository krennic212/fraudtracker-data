import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { keepBlob, strip, ingest, privateVictimNonCitizen, titleNationalStated } from "./harvest-gov.mjs";

// Krennic 2026-10-31: three filter fixes from the Oct 29-30 missed-cases check. Real release text in scripts/fixtures.
const fx = (f) => JSON.parse(readFileSync(new URL(`./fixtures/${f}`, import.meta.url), "utf8"));
const ghost = fx("opa-2026-10-29-ghostbusters.json");
const campbell = fx("mdpa-2026-10-30-campbell-jamaican-national.json");
const nieves = fx("edmo-2026-10-29-atm-jackpotter.json");
const item = (r, teaser, names) => ({ title: strip(r.title), teaser, link: r.url, when: Date.parse("2026-10-30T12:00:00Z"), names });

describe("KEEP: federal student aid is a government program", () => {
  it("the Ghostbusters New Jersey paragraph (no other program word) is kept", () => {
    const body = strip(ghost.body);
    const nj = body.slice(body.indexOf("District of New Jersey (Criminal Complaint)"), body.indexOf("Eastern District of Virginia (Under seal)"));
    assert.equal(keepBlob(strip(ghost.title), nj), true);
    for (const t of ["fraudulent FAFSA applications", "steal federal student aid", "obtained Pell Grants", "student-aid fraud ring", "more than $1 million in FSA funds"]) assert.equal(keepBlob("Man Charged", t), true, t);
  });
  it("private student loans, scholarships and campus thefts are not", () => {
    for (const t of ["He defrauded a private student loan company.", "She stole scholarship money from a nonprofit.", "He stole laptops from the student union."]) assert.equal(keepBlob("Man Charged With Wire Fraud", t), false, t);
  });
});

describe("Title '<Demonym> National' states the status (single defendant only)", () => {
  it("Jamaican National Extradited ... -> Campbell only, not her co-defendant", () => {
    const t = strip(campbell.title);
    assert.equal(titleNationalStated(t), true);
    const teaser = strip(campbell.body).slice(0, 900);
    assert.equal(privateVictimNonCitizen(t, teaser), true);
    const ex = [], added = [];
    ingest(ex, new Set(), added, item(campbell, teaser, ["Ashanie M. Campbell"]), "TheJusticeDept");
    assert.deepEqual(added, ["Ashanie M. Campbell"]);
    const ex2 = [], added2 = [];
    ingest(ex2, new Set(), added2, item(campbell, teaser, ["Ashanie M. Campbell", "Jeremie L. Cotton"]), "TheJusticeDept");
    assert.deepEqual(added2, [], "two rows: the title cannot say which one is the national");
  });
  it("never: National Guard / Bank / Division, American, dual or U.S. citizen titles", () => {
    for (const t of ["Former Air National Guard Member Sentenced for Fraud", "First National Bank Teller Charged With Embezzlement", "National Fraud Enforcement Division Announces Charges", "American National Sentenced", "Dual U.S. and Jamaican National Charged", "Jamaican National and U.S. Citizen Charged", "Native National Bank Officer Indicted"]) assert.equal(titleNationalStated(t), false, t);
    for (const t of ["Two Chinese Nationals Charged", "Greek National Pleads Guilty", "Nigerian National Sentenced in Romance Scam"]) assert.equal(titleNationalStated(t), true, t);
  });
});

describe("PRIVATE_FRAUD: bank theft and ATM jackpotting", () => {
  it("ATM Jackpotter from Venezuela (illegal alien) is kept as private-victim fraud", () => {
    assert.equal(privateVictimNonCitizen(strip(nieves.title), strip(nieves.body)), true);
  });
  it("still needs stated non-citizen status, and drug / smuggling cases stay out", () => {
    assert.equal(privateVictimNonCitizen("Man Pleads Guilty to Bank Theft", "Doe, 40, of Tulsa, pleaded guilty to bank theft."), false);
    assert.equal(privateVictimNonCitizen("Jackpotting Crew Member Sentenced", "Doe, a Mexican national, jackpotted ATMs and sold fentanyl."), false);
    assert.equal(privateVictimNonCitizen("Jackpotting Crew Member Sentenced", "Doe, a Venezuelan national, was sentenced for jackpotting ATMs."), true);
  });
});

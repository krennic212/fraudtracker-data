import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { keepBlob, privateVictimNonCitizen, nonCitizenSentence } from "./harvest-gov.mjs";

// Krennic 2026-11-24 (relayed by Rex): "Approve the Kristi Williams / Jeremy Jarod Jackson / Hektor Avdyli / Terry Fjeld rule change".
describe("local-government / school-district tax collections (Kristi Williams)", () => {
  it("keeps theft of property tax payments from a school district", () => {
    assert.equal(keepBlob("Former school district financial officer admits to $1M fraud scheme", "Kristi Williams admitted she stole money intended for property tax payments."), true);
    assert.equal(keepBlob("Clerk Sentenced", "She embezzled county tax collections over six years."), true);
  });
  it("does not keep private theft with no tax collections", () => {
    assert.equal(keepBlob("Bookkeeper Sentenced", "She stole $300,000 from a private dental practice."), false);
    assert.equal(keepBlob("Man Sentenced for Wire Fraud", "He embezzled from the Tomball Independent School District booster club's donations."), false);
  });
});

describe("stolen federal tax refunds (Jeremy Jarod Jackson)", () => {
  it("keeps laundering stolen federal tax refunds", () => {
    assert.equal(keepBlob("Former Middle School Teacher Pleads Guilty to Money Laundering", "A Waco man pleaded guilty for his scheme to launder more than $500,000 of stolen federal tax refunds."), true);
    assert.equal(keepBlob("Man Sentenced", "He cashed stolen tax refunds."), true);
  });
  it("does not keep a refund scam against private buyers", () => {
    assert.equal(keepBlob("Man Pleads Guilty to Wire Fraud", "He promised customers refunds that never came."), false);
  });
});

describe("willful failure to file tax returns (Terry Fjeld)", () => {
  it("keeps willfully failing to file tax returns", () => {
    assert.equal(keepBlob("Law Firm Owner Indicted for Willful Failure to File Tax Returns", ""), true);
    assert.equal(keepBlob("Owner Indicted", "charging a man with willfully failing to file individual and corporate tax returns for 2020 to 2025."), true);
  });
  it("does not keep a private firm's other filings or generic business fraud", () => {
    assert.equal(keepBlob("Executive Charged", "He failed to file required disclosures with investors and defrauded a private company."), false);
    assert.equal(keepBlob("Accountant Sentenced", "A private accounting firm lost clients' money in a Ponzi scheme."), false);
  });
});

describe("'a <Country> citizen' is non-citizen status (Hektor Avdyli)", () => {
  it("counts a Kosovo citizen on a private-victim fraud release", () => {
    assert.equal(nonCitizenSentence("Through investigative work, the FBI identified the seller as Hektor Avdyli, a Kosovo citizen."), true);
    assert.equal(privateVictimNonCitizen("Kosovo Man Extradited", "Avdyli was charged with wire fraud and access device fraud. The seller was Hektor Avdyli, a Kosovo citizen."), true);
  });
  it("does not count U.S. / American / state citizens or common phrases", () => {
    assert.equal(nonCitizenSentence("He is a U.S. citizen."), false);
    assert.equal(nonCitizenSentence("She is a United States citizen."), false);
    assert.equal(nonCitizenSentence("He is an American citizen."), false);
    assert.equal(nonCitizenSentence("He is a Texas citizen."), false);
    assert.equal(nonCitizenSentence("He is a Puerto Rico citizen."), false);
    assert.equal(nonCitizenSentence("The victim was a senior citizen."), false);
    assert.equal(nonCitizenSentence("A private citizen reported the fraud."), false);
    assert.equal(privateVictimNonCitizen("Man Charged with Wire Fraud", "Smith, a United States citizen, defrauded investors."), false);
  });
});

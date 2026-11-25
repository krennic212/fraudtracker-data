import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { nonCitizenSentence, privateVictimNonCitizen } from "./harvest-gov.mjs";

// 2026-11-24 evening (Tech, under Krennic's standing OK for dry-run-clean rule fixes):
// "a <Country> citizen" also counts when it opens the sentence ("A Singaporean citizen ...", Zhi Ge, D. Mass. Nov 24).
describe("'A <Demonym> citizen' at a sentence start (Zhi Ge)", () => {
  it("counts a capital-A sentence opener", () => {
    assert.equal(nonCitizenSentence("A Singaporean citizen has been extradited to the United States to face federal securities fraud and money laundering charges in Boston."), true);
    assert.equal(nonCitizenSentence("An Israeli citizen was charged."), true);
  });
  it("keeps the private-victim securities fraud release", () => {
    assert.equal(privateVictimNonCitizen("Member of Global Insider Trading Network Extradited to United States for Securities Fraud and Money Laundering", "A Singaporean citizen has been extradited to the United States to face federal securities fraud and money laundering charges in Boston. Zhi Ge, 35, of Singapore, appeared on Nov. 20, 2026."), true);
  });
  it("still excludes American / U.S. / state / Senior wording", () => {
    assert.equal(nonCitizenSentence("A American citizen was defrauded."), false);
    assert.equal(nonCitizenSentence("An American citizen was charged."), false);
    assert.equal(nonCitizenSentence("A Senior citizen lost savings."), false);
    assert.equal(nonCitizenSentence("A Texas citizen was charged with wire fraud."), false);
    assert.equal(nonCitizenSentence("A Mexican citizen and naturalized U.S. citizen was charged."), false);
  });
});

// Krennic 2026-11-06 (Tech chat): "Fix everything in the rules so less are missed in the future."
import test from "node:test";
import assert from "node:assert/strict";
import { keepBlob, stageFromTitle, laterStageUpdate, invasionVotingItem, rowsFromItem, crossPostInvasionVoting } from "./harvest-gov.mjs";
import { allPeople, dropShortForms, settlementEntity, personOrEntity } from "./harvest-parse.mjs";

test("KEEP: Economic Impact Payment / stimulus-check theft is government money", () => {
  assert.equal(keepBlob("Ex-Postal Worker Receives Six-and-a-Half-Year Sentence for Stealing Checks", "In spring 2020, as the federal government issued Economic Impact Payment (EIP) checks to taxpayers, the USPS OIG received a complaint."), true);
  assert.equal(keepBlob("Man Sentenced for Stealing Stimulus Checks", "He stole mail."), true);
});

test("KEEP: stolen government benefits of a deceased person", () => {
  assert.equal(keepBlob("Former Police Officer Admits Failing to Report Death and Pocketing Nearly $300,000 in Stolen Government Benefits", ""), true);
  assert.equal(keepBlob("Woman Pleads Guilty", "She kept receiving her mother's Social Security benefits for years after her mother died and spent them."), true);
  assert.equal(keepBlob("Man Pleads Guilty to Wire Fraud", "He defrauded investors of $2 million."), false);
});

test("KEEP: PPP / Medicaid / False Claims Act settlement wording", () => {
  assert.equal(keepBlob("Clinic Agrees to Pay $1 Million to Resolve False Claims Act Allegations", ""), true);
  assert.equal(keepBlob("Company Settles", "to resolve allegations that it obtained a PPP loan it was not eligible for"), true);
});

test("settlement title names the paying company (fraud-type settlements only)", () => {
  assert.equal(settlementEntity("Premier Medical Group Agrees to Pay $2.8 Million to Resolve False Claims Act Allegations Involving Improper Billing"), "Premier Medical Group");
  assert.equal(settlementEntity("Defense and Aerospace Contractors ILC Dover and ILC Astrospace Agree to Pay $13M to Resolve Cybersecurity Fraud Allegations"), "ILC Dover and ILC Astrospace");
  assert.equal(settlementEntity("Lockheed Martin Agrees to Pay $29.5M to Resolve Alleged Employment Discrimination Violations"), "");
  assert.equal(personOrEntity("Premier Medical Group Agrees to Pay $2.8 Million to Resolve False Claims Act Allegations", "")?.name, "Premier Medical Group");
});

test("short form of a name already printed in full is not a second person (Piron Lara)", () => {
  const teaser = "BOSTON – A Dominican man unlawfully residing in Dorchester pleaded guilty. Danis Piron Lara, 51, pleaded guilty to unlawfully obtaining SNAP Benefits. Piron Lara was charged in March 2026 . Piron Lara obtained various identifications.";
  const names = allPeople("Illegal Alien from the Dominican Republic Pleads Guilty to SNAP Fraud and MassHealth Benefit Fraud", teaser);
  assert.ok(names.includes("Danis Piron Lara"));
  assert.ok(!names.includes("Piron Lara"));
  // A short form the release introduces on its own (with an age) is kept.
  assert.deepEqual(dropShortForms(["Jose Maria Lopez", "Maria Lopez"], "Jose Maria Lopez, 50, and Maria Lopez, 45, were charged."), ["Jose Maria Lopez", "Maria Lopez"]);
});

test("stage from a single-defendant title", () => {
  assert.equal(stageFromTitle("Ex-Postal Worker Receives Six-and-a-Half-Year Sentence for Stealing Checks"), "Sentenced");
  assert.equal(stageFromTitle("Federal jury finds Indian national guilty of unlawfully voting"), "Convicted");
  assert.equal(stageFromTitle("Jury Convicts Clinic Owner of Medicaid Fraud"), "Convicted");
  assert.equal(stageFromTitle("Woman Pleads Guilty to SNAP Fraud"), "Pleaded guilty");
  assert.equal(stageFromTitle("Man Indicted for SNAP Fraud"), "");
});

test("Charged -> Convicted from a later release: same name, same state, forward only", () => {
  const prev = { name: "Maria Elena Gomez", city: "Boston, MA", when: "2026-03-01", stage: "Charged", sourceUrl: "https://www.justice.gov/usao-ma/pr/a", text: "A. Source: official Justice Department press. Stage: Charged (not convicted). Charges are allegations unless the page says convicted or a guilty plea." };
  const existing = [prev];
  const row = { name: "Maria Elena Gomez", city: "Boston, MA", when: "2026-11-01", sourceUrl: "https://www.justice.gov/usao-ma/pr/b" };
  const item = { title: "Boston Woman Sentenced for SNAP Fraud", teaser: "BOSTON – Maria Elena Gomez, 51, was sentenced today to 2 years in prison.", when: Date.parse("2026-11-01T12:00:00Z") };
  assert.equal(laterStageUpdate(existing, row, item, 1), true);
  assert.equal(prev.stage, "Sentenced");
  assert.equal(prev.stageSourceUrl, "https://www.justice.gov/usao-ma/pr/b");
  assert.match(prev.text, /Stage: Sentenced\./);
  assert.match(prev.text, /was sentenced today to 2 years in prison\./);
  // Never backward: a later "pleads guilty" title does not move Sentenced back.
  assert.equal(laterStageUpdate(existing, { ...row, sourceUrl: "https://www.justice.gov/usao-ma/pr/c", when: "2026-12-01" }, { ...item, title: "Woman Pleads Guilty" }, 1), true);
  assert.equal(prev.stage, "Sentenced");
  // Other state: a different person.
  const other = [{ ...prev, stage: "Charged", city: "Houston, TX" }];
  assert.equal(laterStageUpdate(other, row, item, 1), false);
  assert.equal(other[0].stage, "Charged");
  // Multi-defendant release: the title stage is not borrowed.
  const multi = [{ ...prev, stage: "Charged" }];
  assert.equal(laterStageUpdate(multi, row, item, 3), false);
  assert.equal(multi[0].stage, "Charged");
});

test("no-pin Invasion Update voting row is cross-posted with no map pin", () => {
  const iu = { name: "Phath Vorn", status: "approved", voting: true, city: "Not stated", lat: null, lon: null, sourceUrl: "https://www.dhs.gov/news/2026/10/28/dozens-illegal-aliens-arrested-nationwide-voter-fraud-crackdown", usa: "DHS release Oct 28, 2026: Dozens of Illegal Aliens Arrested in Nationwide Voter Fraud Crackdown", crime: "Arrested: Phath Vorn, an illegal alien from Cambodia, illegally voted in an election.", when: "28 Oct 2026" };
  const item = invasionVotingItem(iu);
  assert.ok(item && item.crossPost);
  const rows = rowsFromItem(item, "DHSgov");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].city, "Not stated");
  assert.equal(rows[0].lat, null);
  const existing = [];
  crossPostInvasionVoting(existing, new Set(), [], [iu]);
  assert.equal(existing.length, 1);
  assert.equal(existing[0].name, "Phath Vorn");
});

test("a voter printed another way is not cross-posted twice", async () => {
  const { similarVoterListed } = await import("./harvest-gov.mjs");
  const ex = [{ name: "Monica Ivette Carzoli Carillo", voting: true }, { name: "Alejandro Garcia Villegas", voting: true }];
  assert.equal(similarVoterListed(ex, "Monica Carzoli Carrillo"), true);
  assert.equal(similarVoterListed(ex, "Alejandro Villegas Garcia"), true);
  assert.equal(similarVoterListed(ex, "Monica Perez"), false);
  assert.equal(similarVoterListed(ex, "Alejandro Garcia"), false);
});

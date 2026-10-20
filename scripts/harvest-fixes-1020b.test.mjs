// 2026-10-20 (9:36 AM CDT) small fixes: threats release kept out; a state name is never a defendant; tax origin.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { allPeople, personOrEntity } from "./harvest-parse.mjs";
import { dojItem, isExcluded, keepBlob, rowsFromItem } from "./harvest-gov.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const feed = JSON.parse(readFileSync(join(root, "data/harvest.json"), "utf8"));

describe("threats release is not fraud", () => {
  const title = "Bucks County Man Charged With Threatening to Assault and Murder a Member of the United States Congress";
  const teaser = "Aaron Michael McComsey, 44, of Perkasie, Pennsylvania, was charged with threatening to assault, murder, or kidnap a federal official. He wrote: “Aetna dropped me. Medicare doesn't cover drugs. And medicaid is refusing to pay.”";
  it("program words quoted in a threat do not make it a fraud case", () => {
    assert.equal(keepBlob(title, teaser), false);
  });
  it("a fraud release that mentions a threat still counts", () => {
    assert.equal(keepBlob("Man Sentenced for Medicare Fraud and Threatening a Witness", "billed Medicare for services never provided"), true);
    assert.equal(keepBlob("Clinic Owner Charged", "billed Medicaid for services never provided; a threat assessment followed"), true);
  });
  it("McComsey is on exclude.json", () => {
    assert.equal(isExcluded({ sourceUrl: "https://www.justice.gov/usao-edpa/pr/bucks-county-man-charged-threatening-assault-and-murder-member-united-states-congress" }), true);
  });
});

describe("a U.S. state is never a defendant name", () => {
  const title = "New York Health Care Provider Sentenced to 32 Months in Prison for Role in $11 Million Health Care Fraud Scheme Targeting Amtrak, Drug Distribution, and Unlawful Possession of Firearm";
  const teaser = "A podiatrist formerly based in New York was sentenced today for his role in a health care fraud scheme targeting Amtrak’s health care plan.";
  const body = `<p>${teaser}</p><p>Michael DeNicola, 64, pleaded guilty on June 29, 2022, before U.S. District Judge Madeline Cox Arleo in Newark federal court to conspiracy to commit health care fraud.</p>`;
  it("'based in New York was sentenced' yields no person; the body names DeNicola", () => {
    assert.deepEqual(allPeople(title, teaser), []);
    assert.notEqual(personOrEntity(title, teaser)?.name, "New York");
    const item = dojItem({ title, url: "https://www.justice.gov/usao-nj/pr/new-york-health-care-provider-sentenced-32-months-prison-role-11-million-health-care", teaser: `<p>${teaser}</p>`, body, date: "1791374400" });
    assert.deepEqual(rowsFromItem(item, "TheJusticeDept").map((r) => r.name), ["Michael DeNicola"]);
  });
  it("the live row is renamed, not duplicated", () => {
    const rows = feed.filter((r) => /new-york-health-care-provider/.test(r.sourceUrl));
    assert.deepEqual(rows.map((r) => r.name), ["Michael DeNicola"]);
  });
});

describe("tax-fraud origin", () => {
  it("Carney rows (wire fraud + tax fraud, donors and the government) are 'Tax fraud', not nursing credentials", () => {
    const rows = feed.filter((r) => /arkansas-non-profit-founders/.test(r.sourceUrl));
    assert.equal(rows.length, 2);
    for (const r of rows) assert.equal(r.origin, "Tax fraud");
  });
  it("new tax rows get 'Tax fraud'; COVID tax-credit cases keep their program label", () => {
    const tax = rowsFromItem({ title: "Arkansas Non-Profit Founders Receive Maximum Prison Sentences for Defrauding Donors and the Government", link: "https://www.justice.gov/usao-wdar/pr/x", when: Date.parse("2026-10-14T12:00:00Z"), teaser: "Jason Carney was sentenced to 192 months in prison on charges related to a conspiracy, wire fraud, and tax fraud. The founders of the non-profit 2nd Milk, which gave breast milk to nursing mothers, defrauded donors." }, "TheJusticeDept");
    assert.equal(tax[0].origin, "Tax fraud");
    const erc = rowsFromItem({ title: "Muncie Man Accused of Falsely Requesting over $1 Million in COVID-19 Relief Tax Credits", link: "https://www.justice.gov/usao-sdin/pr/y", when: Date.parse("2026-10-14T12:00:00Z"), teaser: "Gregory Vernon Dupree, 50, filed false tax returns claiming employee retention tax credits." }, "TheJusticeDept");
    assert.notEqual(erc[0].origin, "Tax fraud");
  });
});

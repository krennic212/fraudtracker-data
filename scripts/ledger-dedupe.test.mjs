import test from "node:test";
import assert from "node:assert/strict";
import { dedupeRows, schemeTotals } from "./ledger-dedupe.mjs";

const row = (o) => ({ name: "Jane Doe", schemeId: "s1", sourceUrl: "https://www.justice.gov/usao-mn/pr/two-men-plead-guilty-medicaid", photo: "", ...o });

test("exact duplicate rows collapse to the first", () => {
  const { rows, merged } = dedupeRows([row({ city: "A" }), row({ city: "B" })]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].city, "A");
  assert.equal(merged.length, 1);
});

test("usao vs opa copy of the same release for the same person collapses", () => {
  const { rows } = dedupeRows([row(), row({ sourceUrl: "https://www.justice.gov/opa/pr/two-men-plead-guilty-medicaid", schemeId: "s2" })]);
  assert.equal(rows.length, 1);
});

test("different people, or the same person in a different case, are kept", () => {
  const { rows } = dedupeRows([
    row(),
    row({ name: "John Roe" }),
    row({ sourceUrl: "https://www.justice.gov/usao-mn/pr/doe-sentenced-other-scheme" }),
  ]);
  assert.equal(rows.length, 3);
});

test("rows are otherwise untouched, photos are blanked", () => {
  const src = row({ photo: "https://x/y.jpg", crime: "Agrees to Pay $3M to Resolve", office: "Raul_Labrador" });
  const { rows } = dedupeRows([src]);
  assert.deepEqual(rows[0], { ...src, photo: "" });
});

test("scheme dollars count once per schemeId", () => {
  const t = schemeTotals([
    row({ usdAlleged: 5_000_000 }),
    row({ name: "B", usdAlleged: 5_000_000 }),
    row({ name: "C", schemeId: "s2", usdAlleged: null }),
  ]);
  assert.deepEqual(t, { schemes: 2, usd: 5_000_000 });
});

test("OIG mirror of the same titled release for the same person collapses", () => {
  const { rows, merged } = dedupeRows([
    row({
      name: "Ricky Lee Ware",
      when: "2026-10-16",
      crime: "Two Plead Guilty to Unemployment Insurance Benefits Fraud Conspiracy",
      sourceUrl: "https://www.justice.gov/usao-edca/pr/two-plead-guilty-unemployment-insurance-benefits-fraud-conspiracy",
      schemeId: "s-doj",
    }),
    row({
      name: "Ricky Lee Ware",
      when: "2026-10-16",
      crime: "Two Plead Guilty to Unemployment Insurance Benefits Fraud Conspiracy",
      sourceUrl: "https://www.oig.dol.gov/public/Press%20Releases/OIG-OI-Press-Release-101926_1.htm",
      schemeId: "s-dol",
    }),
  ]);
  assert.equal(rows.length, 1);
  assert.equal(merged.length, 1);
  assert.match(rows[0].sourceUrl, /justice\.gov/);
});

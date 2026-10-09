import test from "node:test";
import assert from "node:assert/strict";
import { rowId, duplicateIds, schemeIdFor, schemeUrlConflicts } from "./ledger-id.mjs";

const POTASH = "https://www.justice.gov/usao-md/pr/maryland-man-facing-federal-indictment-role-covid-19-healthcare-fraud-scheme-totaling";
const PIERRE = "https://www.justice.gov/usao-md/pr/maryland-man-facing-federal-indictment-connection-gift-card-scam";

test("two releases sharing a long slug prefix get different ids", () => {
  const a = rowId(POTASH, "Marc Aaron Potash");
  const b = rowId(PIERRE, "Sharieff Tate Pierre");
  assert.notEqual(a, b);
  // even the same name on two such releases must not collide
  assert.notEqual(rowId(POTASH, "Jane Doe"), rowId(PIERRE, "Jane Doe"));
  // readable prefix is still shared; the hash is what separates them
  assert.equal(a.slice(0, -11), b.slice(0, -11));
  assert.match(a, /^harvest-[a-z0-9-]+-[0-9a-f]{10}$/);
});

test("co-defendants on one release get different ids", () => {
  assert.notEqual(rowId(POTASH, "Marc Aaron Potash"), rowId(POTASH, "John Roe"));
});

test("same person + release always gets the same id (case/accents/punctuation ignored)", () => {
  assert.equal(rowId(POTASH, "Marc Aaron Potash"), rowId(POTASH, "Marc Aaron Potash"));
  assert.equal(rowId(POTASH, "MARC AARON POTASH"), rowId(POTASH, "Marc  Aaron Potash."));
  assert.equal(rowId(POTASH, "Marc Aaron Potash"), "harvest-https-www-justice-gov-usao-md-pr-maryland-man-fa-" +
    rowId(POTASH, "Marc Aaron Potash").slice(-10));
});

test("pre-publish check flags duplicate and missing ids", () => {
  assert.deepEqual(duplicateIds([{ id: "a" }, { id: "b" }]), []);
  assert.deepEqual(duplicateIds([{ id: "a" }, { id: "a" }, { id: "b" }]), [{ id: "a", n: 2 }]);
  assert.deepEqual(duplicateIds([{ id: "a" }, {}]), [{ id: undefined, n: 1 }]);
});

test("schemeId: releases sharing a long slug prefix get different schemeIds", () => {
  const a = schemeIdFor(POTASH);
  const b = schemeIdFor(PIERRE);
  assert.notEqual(a, b);
  assert.equal(a.slice(0, -11), b.slice(0, -11));
  assert.match(a, /^harvest-[a-z0-9-]+-[0-9a-f]{10}$/);
});

test("schemeId: co-defendants on one release share it, stable across runs", () => {
  assert.equal(schemeIdFor(POTASH), schemeIdFor(POTASH));
  assert.equal(schemeIdFor(` ${POTASH} `), schemeIdFor(POTASH));
});

test("pre-publish check flags a harvest- schemeId spanning two release URLs", () => {
  const ok = [
    { schemeId: schemeIdFor(POTASH), sourceUrl: POTASH, name: "A" },
    { schemeId: schemeIdFor(POTASH), sourceUrl: POTASH, name: "B" },
    { schemeId: schemeIdFor(PIERRE), sourceUrl: PIERRE, name: "C" },
    { schemeId: "op-operation-x", sourceUrl: POTASH },
    { schemeId: "op-operation-x", sourceUrl: PIERRE },
  ];
  assert.deepEqual(schemeUrlConflicts(ok), []);
  const bad = [
    { schemeId: "harvest-https-www-justice-gov-usao-md-pr-maryland-man-fa", sourceUrl: POTASH },
    { schemeId: "harvest-https-www-justice-gov-usao-md-pr-maryland-man-fa", sourceUrl: PIERRE },
  ];
  assert.deepEqual(schemeUrlConflicts(bad), [
    { schemeId: "harvest-https-www-justice-gov-usao-md-pr-maryland-man-fa", urls: [POTASH, PIERRE] },
  ]);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { keepBlob } from "./harvest-gov.mjs";

test("money obtained from the Social Security Administration is government money (usao-sdms Jones, 2026-11-24)", () => {
  assert.equal(keepBlob("Harrison County Woman Pleads Guilty to Conspiracy and Identity Theft related to Social Security Fraud",
    "Shanell Stacey Ann Jones, 30, of Gulfport, conspired to fraudulently obtain $259,934.57 from the Social Security Administration by diverting social security benefit payments intended for social security recipients to accounts owned by or accessible by Jones."), true);
});

test("a mere mention of the Social Security Administration is not enough", () => {
  assert.equal(keepBlob("Man Sentenced for Romance Scam", "The defendant told victims he worked for the Social Security Administration and obtained gift cards."), false);
  assert.equal(keepBlob("Man Charged with Bank Fraud", "Investigated by the Social Security Administration Office of the Inspector General."), false);
});

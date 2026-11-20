import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { keepBlob } from "./harvest-gov.mjs";

// Krennic 2026-11-20: "Approve both rule changes" (crop insurance/FCIC/RMA; PR and territory public-official bribery).
describe("crop insurance and territory bribery keeps (2026-11-20)", () => {
  it("keeps USDA crop insurance fraud", () => {
    assert.equal(keepBlob("Man Pleads Guilty to Crop Insurance Fraud", "He made false statements to influence the USDA Risk Management Agency."), true);
    assert.equal(keepBlob("Farmer Sentenced", "He defrauded the Federal Crop Insurance Corporation (FCIC)."), true);
  });
  it("does not keep private crop/agri business fraud", () => {
    assert.equal(keepBlob("Grain Broker Pleads Guilty", "He defrauded private farmers of grain sale proceeds at his agricultural supply company."), false);
  });
  it("keeps bribery of Puerto Rico and territory agencies", () => {
    assert.equal(keepBlob("Former Hacienda Employee Sentenced", "A bribery conspiracy to defraud the Puerto Rico Department of Treasury, costing about $5 million."), true);
    assert.equal(keepBlob("Official Pleads Guilty", "He conspired to defraud the Government of Guam through bribes."), true);
    assert.equal(keepBlob("Official Sentenced", "He accepted bribes to defraud the U.S. Virgin Islands Bureau of Internal Revenue."), true);
  });
  it("does not keep private-sector bribery in Puerto Rico", () => {
    assert.equal(keepBlob("Manager Sentenced", "He accepted kickbacks from vendors of a private San Juan retailer, depriving his employer of his honest services."), false);
    assert.equal(keepBlob("Executive Pleads Guilty", "Commercial bribery at a private Puerto Rico pharmaceutical company."), false);
  });
});

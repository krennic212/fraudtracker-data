import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { keepBlob } from "./harvest-gov.mjs";

// Krennic 2026-11-19: "Yes, add the county bribery pattern" (public-official bribery/kickbacks/honest services
// where county, municipal or state government is the victim).
describe("county/local public-official bribery keeps (2026-11-19)", () => {
  it("Fallacara-style release keeps", () => {
    assert.equal(keepBlob("Former Hudson County Parks Director Sentenced to 72 Months for Bribery Scheme",
      "He conspired to defraud Hudson County of his honest services by accepting bribes and kickbacks in exchange for county contracts."), true);
    assert.equal(keepBlob("Official Sentenced", "A former public official accepted bribes and kickbacks tied to municipal contracts."), true);
    assert.equal(keepBlob("Official Pleads Guilty", "He deprived the City of Newark of his honest services."), true);
  });
  it("private-sector bribery and private honest-services cases do not keep", () => {
    assert.equal(keepBlob("Executive Sentenced", "He accepted kickbacks from vendors of his private employer, a software company, depriving it of his honest services."), false);
    assert.equal(keepBlob("Broker Pleads Guilty", "The commercial bribery scheme paid kickbacks to a purchasing manager at a private manufacturer."), false);
    assert.equal(keepBlob("Man Sentenced", "He defrauded investors in Bergen County of $2 million."), false);
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const gov = readFileSync(join(root, "scripts/harvest-gov.mjs"), "utf8");

describe("hourly harvest sources", () => {
  it("pins Eastern District of California (Sacramento) for usao-edca URLs", () => {
    assert.match(gov, /"usao-edca":\s*\["Sacramento, CA"/);
  });

  it("lists DOL OIG press releases as a recurring IG source", () => {
    assert.match(gov, /office:\s*"DOLOIG"/);
    assert.match(gov, /oig\.dol\.gov\/oigpressreleases\.htm/);
    // Relative Press Releases paths (DOL omits the leading slash) are resolved.
    assert.match(gov, /href="\(\(\?:public\|Press\)/);
  });

  it("keeps unemployment / pandemic-UI language on the KEEP filter", () => {
    assert.match(gov, /unemployment \(insur\|benef\|fraud\|comp\)/);
    assert.match(gov, /pandemic unemployment/);
  });
});

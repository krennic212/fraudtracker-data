// Krennic 2026-11-03 12:29 PM CT: "If he wasn't convicted for voting but he was convicted for something else, don't list him as voting."
// Invasion Update untags such rows; the ledger never cross-posts them, and its own copies are not filed as voting.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { invasionVotingItem } from "./harvest-gov.mjs";

const feed = JSON.parse(readFileSync(new URL("../data/harvest.json", import.meta.url), "utf8"));

test("an Invasion Update row untagged for a non-voting stage is never cross-posted", () => {
  const row = {
    name: "Julio De La Rosa", status: "approved", voting: false, city: "Not stated", lat: null, lon: null, origin: "Mexico",
    crime: "Convicted: Julio De La Rosa, a criminal illegal alien from Mexico with a final order of removal […]. De La Rosa has been convicted of strangulation, assault, violation of a court order and a probation violation.",
    usa: "ICE release Oct 30, 2026: ICE continues to arrest dozens of illegal aliens in nationwide crackdown on voter fraud",
    sourceUrl: "https://www.ice.gov/news/releases/ice-continues-arrest-dozens-illegal-aliens-nationwide-crackdown-voter-fraud",
    id: "ice-20261030-julio-de-la-rosa",
  };
  assert.equal(invasionVotingItem(row), null);
});

test("live ledger: De La Rosa and Nieves-Borja absent; Martinez and the PPP four kept but not filed as voting", () => {
  for (const n of ["Julio De La Rosa", "Gerardo Nieves-Borja"]) assert.ok(!feed.some((r) => r.name === n), n);
  for (const n of ["Juan Arturo Martinez", "Jonathan Arroyo", "Daquan Dooley", "Demetrous Thomas", "Gianni Williams Johnson"]) {
    const r = feed.find((x) => x.name === n);
    assert.ok(r, n);
    assert.notEqual(r.voting, true, n);
  }
  assert.equal(feed.find((x) => x.name === "Jose Maria Hernandez Bautista")?.voting, true);
});

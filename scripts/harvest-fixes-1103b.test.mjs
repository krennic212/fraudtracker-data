// Krennic 2026-11-03 (10:01 approval): a place is never a person; "a <State> man/woman" beats the court location.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isPlaceName } from "./harvest-parse.mjs";
import { residentStateGeo, rowsFromItem } from "./harvest-gov.mjs";

const feed = JSON.parse(readFileSync(new URL("../data/harvest.json", import.meta.url), "utf8"));

test("isPlaceName: whole-name places only", () => {
  for (const n of ["South Africa", "Washoe County", "Los Angeles", "San Fernando Valley", "NEW YORK", "Reno, Nevada"]) assert.equal(isPlaceName(n), true, n);
  for (const n of ["Hanlie Venter", "Mlebinge Riziki Ramadhani", "Paris Hilton", "Jordan Smith", "Lamont McCarthy", "Washington Irving"]) assert.equal(isPlaceName(n), false, n);
});

test("rowsFromItem never makes a row named for a place", () => {
  const item = {
    title: "Lawful Permanent Resident from South Africa Charged with Unlawful Voting by Alien",
    teaser: "Hanlie Venter, 50, a lawful permanent resident from South Africa, was charged with voting by an alien.",
    link: "https://www.justice.gov/usao-wdmo/pr/lawful-permanent-resident-south-africa-charged-unlawful-voting-alien",
    names: ["Hanlie Venter", "South Africa"],
  };
  const names = rowsFromItem(item, "TheJusticeDept").map((r) => r.name);
  assert.ok(names.includes("Hanlie Venter"), names.join());
  assert.ok(!names.includes("South Africa"), names.join());
});

test("residentStateGeo: one state, never the victim's state", () => {
  assert.equal(residentStateGeo("North Carolina Man Arraigned in Federal Court for Voting More Than Once")?.city, "North Carolina, NC");
  assert.equal(residentStateGeo("a West Virginia man pleaded guilty")?.city, "West Virginia, WV");
  assert.equal(residentStateGeo("a West Virginia man and a Virginia woman"), null);
  assert.equal(residentStateGeo("Previously Convicted Killer of a Maryland Man Pleads Guilty"), null);
  assert.equal(residentStateGeo("Madison County Man Pleads Guilty"), null);
});

test("single defendant: 'a North Carolina man' pins North Carolina, not the N.D. Ala. seat", () => {
  const item = {
    title: "North Carolina Man Arraigned in Federal Court for Voting More Than Once in a Single Election",
    teaser: "Forrest Scott Woody, 70, was arraigned on charges of voting more than once in the 2024 election.",
    link: "https://www.justice.gov/usao-ndal/pr/north-carolina-man-arraigned-federal-court-voting-more-once-single-election-0",
    names: ["Forrest Scott Woody"],
  };
  const [r] = rowsFromItem(item, "TheJusticeDept");
  assert.equal(r.city, "North Carolina, NC");
});

test("live feed: no place-named rows; Venter, Ramadhani and McCarthy kept; Woody in North Carolina", () => {
  assert.deepEqual(feed.filter((r) => isPlaceName(r.name)).map((r) => r.name), []);
  for (const n of ["Hanlie Venter", "Mlebinge Riziki Ramadhani", "Lamont McCarthy", "Damon Matai Seei"]) assert.ok(feed.some((r) => r.name === n), n);
  assert.equal(feed.find((r) => r.name === "Forrest Scott Woody").city, "North Carolina, NC");
});

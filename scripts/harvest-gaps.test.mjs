// 2026-10-20 audit gaps: government-program releases the hourly harvest missed, and the guards that keep
// the ledger to government-program fraud. Texts are the releases' own words.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { allPeople, personOrEntity } from "./harvest-parse.mjs";
import {
  crossPostInvasionVoting, districtSeatFromText, dojItem, harvestSeed, ingest, invasionVotingItem, keepBlob,
  listedVoterAnyDate, programText, stateOnlyCity, geoForInvasionRow, rowsFromItem, samePersonRecent, seededLinks,
} from "./harvest-gov.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const gov = readFileSync(join(root, "scripts/harvest-gov.mjs"), "utf8");
const seed = JSON.parse(readFileSync(join(root, "data/seed-releases.json"), "utf8"));

const DOL = "DETROIT — On October 6, 2026, Derrick Thompson, a multi-convicted felon with previous charges of fraud, assault and felony firearms violations, was arrested by DOL-OIG and ATF agents for his role in an unemployment insurance (UI) fraud scheme. Thompson was previously charged with one count of bank fraud and one count of aggravated identity theft. On October 7, 2026, Charles Marshall was arrested by DOL-OIG and ATF agents for his role in a UI fraud scheme, Marshall was previously charged with one count of bank fraud. CHICAGO — On October 7, 2026, Andrea Wellington, a former employee of an Illinois Department of Employment Security (IDES) sub-contractor, and her alleged co-conspirator, Randall Easley, a known Chicago gang associate, were charged by a federal grand jury indictment with multiple counts of wire fraud related to an alleged UI fraud scheme.";

describe("names: every defendant in multi-defendant releases", () => {
  it("DOL OIG regional roundup: all four people, not just the first", () => {
    assert.deepEqual(allPeople("", DOL).sort(), ["Andrea Wellington", "Charles Marshall", "Derrick Thompson", "Randall Easley"]);
  });
  it("'Texas residents A, B, C and D promoted ...'", () => {
    assert.deepEqual(
      allPeople("", "According to the indictment, Texas residents Duncan John MacDonald, Sarah Duren, Richard Ronald Cayce and Thomas Weickgenant promoted and sold a fraudulent trust scheme."),
      ["Duncan John MacDonald", "Sarah Duren", "Richard Ronald Cayce", "Thomas Weickgenant"],
    );
  });
  it("USAO ALL-CAPS first mention counts only when the surname is the subject of a charge/age line", () => {
    const t = "ANDREA WELLINGTON engaged in fraud related to the PUA program. She and co-defendant RANDALL EASLEY accessed the IDES PUA system. Wellington, 35, of Chicago, is charged with 21 counts of wire fraud, while Easley, 38, of Chicago, is charged with 14 counts.";
    assert.deepEqual(allPeople("", t).sort(), ["ANDREA WELLINGTON", "RANDALL EASLEY"]);
    assert.deepEqual(allPeople("", "The FRAUD DIVISION and the IRS CRIMINAL INVESTIGATION unit announced results."), []);
  });
  it("a place before 'pleaded guilty' is not a person; a/k/a and ', Jr.,' names are read", () => {
    const t = "Miguel Dario Bautista Jimenez, a/k/a “Carlos Chapman Hernandez,” a/k/a “Carlos Hernandez,” 42, of Hoboken, New Jersey pleaded guilty to a two-count Indictment.";
    assert.deepEqual(allPeople("", t), ["Miguel Dario Bautista Jimenez"]);
    assert.deepEqual(allPeople("", "CHARLOTTE, N.C. – Ronnie Lorenzo Robinson, Jr., 56, of Charlotte, appeared in federal court today."), ["Ronnie Lorenzo Robinson Jr."]);
  });
  it("company names stop at a lowercase word", () => {
    assert.equal(personOrEntity("CVS Agrees to Pay $315M", "HONOLULU – United States Attorney Ken Sorenson announced that CVS Pharmacy Inc. has agreed to pay.").name, "CVS Pharmacy Inc.");
  });
});

describe("scope: government-program fraud only", () => {
  it("keeps the program wording the audit found missing", () => {
    for (const [t, x] of [
      ["Muncie Man Accused of Falsely Requesting over $1 Million in COVID-19 Relief Tax Credits", "claims for the Employee Retention Credit (ERC)"],
      ["Texas residents charged with promoting Illegal tax shelter", "conspiracy to defraud the United States"],
      ["Sanford Woman Sentenced for Theft of Government Money", "sentenced Cori Godin"],
      ["Dover Contractor and Owners Pay $295,204 to Settle Postal Service Overbilling Claims", "violated the False Claims Act by overbilling the U.S. Postal Service"],
      ["Massachusetts Man Charged for His Role in Marriage and Immigration Document Fraud", "sham marriage"],
      ["New Haven Man Pleads Guilty to Pandemic Relief Program Fraud Offense", ""],
      ["Waipahu Women Sentenced to Two Years in Prison for Pandemic and Tax Fraud", "filing false tax returns and wire fraud"],
    ]) assert.equal(keepBlob(t, x), true, t);
  });
  it("drops private-victim fraud that only says wire / bank / mail fraud", () => {
    assert.equal(keepBlob("Man Sentenced for Defrauding Investors", "pleaded guilty to wire fraud for stealing $2 million from investors"), false);
    assert.equal(keepBlob("Former Bank Teller Charged with Bank Fraud", "stole from customer accounts"), false);
  });
  it("ignores agency boilerplate and payroll 'Medicare taxes'; skips HHS-OIG exclusion notices", () => {
    assert.equal(keepBlob("Miami Man Pleads Guilty to Conspiracy to Distribute Opioid Pills", "Jose Llerena, 49, conspired to distribute oxycodone. In addition, the Centers for Medicare & Medicaid Services, working in conjunction with the Office of the Inspector General"), false);
    // Payroll "Medicare taxes" is not Medicare fraud. (A release titled "Tax Fraud ..." is in scope since 2026-10-20 as tax.)
    assert.equal(keepBlob("Restaurant Owner Sentenced", "responsible for withholding federal income taxes and Social Security and Medicare taxes"), false);
    assert.equal(keepBlob("HHS-OIG Issues Notice of Exclusion to Founder and CEO of Theranos, Inc.", "excluded from Medicare and Medicaid"), false);
    assert.match(programText("He billed Medicaid. The Task Force to Eliminate Fraud is chaired by the Vice President."), /billed Medicaid/);
  });
});

describe("DOJ API item: body read when the teaser has no name", () => {
  const body = "<p>CHICAGO – A former employee of a State of Illinois subcontractor has been indicted.</p><p>ANDREA WELLINGTON engaged in fraud related to the Pandemic Unemployment Assistance (“PUA”) program. Wellington, 35, of Chicago, is charged with 21 counts of wire fraud.</p>";
  it("uses the body opening when the teaser names nobody", () => {
    const it0 = dojItem({ title: "Former Employee Indicted for Covid-Relief Benefits Fraud", url: "https://www.justice.gov/usao-ndil/pr/x", body, teaser: "A former employee of a State of Illinois subcontractor has been indicted.", date: "1792411200" });
    assert.deepEqual(rowsFromItem(it0, "TheJusticeDept").map((r) => r.name), ["ANDREA WELLINGTON"]);
  });
  it("keeps the teaser's names when only the program wording is in the body (no official becomes a row)", () => {
    const it1 = dojItem({ title: "Waipahu Woman Sentenced", url: "https://www.justice.gov/usao-hi/pr/y", teaser: "Heidi Cafirma, 46, of Waipahu, Hawaii, was sentenced for wire fraud.", body: "<p>Heidi Cafirma, 46, of Waipahu, Hawaii, was sentenced for wire fraud.</p><p>Cafirma submitted 22 false claims for Pandemic Unemployment Assistance.</p><p>Special Agent in Charge John Doe, 50, of the IRS, said.</p>", date: "1792411200" });
    assert.deepEqual(it1.names, ["Heidi Cafirma"]);
    assert.deepEqual(rowsFromItem(it1, "TheJusticeDept").map((r) => r.name), ["Heidi Cafirma"]);
  });
  it("every U.S. Attorney's office has a map pin (94 districts)", () => {
    const seats = new Set(gov.match(/"usao-[a-z]+":\s*\[/g).map((s) => s.slice(1, s.indexOf('"', 1))));
    assert.ok(seats.size >= 94, `only ${seats.size}`);
    for (const k of ["usao-ks", "usao-sdin", "usao-hi", "usao-edla", "usao-ndfl", "usao-me", "usao-wdva", "usao-de", "usao-sdwv", "usao-ndoh", "usao-mn", "usao-dc"]) assert.ok(seats.has(k), k);
    assert.equal(districtSeatFromText("returned in the Northern District of Texas").city, "Dallas, TX");
    assert.equal(districtSeatFromText("a federal grand jury in the District of Minnesota").city, "Minneapolis, MN");
  });
});

describe("seed releases (2026-10-20 adds)", () => {
  it("each listed name appears verbatim in its teaser; only listed names become rows", () => {
    // nameIn[n]: how the release prints a name it does not write out ("Joshua and Lisa Urovitch"); that form must be verbatim.
    for (const r of seed.releases) for (const n of r.names || []) assert.ok(r.teaser.includes(r.nameIn?.[n] || n), `${n} not in teaser of ${r.link}`);
    const existing = [];
    harvestSeed(existing, new Set(), []);
    const names = existing.map((r) => r.name);
    assert.ok(!names.some((n) => /Lickteig/.test(n)), "Lickteig is not on the add list");
    const ks = existing.filter((r) => /two-florida-defendants/.test(r.sourceUrl)).map((r) => r.name);
    assert.deepEqual(ks, ["Steven Anthony Churchill", "Samson Kollelil Solomon"]);
    const de = existing.filter((r) => /dover-contractor/.test(r.sourceUrl));
    assert.deepEqual(de.map((r) => r.name), ["Garrett Mechanical Inc.", "Hey Brother, LLC", "Joseph Bruni", "Daniel Tulchin"]);
    assert.equal(new Set(de.map((r) => r.schemeId)).size, 1, "one scheme, one dollar figure");
    for (const r of de) assert.equal(r.entered, "Amount not stated");
    const tax = existing.filter((r) => /illegal-tax-shelter/.test(r.sourceUrl));
    assert.equal(tax.length, 4);
    assert.ok(tax.every((r) => r.stage === "Charged" && /Stage: Charged \(not convicted\)/.test(r.text)));
    const ch = existing.find((r) => /Chaudhari/.test(r.name));
    assert.equal(ch.office, "DHSgov");
    assert.equal(ch.confirmedBy, "DHS");
    assert.equal(ch.city, "Minneapolis, MN");
  });
  it("the DOJ API pass skips seeded releases (no second spelling, no extra names)", () => {
    assert.ok(seededLinks().has("justice.gov/usao-ks/pr/two-florida-defendants-sentenced-prison-nearly-900000-health-care-scam"));
  });
  it("same person re-posted by another agency within 21 days is not added twice", () => {
    const existing = [{ name: "ANDREA WELLINGTON", when: "2026-10-19", sourceUrl: "https://www.justice.gov/usao-ndil/pr/a" }];
    assert.equal(samePersonRecent(existing, { name: "Andrea Wellington", when: "2026-10-16", sourceUrl: "https://www.oig.dol.gov/b" }), true);
    assert.equal(samePersonRecent(existing, { name: "Andrea Wellington", when: "2026-06-01", sourceUrl: "https://www.oig.dol.gov/b" }), false);
  });
});

describe("cross-post: Invasion Update voting rows -> ledger", () => {
  const inv = (o) => ({
    name: "Gaye Tyndale-Simpson", status: "approved", voting: true, when: "19 Oct 2026",
    usa: "DOJ release Oct 19, 2026: Illegal Alien Admits to Illegally Voting in Federal Election in New Jersey",
    crime: "Convicted: Gaye Tyndale-Simpson, an illegal alien from Jamaica, pleaded guilty to one count of voting by an alien in a federal election before U.S. Magistrate Rukhsanah L. Singh in federal court in Trenton, New Jersey.",
    sourceUrl: "https://www.justice.gov/opa/pr/illegal-alien-admits-illegally-voting-federal-election-new-jersey",
    city: "Trenton, NJ", lat: 40.2169, lon: -74.7429, ...o,
  });
  it("only approved, official, harvester-built voting rows", () => {
    assert.ok(invasionVotingItem(inv()));
    assert.equal(invasionVotingItem(inv({ status: "pending" })), null);
    assert.equal(invasionVotingItem(inv({ voting: false })), null);
    assert.equal(invasionVotingItem(inv({ sourceUrl: "https://x.com/DHSgov/status/1" })), null);
    assert.equal(invasionVotingItem(inv({ usa: "Northern District of Texas. Named on the Sep 18 roundup" })), null, "hand-summarized rows are not release wording");
  });
  it("adds the voter once, with the release sentence, its stage and pin; never a second copy", () => {
    const existing = [];
    const added = [];
    crossPostInvasionVoting(existing, new Set(), added, [inv(), inv({ sourceUrl: "https://www.justice.gov/usao-nj/pr/alien-admits-illegally-voting-federal-election-0" })]);
    assert.deepEqual(added, ["Gaye Tyndale-Simpson"]);
    const r = existing[0];
    assert.equal(r.voting, true);
    assert.equal(r.origin, "Voting / elections");
    assert.equal(r.stage, "Convicted");
    assert.equal(r.city, "Trenton, NJ");
    assert.match(r.text, /pleaded guilty to one count of voting by an alien/);
    assert.equal(listedVoterAnyDate(existing, "Gaye Tyndale-Simpson"), true);
    assert.equal(listedVoterAnyDate(existing, "Jamaica Gaye Tyndale-Simpson"), true);
  });
  it("a release that names only a state gets \"<State>, XX\", never a made-up town (Higgs, DHS NC release)", () => {
    assert.equal(stateOnlyCity("North Carolina"), "North Carolina, NC");
    assert.equal(stateOnlyCity("district of columbia"), "District of Columbia, DC");
    assert.equal(stateOnlyCity("Wyoming"), "Wyoming, WY");
    assert.equal(stateOnlyCity("Trenton, NJ"), "Trenton, NJ");
    assert.equal(stateOnlyCity("Bahamas"), "Bahamas");
    assert.equal(geoForInvasionRow({ city: "North Carolina", lat: 35.7596, lon: -79.0193 }).city, "North Carolina, NC");
    assert.equal(geoForInvasionRow({ city: "Nevada" }).city, "Nevada, NV");
    const existing = [];
    crossPostInvasionVoting(existing, new Set(), [], [inv({ city: "North Carolina", lat: 35.7596, lon: -79.0193 })]);
    assert.equal(existing[0].city, "North Carolina, NC");
  });
  it("is wired into the hourly run", () => {
    assert.match(gov, /const inv = await harvestInvasionVoting\(existing, have, added\);/);
    assert.match(gov, /krennic212\.github\.io\/invasionupdate-data\/harvest\.json/);
  });
});

describe("seed schemeKey / usdAlleged: one multi-case takedown release, one schemeId and one figure per scheme", () => {
  const LA = "https://www.justice.gov/usao-cdca/pr/la-health-care-fraud-takedown-results-15-defendants-charged-including-six-medical";
  const la = seed.releases.filter((r) => r.link === LA);
  it("the L.A. takedown is seeded per scheme, government-program cases only (no Young / Phipps / Moore / Mladinich / Wang)", () => {
    const names = la.flatMap((r) => r.names);
    assert.deepEqual(names, ["Harold Tabaie", "Hany Malek", "Geoffrey Jimenez", "Richard Keech", "Armani Raffi", "Hassan Badday", "Robby Ayoub", "Christina Mareik"]);
    assert.equal(new Set(la.map((r) => r.schemeKey)).size, la.length);
    for (const r of la) for (const n of r.names) assert.ok(r.teaser.includes(n), n);
  });
  it("rows: co-defendants share a scheme, separate cases never do; usdAlleged is the scheme's own figure", () => {
    const existing = [];
    const added = [];
    harvestSeed(existing, new Set(), added);
    const rows = existing.filter((r) => r.sourceUrl === LA);
    assert.equal(rows.length, 8);
    const by = Object.fromEntries(rows.map((r) => [r.name, r]));
    assert.equal(by["Harold Tabaie"].schemeId, by["Hany Malek"].schemeId);
    assert.equal(new Set(rows.map((r) => r.schemeId)).size, 7);
    assert.equal(by["Hany Malek"].usdAlleged, 135000000);
    assert.equal(by["Christina Mareik"].usdAlleged, 269130000);
    for (const r of rows) assert.equal(r.photo, "");
    for (const r of rows) assert.equal(r.stage, "Charged");
    const plea = existing.find((r) => r.name === "Gregory P. Heimann Jr.");
    assert.equal(plea.stage, "Pleaded guilty");
    assert.ok(!("usdAlleged" in plea), "no figure stated, none set");
  });
});

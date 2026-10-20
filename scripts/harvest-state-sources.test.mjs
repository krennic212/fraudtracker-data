import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  STATE_SOURCES,
  readReleaseHtml,
  releaseDate,
  isElectionCase,
  isSourceUrl,
  listItems,
  electionCandidate,
  readStateSources,
  stateDefendants,
  stateStage,
  datelineCity,
  stateGeo,
  countiesIn,
} from "./state-sources.mjs";

// Twelve official state release pages (scripts, styles, nav and footer stripped), saved 2026-10-20.
const PAGES = JSON.parse(readFileSync(new URL("./fixtures/state-releases-2026.json", import.meta.url), "utf8"));
const page = (part) => {
  const url = Object.keys(PAGES).find((u) => u.includes(part));
  const html = PAGES[url];
  const src = STATE_SOURCES.find((s) => isSourceUrl(s, url));
  return { url, html, src, ...readReleaseHtml(html), state: src?.state };
};
const names = (part) => stateDefendants(page(part)).map((p) => p.name);

const OFFICIALS = /Paxton|Uthmeier|DeSantis|Formella|O[’']Donnell|Ostrowski|Kobach|Schwab|Nessel|Sunday|Garrity|Glass|Humble|Simpson|Edwards|Byrd|McVay|Kahler|Bender|Tracy|Gilbert|Conley|Louis/;

test("state sources: every source is an official https state page with a host and release path", () => {
  assert.ok(STATE_SOURCES.length >= 20);
  for (const office of ["FloridaAG", "FDLE", "TexasAG", "MichiganAG", "NewHampshireDOJ", "NevadaAG", "PennsylvaniaAG", "KansasAG", "GeorgiaAG", "NorthCarolinaAG", "OhioAG", "ArizonaAG", "AlabamaAG", "VirginiaAG", "LouisianaAG", "MissouriAG", "TennesseeAG", "IowaAG"])
    assert.ok(STATE_SOURCES.some((s) => s.office === office), office);
  for (const s of STATE_SOURCES) {
    assert.match(s.url, /^https:\/\//, s.office);
    assert.ok(s.host && s.path, s.office);
    assert.match(s.state, /^[A-Z]{2}$/, s.office);
  }
});

test("state sources: release URLs must be the office's own https host and path", () => {
  const ks = STATE_SOURCES.find((s) => s.office === "KansasAG");
  const fl = STATE_SOURCES.find((s) => s.office === "FloridaAG");
  assert.equal(isSourceUrl(ks, "https://www.ag.ks.gov/Home/Components/News/News/231/"), true);
  assert.equal(isSourceUrl(ks, "http://www.ag.ks.gov/Home/Components/News/News/231/"), false);
  assert.equal(isSourceUrl(fl, "https://www.myfloridalegal.com.evil.example/newsrelease/x"), false);
  assert.equal(isSourceUrl(fl, "https://www.myfloridalegal.com/consumer-protection/x"), false);
  assert.equal(isSourceUrl(fl, "https://x.com/AGJamesUthmeier/status/1"), false);
});

test("state sources: listings keep only on-site release links; RSS dates read", () => {
  const fl = STATE_SOURCES.find((s) => s.office === "FloridaAG");
  const rss = `<rss><channel><item><title>Attorney General Announces Arrests in Election Integrity Operation</title><link>https://www.myfloridalegal.com/newsrelease/ag-arrests-voter-fraud</link><pubDate>Thu, 24 Sep 2026 15:00:00 GMT</pubDate></item><item><title>Elsewhere</title><link>https://example.com/newsrelease/x</link></item></channel></rss>`;
  const items = listItems(fl, rss);
  assert.deepEqual(items, [{ title: "Attorney General Announces Arrests in Election Integrity Operation", url: "https://www.myfloridalegal.com/newsrelease/ag-arrests-voter-fraud", date: "2026-09-24" }]);
  const tx = STATE_SOURCES.find((s) => s.office === "TexasAG");
  const html = `<a href="/news/releases/attorney-general-ken-paxton-announces-arrest-starr-county-illegal-ballot-harvesting-scheme">Arrest in Starr County</a><a href="/news">News</a><a href="https://evil.example/news/releases/x">x</a>`;
  assert.deepEqual(listItems(tx, html).map((i) => i.url), ["https://www.texasattorneygeneral.gov/news/releases/attorney-general-ken-paxton-announces-arrest-starr-county-illegal-ballot-harvesting-scheme"]);
  assert.equal(electionCandidate({ title: "Arrest in Starr County", url: "https://x/illegal-ballot-harvesting" }), true);
  assert.equal(electionCandidate({ title: "AG sues opioid maker", url: "https://x/opioid-settlement" }), false);
});

test("state sources: the twelve saved releases are election-crime cases with the right dates and titles", () => {
  const want = {
    "News/231": "2025-11-05",
    "News/258": "2026-01-06",
    "ag-sunday-announces": "2025-10-24",
    "hudson-resident": "2025-10-20",
    "non-us-citizen-arrested": "2025-07-22",
    "fdle-arrests-non-citizen": "2025-01-24",
    "ag-nessel-announces": "2026-08-13",
    "announces-arrests-charges-against-20": "2026-09-24",
    "starr-county": "2025-09-17",
    "six-indictments": "2025-05-07",
    "nine-individuals": "2025-07-14",
  };
  for (const [part, date] of Object.entries(want)) {
    const p = page(part);
    assert.ok(p.src, part);
    assert.equal(isElectionCase(p.title, p.text), true, part);
    assert.equal(releaseDate(p.html, p.text), date, part);
    assert.ok(p.title.length >= 15 && !/\|/.test(p.title), `${part}: ${p.title}`);
  }
  assert.equal(page("fdle-arrests").title, "FDLE arrests non-citizen for voter fraud");
});

test("state sources: non-election and petition-only releases are not cases", () => {
  assert.equal(isElectionCase("AG announces charges in Medicaid fraud scheme", "TOPEKA – A Wichita man was charged with Medicaid fraud."), false);
  assert.equal(isElectionCase("Secretary of State reminds voters of registration deadline", "Residents should register to vote by October 5."), false);
  assert.equal(isElectionCase("AG reviews ballot petition", "The attorney general approved the ballot petition summary for circulation."), false);
});

test("state sources: named defendants only, never the officials, with the release's own places", () => {
  assert.deepEqual(names("News/231"), ["Jose Ceballos"]);
  assert.deepEqual(names("News/258"), ["Jose Luis Gomez Sr."]);
  assert.deepEqual(names("ag-sunday-announces"), ["Guillermo Sainz", "Amos Clay", "Joseph Jameson", "Anya McCurdy", "Meghan McDevitt", "Richard Perez", "Samantha Szukiewicz"]);
  assert.deepEqual(names("hudson-resident"), ["Grace Gato"]);
  assert.deepEqual(names("non-us-citizen-arrested"), ["Naseef Bryan"]);
  assert.deepEqual(names("massachusetts-residents"), ["Joshua Urovitch", "Lisa Urovitch"]);
  assert.deepEqual(names("fdle-arrests"), ["James Ross Wightman"]);
  assert.deepEqual(names("ag-nessel-announces"), ["Michael Akioya", "Kimberley DiDonato", "Alondra Harker", "Harumi Michael", "Robert Piva"]);
  assert.deepEqual(names("starr-county"), ["Modesta Vela"]);
  assert.deepEqual(names("six-indictments"), ["Rochelle Camacho", "Carlos Segura", "Ramiro Trevino", "Racheal Garza", "Adriann Ramirez", "Rosa Rodriguez"]);
  assert.equal(names("nine-individuals").length, 9);
  const fl = stateDefendants(page("announces-arrests-charges-against-20"));
  assert.ok(fl.length >= 12);
  assert.deepEqual(fl[0], { ...fl[0], name: "Astrid Shamatu Navarrete Quintana", age: "24", place: "Fort Myers" });
  for (const part of Object.keys(PAGES)) for (const n of stateDefendants(page(part.split("/").pop() || part)).map((p) => p.name)) assert.doesNotMatch(n, OFFICIALS, n);
});

test("state sources: stage and dateline come from the release", () => {
  assert.equal(stateStage(page("News/231").title, page("News/231").text), "Charged");
  assert.equal(stateStage(page("massachusetts-residents").title, page("massachusetts-residents").text), "Sentenced");
  assert.equal(stateStage(page("non-us-citizen-arrested").title, page("non-us-citizen-arrested").text), "Arrested");
  assert.equal(stateStage(page("six-indictments").title, page("six-indictments").text), "Charged");
  assert.equal(datelineCity(page("News/231").blocks), "Topeka");
  assert.equal(datelineCity(page("hudson-resident").blocks), "Concord");
  assert.equal(datelineCity(page("fdle-arrests").blocks), "Miami");
});

test("state sources: pins - printed town, then the person's county, then the case county (beats the dateline), then dateline, then state", () => {
  const T = JSON.parse(readFileSync(new URL("./city-geo.json", import.meta.url), "utf8"));
  const geo = (part, name) => {
    const p = page(part);
    return stateGeo(stateDefendants(p).find((d) => d.name === name), p, T);
  };
  // Frio County cases (TX AG, dateline HOUSTON) -> Pearsall, the county seat; office towns from the release kept.
  assert.deepEqual([geo("nine-individuals", "Manuel Medina").city, geo("nine-individuals", "Manuel Medina").basis], ["Pearsall, TX", "county"]);
  assert.equal(geo("nine-individuals", "MaryAnn Obregon").city, "Dilley, TX");
  assert.equal(geo("six-indictments", "Rochelle Camacho").city, "Pearsall, TX");
  assert.equal(geo("six-indictments", "Ramiro Trevino").city, "Pearsall, TX");
  // Starr County (no dateline) -> Rio Grande City; Comanche County charges -> Coldwater, not the Topeka dateline.
  assert.equal(geo("starr-county", "Modesta Vela").city, "Rio Grande City, TX");
  assert.equal(geo("News/231", "Jose Ceballos").city, "Coldwater, KS");
  // A county mentioned outside the case sentences ("assistance to Monroe County officials") does not count.
  assert.deepEqual([geo("ag-sunday-announces", "Amos Clay").city, geo("ag-sunday-announces", "Amos Clay").basis], ["Harrisburg, PA", "dateline"]);
  assert.equal(geo("ag-nessel-announces", "Kimberley DiDonato").city, "Rose Township, MI");
  // A printed town the table lacks falls back to the person's county, else the state capital - never dropped.
  const rel = { state: "FL", blocks: ["TALLAHASSEE – The defendants include:", "Jane Q. Roe, 40, of Nowhereville (Lee County), was charged."] };
  assert.deepEqual(stateGeo({ name: "Jane Q. Roe", place: "Nowhereville", sentence: rel.blocks[1] }, rel, T)?.city, "Fort Myers, FL");
  const bare = { state: "FL", blocks: ["TALLAHASSEE – John Doe was charged."] };
  assert.equal(stateGeo({ name: "John Doe", place: "Nowhereville", sentence: bare.blocks[0] }, bare, T)?.basis, "state");
  assert.equal(stateGeo({ name: "John Doe", place: "Nowhereville", sentence: bare.blocks[0] }, bare, T)?.city, "Tallahassee, FL");
  assert.deepEqual(countiesIn("Former Frio County Elections Administrator and Frio County Judge"), [["Frio", 2]]);
});

test("state sources: fail soft (a dead source or page is logged, never thrown) and honor the time budget", async () => {
  const fl = STATE_SOURCES.find((s) => s.office === "FloridaAG");
  const ks = STATE_SOURCES.find((s) => s.office === "KansasAG");
  const url = "https://www.myfloridalegal.com/newsrelease/attorney-general-james-uthmeier-announces-arrests-charges-against-20-defendants";
  const rss = `<rss><item><title>Arrests, Charges Against 20 Defendants in Statewide Election Integrity Operation</title><link>${url}</link><pubDate>Thu, 24 Sep 2026 15:00:00 GMT</pubDate></item></rss>`;
  const fetchText = async (u) => {
    if (u === fl.url) return rss;
    if (u === url) return PAGES[Object.keys(PAGES).find((k) => k.includes("announces-arrests-charges-against-20"))];
    throw new Error(`403 ${u}`);
  };
  const { releases, log } = await readStateSources(fetchText, { sources: [ks, fl], since: "2025-01-21" });
  assert.equal(releases.length, 1);
  assert.equal(releases[0].office, "FloridaAG");
  assert.equal(releases[0].date, "2026-09-24");
  assert.ok(log.some((l) => /^KansasAG: list 403/.test(l)));
  const none = await readStateSources(fetchText, { sources: [fl], budgetMs: -1 });
  assert.equal(none.releases.length, 0);
  assert.ok(none.log.some((l) => /time budget/.test(l)));
  const old = await readStateSources(fetchText, { sources: [fl], since: "2026-10-01" });
  assert.equal(old.releases.length, 0);
});

/* ---------- Fraud Ledger wiring (harvest-gov.mjs) ---------- */
import { stateVotingItem, ingest } from "./harvest-gov.mjs";

const relOf = (part) => {
  const p = page(part);
  return { office: p.src.office, state: p.src.state, url: p.url, date: releaseDate(p.html, p.text), title: p.title, blocks: p.blocks, text: p.text };
};

test("ledger state voting: one release -> one scheme, state agency, release stage, voting origin, release town", () => {
  const item = stateVotingItem(relOf("News/258"), [], new Set());
  assert.deepEqual(item.names, ["Jose Luis Gomez Sr."]);
  assert.equal(item.nameIn["Jose Luis Gomez Sr."], "Jose Luis Gomez, Sr.");
  const existing = [];
  const added = [];
  ingest(existing, new Set(), added, item, "KansasAG");
  assert.deepEqual(added, ["Jose Luis Gomez Sr."]);
  const r = existing[0];
  assert.equal(r.city, "Hutchinson, KS");
  assert.equal(r.voting, true);
  assert.equal(r.origin, "Voting / elections");
  assert.equal(r.stage, "Charged");
  assert.equal(r.confirmedBy, "Kansas Attorney General");
  assert.equal(r.photo, "");
  assert.match(r.text, /official Kansas Attorney General press/);

  const multi = [];
  ingest(multi, new Set(), [], stateVotingItem(relOf("announces-arrests-charges-against-20"), [], new Set()), "FloridaAG");
  assert.ok(multi.length >= 12);
  assert.equal(new Set(multi.map((x) => x.schemeId)).size, 1);
  assert.equal(multi.find((x) => x.name === "Astrid Shamatu Navarrete Quintana").city, "Fort Myers, FL");
  assert.match(multi.find((x) => x.name === "Astrid Shamatu Navarrete Quintana").nationality || "", /Mexican national/);
  for (const x of multi) assert.equal(x.entered, "Amount not stated");
});

test("ledger state voting: seeded releases and listed voters are skipped; county pins", () => {
  const rel = relOf("News/231");
  assert.equal(stateVotingItem(rel, [], new Set(["ag.ks.gov/home/components/news/news/231"])), null);
  assert.equal(stateVotingItem(rel, [{ name: "Jose Ceballos", voting: true }], new Set()), null);
  const mi = stateVotingItem(relOf("ag-nessel-announces"), [], new Set());
  assert.equal(mi.places["Michael Akioya"].city, "Oak Park, MI");
  assert.equal(mi.places["Kimberley DiDonato"].city, "Rose Township, MI");
  // Starr County: no town and no dateline -> the county seat, not dropped.
  assert.equal(stateVotingItem(relOf("starr-county"), [], new Set()).places["Modesta Vela"].city, "Rio Grande City, TX");
});

import { districtSeatFromText } from "./harvest-gov.mjs";
test("ledger: HI, WDKY, WDTX, ID, UT and WDLA releases map to their office seats", () => {
  const want = { "District of Hawaii": "Honolulu, HI", "Western District of Kentucky": ", KY", "Western District of Texas": ", TX", "District of Idaho": ", ID", "District of Utah": ", UT", "Western District of Louisiana": ", LA" };
  for (const [d, city] of Object.entries(want)) assert.ok(districtSeatFromText(`U.S. Attorney's Office for the ${d}`)?.city.includes(city), d);
});

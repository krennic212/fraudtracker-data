## 2026-11-06 (evening) daily missed-cases check

- Seeded Karin L. Contreras (usao-dc Nov 6, Sentenced, COVID unemployment UI >$1M; already on Invasion Update).
- Seeded Thonton Snapp + Jacob Michael Testerman (usao-wdva Nov 6, Pleaded guilty, CARES pandemic unemployment; one scheme).
- Seeded David Darling (usao-ndny Nov 6, Charged, SSA theft ~$109k via deceased-beneficiary ATM card).
- Seeded Dennis March + Greg March (usao-md Nov 6, Sentenced, tax evasion; Berlin MD).
- Skipped: Pawse/Tora Kheil (already on FL+IU), Tara Taylor Williams (private payroll), Antonio Petrosino (private investment), Katrenia Harris (private insurance), gold-bar Singh ring (private, no non-citizen), HMR company-only FCA, SDCA 93 border aggregate, Lab Genomics LLC already on FL (Leena Dalal not seeded).
- Village Capital / Higgs still out. No filter/parser code changes.

## 2026-11-06 (late morning) miss-reduction rule pack (Krennic t123u: "Fix everything in the rules so less are missed in the future")

- Checked first: live feed 660 rows, data/harvest.json intact. After: 661 (+Destinee Ruffin, +Ivan Alonso Rodriguez, -"Piron Lara" short-name duplicate).
- scripts/harvest-gov.mjs:
  - KEEP: Economic Impact Payment / EIP / stimulus checks / recovery rebate; stolen government/public/federal benefits or money;
    receipt/retention of stolen public money; FERS / civil service retirement / SSI; Social Security / retirement / annuity
    benefits paid after a death; PPP loans; Medicaid fraud/program/billing; False Claims Act settlement/allegations; "resolve
    ... false claims / fraud / kickback / overbilling".
  - originFor: stimulus / stolen-benefit cases file as "Federal program (see release)" (Ruffin was "nursing credentials" from a driver's license).
  - Charged -> Convicted from a later release (laterStageUpdate): same full name + same state, existing row earlier and from
    another release, forward only (Charged < Pleaded guilty < Convicted < Sentenced). Stage from the seed, or the title for a
    single-defendant release. Row keeps id/schemeId/sourceUrl; gets stage, stageSourceUrl and the later release's naming
    sentence verbatim. Listed in harvest-status.json laterStages. 0 hits in the current 400-release window.
  - DOJ_PAGES 6 -> 10 (400 releases per hourly run) for late-posted releases.
  - No-pin voting cross-post (Krennic via Rex, Nov 6, and covered by t123u): Invasion Update voting rows with no place now
    cross-post with city "Not stated", lat/lon null. similarVoterListed() skips the same voter printed another way
    ("Monica Carzoli Carrillo" = "Monica Ivette Carzoli Carillo"; "Alejandro Villegas Garcia" = "Alejandro Garcia Villegas").
    19 such rows arrive on the next hourly run. THE SITE STILL HIDES THEM: fraudtracker.grok.me coerceHarvest drops rows with
    city "Not stated" and lat == null. Grok Build must change that filter (list them, no map marker) and Krennic must publish.
- scripts/harvest-parse.mjs: dropShortForms() (a short form of a name printed in full in the same release is not a second
  person, unless the release introduces it with its own age); settlementEntity() ("<Company> Agrees to Pay $X to Resolve False
  Claims Act ..." names the company; fraud-type settlements only, so Lockheed's employment settlement stays out).
- Seeds: Destinee Ruffin (SDIN Nov 4, Sentenced, stolen EIP checks; co-conspirators and a parser junk name "Sentence
  Restitution Tony McMullen" not listed), Ivan Alonso Rodriguez (SDCA Nov 3, Pleaded guilty, El Cajon, stolen SSA/OPM benefits).
- Dry run (old vs new; live feed + seeds + 400 DOJ API releases Oct 22 - Nov 6 + Invasion Update feed): new code adds Ruffin
  (seeded), Rodriguez (seeded) and the 19 no-pin voting rows; 0 existing rows changed; 0 removed except "Piron Lara" (old code
  would re-add it). Village Capital / Higgs still excluded.
- Tests: scripts/harvest-rules-1106.test.mjs (9) in npm test and the workflow Tests step. Full suite 192/192.

## 2026-11-05 (evening) daily missed-cases check

- Seeded Reuben Taylor (usao-ma Nov 4, Pleaded guilty, PPP $20,804). Row in harvest.json. Village Capital / Higgs still out.
- Skipped Destinee Ruffin (SDIN EIP/mail-theft): keepBlob false (Economic Impact Payment not in KEEP); needs Krennic yes before a KEEP add.
- Skipped Paul Paredes (private lending wire fraud, no non-citizen stated).

# HANDOFF: fraudtracker-data

## 2026-11-03 (afternoon) stage-for-another-crime rule (Krennic 12:29 PM CT)

- Krennic: "If he wasn't convicted for voting but he was convicted for something else, don't list him as voting."
- Invasion Update now untags such rows (scripts/stage-crime.mjs there), so the cross-post never copies them. Julio De La Rosa
  (strangulation) and Gerardo Nieves-Borja (DUI) stay off the ledger (not fraud; they also have no pin). No-pin rule unchanged.
- Ledger rows no longer filed as voting (kept, in scope as fraud): Juan Arturo Martinez (MDFL, sentenced for passport fraud; the
  vote was described conduct) and the four MA PPP/EIDL wire-fraud defendants (Jonathan Arroyo, Daquan Dooley, Demetrous Thomas,
  Gianni Williams Johnson; voting:true was a mis-tag, the release has no voting wording).
- Tests: scripts/harvest-stage-crime.test.mjs (2), in package.json and the workflow list. Full suite 182/182.

## 2026-11-03 (late morning) Krennic-approved fixes (10:01 AM CT approval)

- Place names are never people (scripts/harvest-parse.mjs isPlaceName: whole name is a state, a city-geo.json city, a country, or ends in County/Parish/Valley...).
  Filtered in rowsFromItem and in main() kept rows. Dropped "South Africa" (WDMO Venter release) and "Washoe County" (D. Nev.). Venter and Ramadhani stay.
  The IRS-CI row named "Los Angeles" was renamed to its real defendant, Lamont McCarthy (same id, schemeId, verbatim text), instead of being lost.
- "a/an <State> man|woman" (or a title "<State> Man|Woman") for a single defendant beats the court seat (residentStateGeo, after a seed pin; an in-state city is kept;
  "killer of a Maryland man" style victims ignored). Pin "<State>, XX" at the state's first district seat.
  Existing rows moved (12): Forrest Scott Woody -> North Carolina; Kareem Highsmith, Irvin Vilneus -> North Carolina; Madisyn Pettaway -> New Jersey;
  Sharmaine Meadows -> Minnesota; Jingming Chen -> Massachusetts; Patrick Britton-Harr, Robert Glenn Johnson, Camille Aba -> Maryland; Melvin Emde -> Oklahoma;
  Carl Lawrence -> Michigan; Daniel Keith McDougal -> Florida.
- Invasion Update now shows voting rows with no place. FT still skips rows with no pin (rowsFromItem `if (!geo) continue`), so only Sheikhnoor Adbo (Minnesota) cross-posts. Not changed; needs approval.
- Tests: scripts/harvest-fixes-1103b.test.mjs (5), added to package.json and the workflow list. Full suite 180/180. Damon Matai Seei stays.

## 2026-11-03 (mid-morning) voter-fraud gap check (Krennic asked: "Are any examples missing?")

- Checked first: data/harvest.json intact (610 rows). After: 622 rows. No rule, filter or parser changes.
- Searched DOJ API (title terms vot/Election/Ballot/Citizenship/Registration + a full-body scan of every release since Jan 21, 2025), ice.gov voter releases.
- Seeded 9 releases, 12 rows, all Charged, voting: true:
  - Non-citizen: Gregory Allan Porter (EDTN, Sevierville TN), Christiane Vinette Young (MDFL, Fort Myers), George Olawunmi Johnson (D. Kan., Olathe),
    Darwin Jonathan Rivera Flores (CDCA, Winnetka), Haoxiang Gao (EDMI, Ann Arbor; release says he fled to China), Svitlana and Yelyzaveta Demydenko (SDFL, Palm Beach).
  - Election fraud, status not the point (anyVoter): Jeffrey Pope (WDPA double vote, Apollo PA), James Brass / Courtney Price / Jateisha Herron
    (CDCA ballot-petition signatures with stolen voter identities), Damon Matai Seei (D. Utah postal worker, ~300 mail-in ballots thrown away).
- Randy Pierre-Louis (ICE NY, voter registration false statements) goes to Invasion Update via pending.json; the cross-post should add him here.
- Data issues left for Krennic (not changed): junk-name voting rows "South Africa" (WDMO Hanlie Venter) and "Washoe County" (D. Nev. Mlebinge Riziki Ramadhani) duplicate real rows;
  Forrest Scott Woody pinned Birmingham, AL (court) though the release calls him a North Carolina man.

## 2026-11-03 (morning) filter + name-parser fixes (Krennic approved the Nov 2 missed-cases rule fixes)

- Checked first: data/harvest.json intact (608 rows). No new "Fargo Levy" commit.
- scripts/harvest-gov.mjs:
  - titleNationalsCoverAll(title, text): a plural "<Demonym> Nationals" title covers EVERY named defendant (ingest, private-victim
    releases) only when title + body have no U.S.-citizen / American citizen / citizen of the United States / national of the
    United States / U.S.-born / naturalized / dual wording ("Five Cuban nationals and one U.S. citizen" fails). Singular titles:
    unchanged (single row only).
  - sectionGeo(): in a release with 2+ district headers, the defendant's own "<X> District of <State>" section wins over a place
    word from an earlier section (OPA "63 Individuals": Atlanta no longer pins the SDTX / NDNY / EDPA people).
  - ofPlaceNearName() + dojItem: a teaser that names the defendant but no place, on a link with no district seat and no district in
    the text, reads the body's "<Name>, 45, of Glendale, California" (Mailyan). A named district still wins.
- scripts/harvest-parse.mjs: a "<Demonym> national" lead-in is stripped from names (Toleafoa, Ramadhani, Gudino, Van Der Staak);
  "St." joins name tokens (Garfield St. Vincent Bruce); ALL-CAPS names with Unicode letters and "pled guilty" (GÖKÇE GÜVEN, not
  "Kalder Inc."); one-word names only in a clearly structured list (3+ "<Demonym> national <Name>, <age>," entries, a status and a
  charge verb, and the next sentence starts with the same word: Widarto).
- Test: scripts/harvest-rules-1103.test.mjs (fixtures opa-2026-11-02-63-individuals-election, opa-2026-10-30-mailyan-botox,
  sdny-2026-10-30-kalder-guven, mdpa-2026-10-30-chinese-nationals-elderly-scam), in npm test and the workflow Tests step. 175/175.
- Dry run (old vs new, every seed + last 400 DOJ API releases Oct 15 - Nov 3, and a full local harvest run): 0 rows added,
  changed or removed by the new code. Both old and new code would add Kareem Highsmith (WDNY) and Marvin Charo Collins (EDCA) on the
  next hourly run; not caused by this change. The seeded Jiang / Yang / Bao, Widarto, Mailyan and GUVEN rows map to the same ids.
- Existing pins corrected to the person's own district section (city/lat/lon only): Ali Khan, Jose Vasquez-Mendoza -> Houston, TX;
  Pooja Pawse, Mobin Tora Kheil -> Albany, NY; Rosanny Fabre Villa, Gavin Moir, Antonio Lyttle, Eija Annikki Yaroma ->
  Philadelphia, PA (OPA Nov 2 "63"); Eliza M. Moss -> Columbus, OH (OPA "16", Southern District of Ohio); Jullie Ann Sumalinog
  Moore -> Las Vegas, NV (OPA "48", District of Nevada). Rows 608 -> 608.
- Not changed: "Mexico Robert Glenn Johnson" is still a junk name the parser makes from the OPA 63 text ("... from Mexico Robert
  Glenn Johnson"); the release is seeded so it never becomes a row. Village Capital and Higgs exclusions unchanged.

## 2026-11-02 (evening) daily missed-cases check (Oct 30 - Nov 2), standing order "just add"

- Seeds added to data/seed-releases.json (DOJ press-release API text, verbatim; no photos):
  - Widarto (OPA Nov 2 "63 Individuals", E.D. Pa., Charged, voting, "Indonesian national"). The parser does not take single-word names.
  - Violetta Mailyan (OPA Oct 30 Botox / Medicare, Glendale, CA, Sentenced, usdAlleged 45,000,000 = "bill Medicare more than $45 million"). keepBlob passes but the parser found no name ("California doctor Violetta Mailyan was sentenced").
  - GOKCE GUVEN (SDNY Oct 30 Kalder, Sentenced, "a citizen of Turkey", restitution $6,717,997). The parser named "Kalder Inc." instead of the ALL-CAPS name with Turkish letters.
  - Yankun Jiang, Hanlin Yang, Lei Bao (MDPA Oct 30 elderly pop-up scam, Sentenced, one scheme). Seed kept, rows built by rowsFromItem and added by hand: ingest() drops them because titleNationalStated() only counts for a single-row release and the body has no per-person status.
- Name / pin fixes on OPA 63 rows: "Samoan national Valelia Toleafoa" -> Valelia Toleafoa (pin Madison, WI -> Salt Lake City, UT), "national Mlebinge Riziki Ramadhani" -> Mlebinge Riziki Ramadhani (Madison, WI -> Las Vegas, NV), "Mexican national Juan Manuel Gudino" -> Juan Manuel Gudino (Sacramento, CA -> Little Rock, AR), "Vincent Bruce" (MDTN) -> Garfield St. Vincent Bruce. Parser gaps: a "<Demonym> national <Name>" lead-in after a section header is kept in the name; "St." in a name cuts it; districtNearName picks a neighbouring section's district in the OPA roundup.
- Village Capital and Higgs still absent. npm test 167/167.

## 2026-10-31 (1:05 PM CDT) three filter fixes (Krennic approved 12:52 PM CDT)

- Checked first: data/harvest.json was intact (567 rows). No new "Fargo Levy" commit.
- Commit 403607e, scripts/harvest-gov.mjs:
  1. KEEP: `federal student (?:financial )?aid|\bfafsa\b|\bfsa (?:program )?funds|student[- ]aid fraud|\bpell grants?\b`.
  2. titleNationalStated(title) (new, exported). A capital-N "<Demonym> National(s)" in the TITLE states the status
     ("Jamaican National Extradited ..."). The word must be demonym-shaped (-an/-ian/-ese/-ish/-i/-ic/-ch/-ss, or Greek /
     Thai / Lao / Filipino / Kyrgyz). It is not American or Native, and is not followed by Guard / Bank / Park / Security /
     Center ...; titles with U.S.-citizen, naturalized or dual wording fail. Used in privateVictimNonCitizen(), and in
     ingest() only when the release gives a single row (a two-defendant title cannot say which one is the national).
  3. PRIVATE_FRAUD: `\bbank theft\b|\bjackpott(?:ing|ed|ers?)\b` (still needs stated non-citizen status; DROP and the
     smuggling / drug exclusions still apply).
- Test: scripts/harvest-rules-1031.test.mjs (fixtures opa-2026-10-29-ghostbusters, mdpa-2026-10-30-campbell-jamaican-
  national, edmo-2026-10-29-atm-jackpotter), in npm test and the workflow Tests step. npm test 167/167.
- Dry run (old vs new harvest-gov.mjs, every seed + the last 400 DOJ API releases, Oct 22-31, against the live 567 rows):
  0 rows added, 0 changed, 0 removed. Only one release-level decision flips: EDMO "ATM Jackpotter from Venezuela" (now
  passes privateVictimNonCitizen; its row already exists). The NJ Ghostbusters, Campbell and Nieves-Carrillo seeds now
  pass ingest. Each one maps onto the row added by hand earlier (same id), so nothing doubles.
- Village Capital and Higgs exclusions unchanged (harvest-exclude tests pass; neither is in the feed). Workflow run
  41227112168 OK; Pages feed 567 rows.

## 2026-10-31 (12:55 PM CDT) missed-cases check: Ghostbusters, Campbell, Nieves-Carrillo; Cuban ring stage; harvest.json restored (Krennic approved)

- RESTORED data/harvest.json: commits f19532e / e0953c9 / 19d8b17 (author "Fargo Levy", Oct 31 12:17-12:18 PM CDT, messages
  claim "add Ghostbusters + Mailyan Botox") replaced the file with the text "restore from previous" (0 rows). The live feed
  was still fine (last deploy 12:13 PM CDT). Restored byte-for-byte from 1d606c3 (561 rows) in 020396f. No Mailyan row added.
- Added (020396f; DOJ press-release API read, wording verbatim, no photos, no nationality invented):
  - OPA Oct 29 "Justice Department Unveils Indictments in Nationwide 'Ghost Student' Fraud Scam Linked to Kenyan Network",
    two seeds on the same link, one per scheme (schemeKey): Francis Mogambi (D. Neb., Charged, nationality "a Kenyan
    citizen", usdAlleged 20000 = "$20,000 intended loss", seat usao-ne -> Omaha); Mabed Patricia Utate-Alberto, Patricia
    Arisleydi Perez, George Arturo Alfau Mendez (D.N.J. complaint, Charged, no nationality stated, usdAlleged 1500000 =
    "$1.5 million intended loss", seat usao-nj -> Newark).
  - usao-mdpa Oct 30 "Jamaican National Extradited ...": Ashanie M. Campbell, Charged, nationality "Jamaican National" (title).
    Co-defendant Jeremie L. Cotton (of Las Vegas) not listed.
  - usao-edmo Oct 29 "ATM Jackpotter from Venezuela Pleads Guilty in St. Louis": Aaron Nieves-Carrillo, Pleaded guilty,
    nationality "illegal alien from Venezuela".
  - Seeds for all of them are in data/seed-releases.json. Only the Mogambi seed passes ingest() today. The NJ, Campbell
    and Nieves-Carrillo seeds are dropped by the scope filter (see GAPS), so their 5 rows were built with the seed path's
    own rowsFromItem() and appended to data/harvest.json. main() keeps existing named rows (isKeepRow), so they stay.
  - MDFL Oct 29 Cuban smuggling / asylum fraud ring: all 6 were already rows (hourly DOJ pass, no stage). A seed on the MDFL
    link fills stage "Sentenced" on those 6 rows. No new row. Note: the release says "Five Cuban nationals and one U.S.
    citizen" without naming the citizen. Government-program (asylum) fraud qualifies either way.
- Not added: Osmal Sanchez Loy (ICE Oct 2026 release). He already looks like row "Osmal Loy" (usao-mdpa Oct 23: 70, Fountain
  Hill, "a citizen of Cuba and lawful permanent U.S. resident", charged Oct 23; ICE: arrested Oct 23 by HSI Allentown,
  "never adjusted ... to become a lawful permanent resident"). Same name core, date and area. The two releases disagree on
  LPR status. Not added again; no aka added.
- GAPS (filter rules NOT changed; proposals for Krennic):
  1. KEEP has no student-aid term. Ghostbusters only passes through "Theft of Government Money" in the Mogambi paragraph.
     Proposed: add `federal student (?:financial )?aid|\bFAFSA\b|\bFSA (?:program )?funds|student[- ]aid fraud|Pell grants?`.
  2. NONCITIZEN_CS needs a lowercase "national", so the title "Jamaican National Extradited" fails. Proposed: also match a
     title-case `\b\p{Lu}\p{Ll}+ National(?:s)?\b` in the title only.
  3. PRIVATE_FRAUD has no theft wording, so "bank theft" / ATM "jackpotting" fails. Proposed: add `bank theft|jackpott`.
- Tests: npm test 161/161 (no rule changed, so no new test). Rows 561 -> 567, schemes 313. Workflow run 41226293557 OK;
  Pages feed 567 rows.


## 2026-10-29 (9:35 PM CDT) ANNETTE JOHNSON (NDIL Oct 29, Charged) via seed; KEEP + "Covid-era federal grant funds" (Krennic asked 6:10 PM + 9:26 PM CT)

- Source: usao-ndil Oct 29, 2026 "Federal Indictment Charges Former President of Suburban Chicago School District Board of
  Education With Engaging in $1.3 Million Honest Services Fraud Scheme" (DOJ API uuid 4bd8ee14-...). Seed: names
  ["ANNETTE JOHNSON"] (as printed), stage Charged, place Aurora, IL ("Johnson, 63, of Aurora, Ill."), usdAlleged 1300000,
  teaser = release text through the Sentencing Guidelines sentence (attachment name dropped). No nationality, no photo.
- Why it needed a rule: keepBlob() rejected it (no program term; "Covid-era" is not "covid-19"). KEEP gains only
  "covid[- ]era federal (grant|relief) funds" (the release: "District 131 paid for the air purifiers using Covid-era federal
  grant funds"). Old vs new keepBlob on the last 250 DOJ API releases: only this release differs. No guard changed.
- Row harvest-https-www-justice-gov-usao-ndil-pr-federal-indic-bd67eb9c75, own schemeId (...-6e6603021c, 1 row). 521 -> 522.
- Test: scripts/harvest-ndil-johnson.test.mjs (fixture ndil-2026-10-29-annette-johnson.json). npm test 161/161.
- Not added (B, ICE @ICEgov 2115946443202543963 -> Daily Caller only): no official page lists the 17; the ones named on
  official pages are already here (Sanon, Edzie, Dewey, Lise Marie Johnson) or excluded by Krennic (Higgs, Oct 26).

## 2026-10-29 (3:00 PM CDT) OPA NC "Charges 18 More ... Illegally Voting": Carter via seed + parser fix; stage/nationality filled (Krennic approved 2:43 PM CT)

- Source: OPA Oct 29, 2026 "Justice Department Charges 18 More in North Carolina with Illegally Voting in 2024 Election"
  https://www.justice.gov/opa/pr/justice-department-charges-18-more-north-carolina-illegally-voting-2024-election (DOJ
  press-release API; @TheJusticeDept X post 2115854639950119267). Copies: usao-ednc, usao-wdnc (same names; deduped).
- Before: 17 of 18 on the ledger (12:11 PM CT run: 13 from the OPA body, EDNC 9 + WDNC 4; 4 MDNC via the Invasion Update
  cross-post). Missing: Phillip Alexander Carter (MDNC). 13 rows had no stage; most had no nationality.
- Why missed: the MDNC paragraphs have no age ("Phillip Alexander Carter, a native of Barbados and a lawful permanent
  resident of the United States living in Winston-Salem, ..."), so no allPeople pattern matched; the other MDNC four came only
  via the cross-post, and Carter was not on Invasion Update either.
- Fix (scripts/harvest-parse.mjs): PERSON_NATIVE_STATUS "<Name>, a/an native of | citizen of | national of | <X> national ...
  and (a) lawful|legal permanent resident" (same sentence). Quoted officials (McCotter, Boyle, Bishop, Ferguson, Davis, Zito)
  never match; onlyQuotedSpeaker unchanged. Old vs new on the last 400 DOJ API releases + voting title searches: only the 3
  NC copies differ (now 18 names each). Ingesting all 3 copies against the new feed adds nobody (alreadyListedVoter).
- data/seed-releases.json: new voting seed for the OPA link (teaser = the release body, verbatim), 18 names, stage Charged,
  voting true, nationality = the release's words per person (e.g. "a native of Italy, citizen of the United Kingdom, and
  lawful permanent resident of the United States"); places: Carter "Winston-Salem, NC" (the release: "living in
  Winston-Salem, North Carolina"; same as his 4 MDNC co-defendants' rows). Rows written with harvestSeed (hourly path).
- ingest (scripts/harvest-gov.mjs): like stage, a seed's own nationality wording is filled on an existing row of the same
  release only when that row has none; never replaced (Agah keeps "a Nigerian national").
- Result: Carter added (Charged, voting, origin "Voting / elections", no photo). Stage Charged filled on 13 rows (never
  upgraded; the 4 MDNC rows already said Charged). Nationality filled on 14 rows. Rows 507 -> 508.
- Tests: scripts/harvest-nc-roundup.test.mjs (real text in scripts/fixtures/opa-2026-10-29-nc-18-illegal-voting.json; also
  wdnc copy fixture), added to npm test and the workflow Tests step. npm test 159/159.

## 2026-10-28 (11:35 PM CDT) Eduardo Gallardo Maldonado: Charged -> Pleaded guilty (Krennic approved 11:27 PM CDT)

- Row harvest-https-www-justice-gov-usao-edpa-pr-four-aliens-c-60d1d58f3e (Sep 24 "Four Aliens Charged With Election Fraud")
  kept: same id, schemeId (...-d646e1e39d), sourceUrl, crime / usa and DOJ excerpt. Changed: stage "Pleaded guilty";
  stageSourceUrl = usao-edpa Oct 28, 2026 "Alien Pleads Guilty to Illegally Voting in 2024 General Election"; text "Stage:
  Charged (not convicted)." -> "Stage: Pleaded guilty." plus the plea release's own sentences, verbatim, as
  'Update ("<title>", Oct 28, 2026): ... entered a plea of guilty today ... The defendant is scheduled to be sentenced on
  February 9 ...' (plea date = "today" in the Oct 28, 2026 release; sentencing "February 9", no year printed). No other row.
- Sticks across harvests: NEW data/stage-updates.json (one entry: id + name + sourceUrl, stage, source, sentences) applied by
  scripts/harvest-gov.mjs applyStageUpdates() in main() after every ingest; idempotent (text appended once, one "Stage:"
  phrase). The Four Aliens seed's "Charged" only fills a missing stage, so it never reverts this. The plea release itself is
  still not a second row (alreadyListedVoter exact-name any-date rule); that check only blocks new rows, never edits one.
- Tests (scripts/harvest-voting-from-status.test.mjs): one row, stage/source/text; a simulated harvest (all seeds + the plea
  release through dojItem/ingest + applyStageUpdates) leaves the row byte-identical; a row reset to Charged is restored once.
  npm test 153/153. Invasion Update not touched.

## 2026-10-28 (11:00 PM CDT) usao-nv Yousif + Safi (illegal voting) via seed + parser fix; voter any-date dedupe (Krennic approved)

- Source: usao-nv Oct 28, 2026 "Two Aliens From Sudan and Afghanistan Charged for Illegal Voting"
  https://www.justice.gov/usao-nv/pr/two-aliens-sudan-and-afghanistan-charged-illegal-voting (DOJ press-release API).
- data/seed-releases.json: new voting seed (verbatim teaser: dateline lead + both criminal-information sentences + "Yousif and
  Safi are each charged with one count of voting by an alien." ...), names ["Moneir Elzobier Ali Yousif", "Khalida Safi"],
  stage Charged, voting true, nationality = the release's words ("from Sudan and a lawful permanent resident" / "from
  Afghanistan and a lawful permanent resident"). Rows written with harvestSeed (same path as the hourly job): election-fraud
  (origin "Voting / elections"), Charged, one schemeId for the release (...-9ac5164957), pin Las Vegas, NV (district seat; the
  release names only "a federal election in Nevada"), no photo. Rows 486 -> 487 (see the Gallardo item below).
- Why missed: the DOJ API pass read the release (teaser names nobody, so dojItem read the body head) but allPeople had no
  pattern for "<Name>, from <Country> and a lawful permanent resident, voted ..." (no age, no "of", no charge verb by the name).
  Fix (scripts/harvest-parse.mjs): PERSON_FROM_STATUS "<Name>, from <Country> and a/an lawful|legal permanent resident |
  illegal alien | alien | non-citizen". Quoted officials (Chattah, Erin Burke, Delzotto) are not matched; onlyQuotedSpeaker
  unchanged. Old vs new on the last 400 DOJ API releases + 54 "illegal voting" titles: only this release differs.
- Also found: the 01:44Z scheduled run (40802239455) FAILED at Tests ("duplicate voter Eduardo Gallardo Maldonado"). The 22:18Z
  run had added a second voter row for him from the EDPA Oct 28 plea release ("Alien Pleads Guilty to Illegally Voting in 2024
  General Election", id ...-aa7c4752f0), because alreadyListedVoter only looked 14 days back (his charged row is Sep 24). Every
  later ledger run would fail the same way. Removed that duplicate row; his Sep 24 row (Charged, ...-60d1d58f3e) is unchanged.
  Fix (scripts/harvest-gov.mjs alreadyListedVoter): the exact same name already listed as a voter (any date, other release) is
  not added again (suffix / short-form rules keep their 14-day window). NOTE for Krennic: the EDPA release says he pleaded
  guilty on Oct 28 (sentencing Feb 9); his row still says Charged. Change the stage only if Krennic says so.
- Tests: scripts/harvest-voting-from-status.test.mjs (real release text in scripts/fixtures/usao-nv-2026-10-28-two-aliens-
  illegal-voting.json; negatives; a defendant sharing a quoted official's surname; seed + feed rows; any-date voter dedupe),
  added to npm test and the workflow Tests step. npm test 150/150.

## 2026-10-28 (1:15 PM CDT) usao-ndga $100M stolen-identity tax row: Altemus -> Akinade Adedeji Raheem (Krennic approved)

- Row was named "Christopher J. Altemus Jr." (IRS-CI Special Agent in Charge quoted in the release). Now name / scheme =
  "Akinade Adedeji Raheem" as printed; stage "Charged" (+ "Stage: Charged (not convicted)." in text; the release: extradited
  from Benin, arraigned on the indictment, not convicted). DOJ wording (crime / usa / text excerpt) and schemeId
  (...-a96ea5b29f) unchanged; id re-derived for the new name (rowId: ...-d741009c05 -> ...-f1bfd7bfd4). No other row changed.
  Rows 471 -> 471.
- Cause (parser): dojItem read the body head (the API teaser names nobody in a parsed form); allPeople's PERSON_OF
  ("Name, of [A-Z]") matched "... said Special Agent in Charge Christopher J. Altemus Jr., of IRS-CI’s Texas Field Office".
  Fix (scripts/harvest-parse.mjs): onlyQuotedSpeaker(name, text) drops a name only when EVERY place the text prints it is
  right after "said" + title words (no sentence break); used in allPeople and on personOrEntity's teaser hit. No existing
  feed row or seed name trips it.
- Kept from coming back: data/seed-releases.json seed for the release (names ["Akinade Adedeji Raheem"], stage Charged;
  the DOJ pass skips a seeded URL) + data/exclude.json person-scoped Altemus entry (name + source URL, plus the old row id).
- Test: harvest-exclude.test.mjs "quoted official is never the defendant" (real release text). npm test 142/142.

## 2026-10-26 (1:30 PM CDT) Anthony Tyrone Higgs removed (Krennic)

- Krennic removed Higgs on Oct 26 (DHS Oct 23 "HSI and FBI Arrest Ten Aliens for Voter Fraud in North Carolina"). He was
  skipped on Oct 20 (seed pass) but came back through the Invasion Update cross-post (crossPostInvasionVoting /
  geoForInvasionRow) on the Oct 26 9 AM run. Rows 441 -> 440.
- Kept out by data/exclude.json: new person-scoped entry ("match": "person", name + source URL, plus his row id). isExcluded()
  matches it only for that name from that release, so other people from the same DHS release can still be cross-posted.
  Entries without "match" still exclude the whole release. Test: harvest-exclude.test.mjs (person-scoped describe).

## 2026-10-26 (12:45 PM CDT) state-only voting city -> "<State>, XX" (Krennic approved)

- Cause: run 40367712010 failed "every voting row has a state". The 9 AM run cross-posted Anthony Tyrone Higgs from the
  Invasion Update feed (DHS Oct 23 NC release) with city "North Carolina"; geoForInvasionRow passed that city through as is.
- The DHS release names no city for Higgs, so the row is now "North Carolina, NC" (no other field changed; lat/lon unchanged).
- scripts/harvest-gov.mjs: stateOnlyCity() maps a bare full state name (50 states + DC + PR) to "<State>, XX";
  geoForInvasionRow uses it in both branches, so no town is made up. Test: harvest-gaps.test.mjs cross-post describe.
  npm test 133/133.

## 2026-10-23 (8:40 PM CDT) 12 missed government-program rows via seeds (Krennic approved)

- data/seed-releases.json: 10 new seed entries (4 releases), ingested by the hourly job like every seed. No photos, no
  nationality (none stated), stage = the release's own.
  - usao-ndtx $19M FECA scheme: Javaria Jabeen, Allendor Kenyon Brown (Charged; superseding indictment). Same release and
    schemeId as the existing Demitrious Gilmore row the DOJ pass made earlier (same scheme; that row is unchanged).
  - usao-cdca L.A. takedown, government-program cases only, one seed per scheme: Harold Tabaie + Hany Malek ($135M Medicare),
    Geoffrey Jimenez ($9.8M Medicare hospice, Transitions), Richard Keech ($10M Medicare hospice), Armani Raffi ($21M Medicare
    hospice), Hassan Badday ($4.2M) and Robby Ayoub ($1.3M) (separate indictments, Medicare genetic testing), Christina Mareik
    ($269.13M Medi-Cal). All Charged. Skipped: Nathan/David Young, Honey/Cody Phipps (private insurers, $1.6B), Nicholas Moore
    and Thomas Mladinich (private insurance), Dejun Wang (drug samples, no program fraud).
  - usao-mdfl Gail Starks (Charged; VA DIC theft, $397,120 forfeiture = proceeds). usao-me Gregory P. Heimann Jr. (Pleaded
    guilty; false statements to VA; no dollar figure stated).
- New optional seed fields (scripts/harvest-gov.mjs harvestSeed -> buildRow): `schemeKey` -> schemeId =
  schemeIdFor(url) + "-" + slug(schemeKey), so a multi-case release gets one schemeId per scheme (ledger-id's one-URL rule
  still holds); `usdAlleged` -> row.usdAlleged, the scheme's own figure (the site reads it before parsing text, so the L.A.
  title's "$2 Billion" is never used for these rows). Test: harvest-gaps.test.mjs (last describe). npm test 132/132.

## 2026-10-20 (11:50 AM CDT) harvest-meta.json always matches harvest.json (Krennic approved)

- Cause: the hourly job ran scripts/write-meta.mjs only when its own run changed data/harvest.json. Seed / hand edits pushed
  straight to main (today's 198 -> 328) left harvest-meta.json at 198 rows / 9:58 AM CDT, and every later run found "no change".
- Fix: write-meta.mjs stores harvestSha256 and is safe to run any time: same sha256 -> meta untouched; harvest.json changed
  and committed -> updatedAt = that commit's time; changed in the run -> now. The workflow runs it before the tests (re-stamps a
  stale pushed meta) and after the harvest on every run; harvest-meta.json counts as a change for commit + Pages deploy.
  checkout uses fetch-depth 0 so the commit time is real. If you edit data/harvest.json by hand, run
  `node scripts/write-meta.mjs` before committing (npm test fails otherwise).
- Test: scripts/harvest-meta.test.mjs (stamp logic + committed meta matches committed harvest.json), in npm test + workflow.

## 2026-10-20 (11:45 AM CDT) state-row pins: county beats dateline (Krennic approved)

- scripts/state-sources.mjs stateGeo() order: printed town -> county in the person's own entry -> the county the case
  sentences name most (charge / arrest / court sentences only, must be dominant) -> dateline (only if no town printed) ->
  state capital. Nobody is dropped for an unknown town any more. COUNTY_SEATS / STATE_CAPITALS tables added;
  stateDefendants takes the office town from "Pearsall City Council, Name: 1 count" / "Former Dilley Mayor, Name".
- Live rows: 8 Frio County TX rows "Frio County, TX" -> "Pearsall, TX" (county seat); Modesta Vela "Starr County, TX" ->
  "Rio Grande City, TX" (row + seed places). Pearsall / Dilley office-town rows, KS (Coldwater, Hutchinson), MI, NH, FL rows
  unchanged. PA canvassers stay Harrisburg (dateline): the release names no county for the case (only "Berks, Lancaster, and
  York counties" and a side mention of Monroe County). Federal rows labelled "<X> County, ST" from their releases unchanged.
- city-geo.json: + Bartow, FL; Titusville, FL. Tests: harvest-state-sources.test.mjs pin test (Pearsall, Rio Grande City,
  Coldwater, Rose Township, unknown town -> county seat / state capital). npm test 128/128.
- CUTOFF (harvest-gov.mjs line 36, `Date.parse("2025-01-21T00:00:00Z")`, used in ingest() and the state sources): the product
  window "on or after January 21, 2025" from the Fraud Ledger brief (krennic212/fraudtracker GROK-BUILD.md, site header
  "since January 21, 2025"); in the first harvester commit b8d8204 (Oct 8, 2026). Not changed.


## 2026-10-20 (11:30 AM CDT) federal, DHS and state voting cases + state election sources in the hourly job (Krennic approved)

- Rows: 198 -> 328. 125 new voting rows (77 federal: 75 DOJ + 2 DHS; 48 state: TX AG 16, FL AG 12, PA AG 7, MI AG 6,
  NH DOJ 4, KS AG 2, FDLE 1), all through data/seed-releases.json (68 new seed releases; 103 seeds in total). The hourly run
  also added 5 routine non-voting fraud rows (EDPA Treasury checks x4, Travis Vue). Voting rows: 209 unique people.
- Seed fields: `places` {name: {city, lat, lon}} = the town the release prints for that person (takes precedence over
  district pins); `nameIn` {name: printed form} for names the release does not write out ("Joshua and Lisa Urovitch");
  `anyVoter: true` on seeds whose people are not non-citizens (election fraud by anyone counts; the nationality test skips
  them). State-host seeds take the state office (stateOffice(link)); agency / confirmedBy = the state agency, via "<agency> press".
- Seeded every OPA voting roundup (Sept 4, Sept 18, Oct 5, Oct 12, 2026), so the DOJ API pass skips them (seededLinks).
- Parser (harvest-parse.mjs): stripLeadPlace() removes a glued "Photo of / of / <place>" lead-in from roundup names;
  PERSON_OF_PLACE_CHARGED ("Name of X County, State, was charged"); "Katubadi , 20," spacing fixed. harvest-gov.mjs:
  districtNearName() pins a roundup defendant to the nearest preceding "X District of Y" header (not "initial appearance
  in"); alreadyListedVoter also catches a shortened roundup name ("Avila Gomez" = "Fredy Avila Gomez") within 14 days.
- NEW state election sources (scripts/state-sources.mjs, same file as invasionupdate-data/scripts/state-sources.mjs):
  harvestStateVoting() in main(), after harvestStateAg. 20 official newsrooms: FL AG (RSS), FDLE, TX AG, MI AG (newsroom
  search JSON), NH DOJ, NV AG, PA AG, KS AG, GA AG, GA SOS, NC AG, OH AG, OH SOS, AZ AG, AL AG, VA AG, LA AG, MO AG, TN AG,
  IA AG. Rules: https + exact host + release path only; listing item must have an election word; page must be an election
  CRIME (isElectionCase: crime verb needed, petition-only excluded); people only from stateDefendants() (list entries
  "Name, 39, of Town", "charges against / arrest of Name", "<office>, Name: 3 counts", "The charged canvassers are: ...");
  a name printed after an official's title is dropped; pin = the person's printed town, else the dateline only when no town
  is printed, else no row; stage from the release (stateStage); one item per release (one schemeId); seeded releases and
  people already listed as voters are skipped. 6 releases per source, 180 s budget (STATE_BUDGET_MS), STATE_SOURCES=0
  turns it off; every error is logged, never thrown.
  - Not added: WI DOJ and IN AG (JS-only listings, no feed). Live now: GA SOS and OH SOS return 403, NC AG and NH DOJ
    listings return 0 items (bot check / JS) - they fail soft; NH cases are in the seeds.
- HI, WDKY, WDTX, ID, UT and WDLA: DOJ API reads every office; DISTRICT_SEAT has all six (test added).
- Engelstad row: aka ["Julieta Englestad"]. "Mayen" (Adams aka) is in no official source, so not added.
- Skipped: Brass/Price/Herron, Seei, KS Andrews/Johnson (listing URL only), Higgs (Krennic); Pulley, Francisco, Mark White
  (before the 2025-01-21 cutoff); Engelstad, Luma, Jamil Ahmad were already listed.
- Tests: scripts/harvest-roundup-all.test.mjs (roundups: every named defendant), scripts/harvest-state-sources.test.mjs
  (offline: scripts/fixtures/state-releases-2026.json = 12 saved state pages); both in package.json and the workflow.
  npm test: 127/127. scripts/city-geo.json copied from invasionupdate-data for state pins.

## 2026-10-20 (9:46 AM CDT) voting cross-post from Invasion Update (Krennic approved)

- 30 voting rows added through data/seed-releases.json (13 new releases, `"voting": true`). Each person is named in the
  official release for voting / registration fraud; stage is the release's own (Charged / Convicted / Sentenced /
  Arrested), never upgraded; nationality is the release's wording (seed `nationality` map, used only if the excerpt has it).
  - usao-mn (Charged): Bryant, Edmunds, Edzie, Kargbo, Kras, Padovan, Chris Adam Pettiquoi (official spelling), Schenk,
    Weihmann (Ozegovic was already listed; his missing stage was filled "Charged").
  - usao-edpa: Hacina Saadi, Paulo Silva. usao-sdal: Staciann Pollion Davis, Silvia Delgado Phelps. usao-wdmo: Andre’s Garcia.
    usao-mdfl: Andrea Catanese. usao-ndtx: Adams, Akpom (charged with false statements in naturalization about his 2017
    registration / 2018 vote), Salas Barrios, Bhengura, Katubadi (20), Thrasher. usao-ma: Okafor. usao-ndga: Lewis,
    Covarrubias, Eccles. usao-nj: Coulibaly. usao-ednc: Denis Joseph Bouchard (Convicted).
  - ice.gov: Carlos Felipe Jaramillo Grajales (Sentenced, MDFL). dhs.gov: Helda Araceli Mendez-Merida ("Arrested (ICE
    immigration arrest; no voting charge stated)"), Ludwig Uriel Espejo-Carrillo ("Arrested (administratively charged by ICE;
    no criminal charge stated)").
- Code: harvestSeed passes `voting` / `nationality`; ingest treats a voting seed as in scope; buildRow sets voting=true and
  origin "Voting / elections" for it. geoNearName ignores "initial appearance in / arrested in the District of X" (that put
  Ozegovic and Weihmann in Boston; Ozegovic fixed to Minneapolis, MN in data/harvest.json). ice.gov seeds are DHS rows with
  via "ICE press"; justice.gov is no longer mistaken for ice.gov when picking the seed office.
- Victoria Viktorovna Aquilina (usao-edmi, "Feds Charge Russian National for Illegally Voting") was on the ledger with
  voting=false / origin "Federal program"; fixed in data/harvest.json to voting=true, "Voting / elections", stage Charged,
  nationality "a Russian national". Same person as Invasion's "Victoria Viktorivna Aquilina" (spelling), not re-added.
- Tests: scripts/harvest-voting-crosspost.test.mjs (in package.json and the workflow): voting seed fields, one schemeId per
  release, Minneapolis not Boston, nationality wording, every voting seed person has non-citizen wording, every live voting row
  has a state, no voter listed twice (accent-insensitive).

## 2026-10-20 (9:36 AM CDT) small fixes

- Aaron Michael McComsey (EDPA, threats against a member of Congress) removed via data/exclude.json. Cause: the
  threat email quoted "Medicare ... medicaid", which matched KEEP. keepBlob() now drops a release whose title is a
  threats case (threat/threatening/swatting/stalking) unless the title also has a fraud word.
- "New York" row renamed to Michael DeNicola (NJ, Amtrak employee health care plan; kept), id recomputed with
  ledger-id rowId(), "As posted" quote added from the release. Cause: firstPerson() fallback took "New York" from
  "a podiatrist formerly based in New York was sentenced"; cleanPerson() now rejects U.S. state names on every
  path, so the DOJ item falls back to the body and finds DeNicola.
- Jason and Lacey Carney (WDAR, 2nd Milk non-profit; wire fraud + tax fraud): origin corrected to "Tax fraud"
  (was "Health care / nursing credentials" from "nursing mothers"). originFor() now labels tax-evasion / false
  return / payroll-tax / tax-preparer cases "Tax fraud" (checked before the nursing rule; tax-credit, PPP, UI and
  Medicare cases keep their program label). Existing tax rows labelled "Federal program (see release)" unchanged.
- Tests: scripts/harvest-fixes-1020b.test.mjs (npm test + hourly workflow). Voting cross-posting untouched.

## 2026-10-20 (9:17 AM CDT) Krennic: private-victim fraud needs stated non-citizen status

Rule: PRIVATE-VICTIM fraud (victims are private people, businesses, banks, clients, investors, nonprofits,
churches, sports betting ...) stays on the ledger ONLY if the official release states the person is a non-citizen
(illegal alien, foreign national, "<Nationality> national", "citizen of <foreign country>", visa overstay/expired
visa, LPR/green card ...). Government-program and government-money fraud (programs, taxes, public agencies,
elections, immigration benefits) is unchanged.

Feed cleanup (all 187 live rows reviewed; every private-victim release body read via the DOJ API):
- 25 rows / 24 releases moved to data/exclude.json, reason "Krennic 2026-10-20: private-victim, citizenship not
  stated": Tremont Hancock, Roy Dave Davis, Chanise Coyne, Cordara Mattox, Yolanda Rumph, Mercedes Henry, Emily
  Roberts, Olivia Oxley, Clayton Lloyd Iley, Kijuana Evans, Dondre O. Daniels, Juan Francisco Ramirez, Brian
  Mitchell, MonsterCloud LLC (Pinhasi is "a national of the United States and Israel" = U.S. citizen), Sharieff
  Tate Pierre, Tahnya Hyung Shafer, Parker James Wilde, Jalen Smith, Judith A. Hetzell, Christopher Erik Septon,
  Bob Hunter, Michael Herrera, Mark Marriott, John O'Brien, San Diego Logistics Group Inc. (Co-defendants named in
  Krennic's list - Oxley's, Evans's, Daniels's - had no rows of their own.)
- Kept, non-citizen stated: Bazili Anghel Anghel ("citizen of Romania and national of Spain", illegal reentry),
  Shenghan Jin ("Chinese national", expired student visa), Samuel B. Javier ("citizen of the Dominican Republic
  whose visa has expired"; was on the likely-removal list).
- Kept, government money (were on the likely-removal list): Steve Randall Howe (PPP), Joshua Lybolt (EIDL/PPP),
  Raghava Reddy Ghosala (conspiracy to defraud the United States + false NATA tax returns).
- Kept, unsure: "New York" row = Michael DeNicola, Amtrak health-plan fraud (Amtrak is federally owned; row name
  is a parser error); Aaron Michael McComsey (threat to a member of Congress - not fraud at all, mis-harvested).
- Amachukwu (SDNY, already excluded on the skip list): release says "Nigerian Man" / "40, of Nigeria" /
  "Nigeria-based" only - no national/citizen wording, so not stated. NOTE: his scheme includes fraudulent IRS/state
  tax refunds (~$2.5M) and EIDL (~$819K), i.e. government money. Left excluded; Krennic to decide.

Harvester (scripts/harvest-gov.mjs):
- ingest(): if keepBlob() (program / government money) is false, the release is kept only via
  privateVictimNonCitizen(): a victim-fraud term (wire/bank/investment fraud, defraud, scam, embezzle, identity
  theft ...) AND nonCitizenInRelease(); and each row must pass nonCitizenStatedFor(name) - a sentence naming that
  defendant carries the wording (or the release has one defendant). Co-defendants without stated status are not
  added (Javier yes, Jackson no). Boilerplate never counts: "criminal aliens" (HSTF), "senior citizens",
  "citizens of <State>", "National Fraud Enforcement Division", "national of the United States", dual/U.S. citizen.
  Smuggling, drug money, sanctions/export, immigration-case roundups and ID-document cases are not private-victim
  fraud even with non-citizen wording.
- dojItem(): for a non-program release whose body states non-citizen status, the full body travels as
  item.fullText so the per-person check sees "Jin was in the country on a student visa ...".
- GOV_MONEY (new, alongside KEEP): tax evasion / false tax returns / payroll taxes / tax preparer, conspiracy to
  defraud the United States, U.S. Treasury checks, theft of government money, major fraud against the U.S., false
  documents to a state Department; weak words (public/taxpayer funds, government contracts, MBTA/transit
  authority) count only on a crime-titled release. Since the morning change removed generic wire/bank/mail fraud,
  tax cases had no KEEP term; this restores them. Dry run adds 6 tax rows (Koller, Rosa Cazares, Kludje, Jason and
  Lacey Carney, Sherita Booker).
- harvest-parse.mjs: "indictment charging <Name> , <title>" names the person (Rosa Cazares, not "La Mota, LLC").
- Tests: scripts/harvest-private-victim.test.mjs (in npm test and the hourly workflow). One existing assertion in
  harvest-gaps.test.mjs changed its title ("Tax Fraud Cases Move Forward" -> "Restaurant Owner Sentenced") because
  a "Tax Fraud" title is now in scope as tax; the payroll "Medicare taxes" guard it tests is unchanged. The Cafirma
  body-read test teaser dropped "false tax returns" so it still exercises the body path.
- Known quirk: Carney rows get origin "Health care / nursing credentials" (originFor wording match); harmless label.

## 2026-10-20 missed-case audit (Oct 16–20) + harvester gap fixes

Krennic chose "add the clear missed cases and fix the harvester gaps" after a list-only audit.

Rows added through `data/seed-releases.json` (official release, the release's own wording, `names` = exactly who is listed, `stage` = the release's stage, never upgraded). 25 rows from 17 releases. Each release has its own schemeId. Dollar amounts are never multiplied (`entered` stays "Amount not stated"). No photos.
- Voting: Gaye Tyndale-Simpson (OPA/D.N.J., pleaded guilty), Mukeshkumar Somabhai Chaudhari (DHS, D. Minn. indictment, Charged).
- Unemployment / PUA: ANDREA WELLINGTON + RANDALL EASLEY (N.D. Ill., Charged), Derrick Thompson (DOL OIG Oct 16, arrested/Charged; Charles Marshall was already on the ledger), Heidi Cafirma (D. Haw., Sentenced), Cori Godin (D. Me., Sentenced).
- Medicare: Steven Anthony Churchill + Samson Kollelil Solomon (D. Kan., Sentenced; Fawn Lickteig is in the release but not on the add list, so she is not a row and the DOJ API pass skips the release).
- PPP / CARES / ERC: Gregory Vernon Dupree (S.D. Ind., Charged), DAVANTE MALLARD (D. Conn., Pleaded guilty), MARCEL GROSS (E.D. La., Sentenced), Dominique J. Stanberry (N.D. Fla., Pleaded guilty).
- Tax shelter: Duncan John MacDonald, Sarah Duren, Richard Ronald Cayce, Thomas Weickgenant (N.D. Tex., Charged), one scheme.
- Civil settlements: Somerset Lifesciences Inc. (OPA Civil; pin = Washington, DC, company location not stated), Negril Incorporated (W.D. Va.), Garrett Mechanical Inc. + Hey Brother, LLC + Joseph Bruni + Daniel Tulchin (D. Del., one scheme, $295,204 counted once).
- Immigration documents: Peggy Jill Hendrick (S.D. W. Va., I-9, Pleaded guilty), Jingming Chen (N.D. Ohio, marriage fraud, Charged; a U.S. citizen, no nationality field).
- Skipped (private-victim fraud): Stewart, Amachukwu, Joshua Jackson, Graham, Curtis Jackson, Townes, Keating, Riddle, Joey Jackson, Hunnicutt, Dickson, Skubinski, Slawik, Redzepagic, Joseph Rodriguez. The Amachukwu/Utulu SDNY release is in `data/exclude.json` (the new body reading found its EIDL paragraph).
- ALL-CAPS names are kept as the USAO prints them (house precedent: MADISYN PETTAWAY).

Harvester fixes (scripts/harvest-gov.mjs, scripts/harvest-parse.mjs; tests: scripts/harvest-gaps.test.mjs, added to `npm test` and the workflow):
- Map pins for all 94 U.S. Attorney's offices. Before, a release from a district missing from DISTRICT_SEAT made no row at all (this alone dropped D. Kan., S.D. Ind., D. Haw., E.D. La., N.D. Fla., D. Me., W.D. Va., D. Del., S.D. W. Va., N.D. Ohio).
- Program scope: new KEEP terms (pandemic relief, ERC / sick-and-family-leave credits, tax shelter, theft of government money, False Claims Act, government/USPS overbilling, sham marriage, immigration document fraud, visa misuse). "wire / bank / mail fraud" alone no longer qualifies. Strike-force / Task Force boilerplate and "Social Security and Medicare taxes" are ignored; HHS-OIG "notice of exclusion" pages are skipped.
- DOJ API teaser with no name: the first 3,000 characters of the body are read. A teaser that names the defendant but not the program: body read for the program, names kept from the teaser.
- Names: every defendant in multi-defendant releases (DOL OIG roundups: "X was arrested", "co-conspirator, Y,"; "residents A, B, C and D"; USAO ALL-CAPS first mention confirmed by a later "Surname, 35," / "Surname is charged"; "Name, a/k/a"; ", Jr.,"). A place before "pleaded guilty" ("Hoboken, New Jersey") is not a person. Company names stop at a lowercase word.
- Seeds run first; the DOJ API pass skips seeded releases; optional seed `names`; non-Charged stages are written as "Stage: <stage>." Same person re-posted by another agency within 21 days is not added twice.
- Cross-post from Invasion Update: approved `voting` rows from a justice/dhs/ice/cbp.gov release that the Invasion harvester built (label = release sentence), once per person (any date), stage from the Invasion label. X posts and hand-summarized rows are not cross-posted. Rows with no pin (no lat/lon, no district in the sentence, no state) are skipped.
- HHS-OIG and IRS-CI were already list sources; their pages now pass through the same name / scope fixes. IRS-CI cases mostly appear as USAO releases (now pinned).
- A dry run on a copy of the feed added the 25 seeded rows and 5 more harvester rows within scope (Oct 15–16): Miguel Dario Bautista Jimenez (D.N.J., naturalization/passport), Ronnie Lorenzo Robinson Jr. (W.D.N.C., Medicaid; the release's company row was already listed), Manjit Bedi (W.D. Wash., SNAP), CVS Pharmacy Inc. (D. Haw., FCA/Medicare), Peter L. Roper (OPA, sold purported federal tax credits). No duplicates, ids unique, no schemeId spans two releases, no skip-list name.
- Existing rows were not re-filtered: about 50 older rows are private-victim cases that came in under the old "wire/bank/mail fraud" rule. They stay until Krennic decides (data/exclude.json).

## 2026-11-03 ~4:00 PM CST — latest-examples sweep
- 7 seeds added to data/seed-releases.json (Laufenberg, Burke, Colbert, Butts, Premier Medical Group, ILC Dover/Astrospace, SNG Dialysis Centers).
- data/stage-updates.json: Khalwinder Singh Bhengura → Convicted (NDTX Oct 28 jury verdict).
- Test: Akpom stays a voting row (Krennic: "Keep Akpom as voting.").
- Gaps (no rule change): parser misses PPP/Medicaid/FCA settlement releases; stage set once, never upgraded by later releases.

## 2026-11-04 daily missed-cases check
- Seeded Thakur Sukhdeo (usao-mdfl, EIDL plea); teaser runs through the "Economic Injury Disaster Loan (EIDL)" sentence because "COVID relief" alone does not match KEEP. Live in feed.
- Rule gap, NOT changed (needs Krennic's yes): usao-sdca "Former Police Officer Admits ... Pocketing Nearly $300,000 in Stolen Government Benefits" (Ivan Alonso Rodriguez, SSA + OPM benefits of a dead retiree, 18 U.S.C. 641) fails keepBlob, so a seed cannot add it. Fix: add "government benefits" / "stolen public money" / "social security administration" benefit-theft wording to KEEP.
- Parser duplicate, NOT changed: usao-ma Piron Lara SNAP/MassHealth release produced two rows, "Danis Piron Lara" and surname-only "Piron Lara". Fix: drop a parsed name that is a trailing subset of another name in the same release.

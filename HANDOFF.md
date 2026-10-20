# HANDOFF: fraudtracker-data

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

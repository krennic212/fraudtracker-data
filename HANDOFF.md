# HANDOFF: fraudtracker-data

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

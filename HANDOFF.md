# HANDOFF: fraudtracker-data

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

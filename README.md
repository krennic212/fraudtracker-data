# fraudtracker-data

Public data feed for the **Fraud Ledger** (https://fraudtracker.grok.me).
The repo has no app code, only the harvest script and its output.

- `data/harvest.json`: named fraud cases harvested from official sources:
  - justice.gov press releases, including U.S. Attorney offices
  - USDA
  - HHS, SBA, SSA, IRS, DOL and VA inspector-general releases
  - the Idaho AG Medicaid-fraud newsroom
  - news items that cite an official charging paper
- `data/harvest-meta.json`: `updatedAt` (when the rows last changed), `rows`, `schemes`.
- `data/harvest-status.json`: the harvester's own status (which names the last change added).
- Served at **https://krennic212.github.io/fraudtracker-data/harvest.json**. Also available at
  `https://raw.githubusercontent.com/krennic212/fraudtracker-data/main/data/harvest.json`.

## How it updates

`.github/workflows/hourly-harvest.yml` runs every hour and can also be started by hand.
Each run does the following:

1. `scripts/harvest-gov.mjs` reads the sources above. Headline-only rows are dropped.
2. `scripts/ledger-dedupe.mjs` removes duplicate rows (same person, same case). It also blanks any
   photo field, so the feed never carries images.
3. If the row list changed, the run stamps `harvest-meta.json`, commits `data/` (`[skip ci]`) and redeploys GitHub Pages.
   A run that finds nothing new commits nothing.

Co-defendants share one `schemeId`. Dollar totals should be counted once per scheme.
Charges are allegations unless the source says the defendant pleaded guilty or was convicted.
This is an independent record, not a government site.

Coverage rules (2026-10-20): a release needs government-program wording (Medicare/Medicaid, SNAP/WIC, PPP/EIDL/CARES/pandemic relief, unemployment, ERC and other COVID tax credits, tax shelters, theft of government money, False Claims Act / government-contract overbilling, FEMA, HUD, VA, TANF, voting/elections, naturalization/passport/marriage/visa/I-9 fraud). "Wire / bank / mail fraud" alone is not enough (private-victim schemes stay off). Agency boilerplate (strike-force and Task Force paragraphs, payroll "Medicare taxes") does not count. When a DOJ API teaser names nobody, the first 3,000 characters of the body are read. Every U.S. Attorney's office (94) has a map pin. Same person posted again by another agency within 21 days is not added twice. Approved official voting rows from the Invasion Update feed (built by its harvester from a .gov release) are cross-posted, once per person.

Manual add: list an official release in `data/seed-releases.json` (`link`, `title`, `date`, `teaser` = the release's own wording for the named defendants, optional `seat` district for map pin). The harvester ingests it through the same parse/id path, so each release keeps its own `schemeId`. Optional `stage` (e.g. `"Charged"`) is copied onto each row and into its text ("Stage: Charged (not convicted)"); it is never upgraded. Optional `names` lists the defendants exactly as the teaser spells them; then only those become rows (the DOJ API pass skips a seeded release). Seeds run before the DOJ API pass.

OPA multi-district election roundups (justice.gov/opa/pr/..., election wording, two or more "District of" sections) are read from the full DOJ API body, because their teaser has no names. Each defendant is pinned to the district section it is listed under, and their own line from the release is quoted verbatim, with `nationality` holding the DOJ wording exactly as written ("a Mexico national", "a citizen of the Philippines"). If a voter already appears on another release within 14 days (a USAO mirror or an OPA recap), they are not added again.

Removed rows: `data/exclude.json` lists releases (by `sourceUrl`) or rows (by `id`) that Krennic removed. The harvester drops them from the feed and never ingests them again. Servicemember-rights civil settlements (SCRA / USERRA) are not fraud and are skipped, unless the release also mentions fraud, false claims, kickbacks, false statements, theft, embezzlement or bribery.

Run locally: `npm run harvest` (Node 20+, no dependencies). Run the tests with `npm test`.

Spotted a mistake? Open an issue: https://github.com/krennic212/fraudtracker-data/issues

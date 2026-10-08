# fraudtracker-data

Public data feed for the **Fraud Ledger** (https://fraudtracker.grok.me).
The repo has no app code, only the harvest script and its output.

- `data/harvest.json`: named fraud cases harvested from official sources:
  - justice.gov press releases, including U.S. Attorney offices
  - USDA
  - HHS, SBA, SSA, IRS, DOL and VA inspector-general releases
  - the Idaho AG Medicaid-fraud newsroom
  - news items that cite an official charging paper
- `data/harvest-status.json`: when the last change was harvested and which names it added.
- Served at **https://krennic212.github.io/fraudtracker-data/harvest.json**. Also available at
  `https://raw.githubusercontent.com/krennic212/fraudtracker-data/main/data/harvest.json`.

## How it updates

`.github/workflows/hourly-harvest.yml` runs every hour and can also be started by hand.
Each run does the following:

1. `scripts/harvest-gov.mjs` reads the sources above. Headline-only rows are dropped.
2. `scripts/ledger-dedupe.mjs` removes duplicate rows (same person, same case). It also blanks any
   photo field, so the feed never carries images.
3. If the row list changed, the run commits `data/` (`[skip ci]`) and redeploys GitHub Pages.
   A run that finds nothing new commits nothing.

Co-defendants share one `schemeId`. Dollar totals should be counted once per scheme.
Charges are allegations unless the source says the defendant pleaded guilty or was convicted.
This is an independent record, not a government site.

Run locally: `npm run harvest` (Node 20+, no dependencies). Run the tests with `npm test`.

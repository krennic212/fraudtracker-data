/** Shared harvest rules: named people / operations, official URLs, headline drop. */

const OP_STOP =
  /^(Hits|Targets|Nets|Cracks|Announces|Results|Takes|Is|In|On|For|The|A|An)$/i;

const HEADLINE_VERB =
  /pleads guilty|pleaded guilty|sentenced|indicted|imprisoned|charged with|sues |agrees to pay|shuts down|announces|investigation/i;

const COMPANY =
  /\b([A-Z][A-Za-z0-9&.'' -]{1,50}(?:,?\s*(?:Inc|LLC|LLP|Corp|Corporation|Ltd|Co)\.?))\b/;

const PERSON =
  /\b([A-Z][a-z]+(?:-[A-Z][a-z]+)?(?:\s+[A-Z]\.)?(?:\s+[A-Z][a-z]+(?:-[A-Z][a-z]+)?){1,3}),\s*(?:age\s*)?\d{1,3},\s*(?:of|from)\s+/;

const PERSON_CHARGED =
  /\b(?:charged|indicted|sentenced|arrested)\s+([A-Z][a-z]+(?:-[A-Z][a-z]+)?(?:\s+[A-Z]\.)?(?:\s+[A-Z][a-z]+(?:-[A-Z][a-z]+)?){1,3})\b/;

const PERSON_YEAR_OLD =
  /\b([A-Z][A-Za-z]+(?:[-‐‑][A-Z][A-Za-z]+)?(?:\s+[A-Z]\.)?(?:\s+[A-Z][A-Za-z]+(?:[-‐‑][A-Z][A-Za-z]+)?){1,3}),\s+a(?:n)?\s+\d{1,3}[-\s]year[-\s]old\b/g;

const PERSON_WAS =
  /\b([A-Z][A-Za-z]+(?:[-‐‑][A-Z][A-Za-z]+)?(?:\s+[A-Z]\.)?(?:\s+[A-Z][A-Za-z]+(?:[-‐‑][A-Z][A-Za-z]+)?){1,3}),\s+(?:a|an)\s+[^.!?]{0,80}?\s+was\s+(?:arrested|charged|indicted|sentenced)/g;

const PERSON_PLEAD =
  /\b([A-Z][a-z]+(?:-[A-Z][a-z]+)?(?:\s+[A-Z]\.)?(?:\s+[A-Z][a-z]+(?:-[A-Z][a-z]+)?){1,3})\s+(?:pleaded guilty|pleads guilty|was sentenced|was indicted|was arrested|has been charged)/;


const OFFICIAL =
  /https?:\/\/(?:www\.)?(?:justice|usda|dhs|ice|irs|sba|ssa|hud|fema|va|dol|cms)\.gov\/[^\s"'<>]+|https?:\/\/(?:www\.)?(?:oig\.(?:hhs|ssa|sba|dhs|dol)|vaoig|hudoig)\.gov\/[^\s"'<>]+|https?:\/\/(?:www\.)?ag\.idaho\.gov\/[^\s"'<>]+|https?:\/\/(?:www\.)?federalregister\.gov\/[^\s"'<>]+/i;

export function operationName(title) {
  const m = String(title).match(/\bOperation\s+([A-Za-z0-9' ]{2,80})/);
  if (!m) return null;
  const words = [];
  for (const w of m[1].trim().split(/\s+/)) {
    if (OP_STOP.test(w) || !/^[A-Z]/.test(w)) break;
    words.push(w);
    if (words.length >= 4) break;
  }
  if (!words.length) return null;
  return `Operation ${words.join(" ")}`;
}

export function officialUrl(blob) {
  const m = String(blob).match(OFFICIAL);
  return m ? m[0].replace(/[),.;]+$/, "") : null;
}

const PERSON_AGE =
  /\b([A-Z][A-Za-z]+(?:[-‐‑][A-Z][A-Za-z]+)?(?:\s+[A-Z]\.)?(?:\s+[A-Z][A-Za-z]+(?:[-‐‑][A-Z][A-Za-z]+)?){1,3}),\s*(?:age\s*)?\d{1,3},/g;

const PERSON_STATUS =
  /\b([A-Z][A-Za-z]+(?:[-‐‑][A-Z][A-Za-z]+)?(?:\s+[A-Z][A-Za-z]+(?:[-‐‑][A-Z][A-Za-z]+)?){1,3}),\s+(?:(?:a|an)\s+)?(?:suspected\s+)?(?:illegal alien|lawful permanent resident|alien with lawful)/gi;

const PERSON_OF =
  /\b([A-Z][A-Za-z]+(?:[-‐‑][A-Z][A-Za-z]+)?(?:\s+[A-Z]\.)?(?:\s+[A-Z][A-Za-z]+(?:[-‐‑][A-Z][A-Za-z]+)?){1,3}),\s+of\s+[A-Z]/g;

const PERSON_ALIEN_LEAD =
  /\b(?:illegal alien|lawful permanent resident)\s+([A-Z][A-Za-z]+(?:[-‐‑][A-Z][A-Za-z]+)?(?:\s+[A-Z]\.)?(?:\s+[A-Z][A-Za-z]+(?:[-‐‑][A-Z][A-Za-z]+)?){1,3}),\s+of\s+/gi;

const PERSON_CHARGED_G = new RegExp(PERSON_CHARGED.source, "g");

const PERSON_PAIR =
  /\b([A-Z][A-Za-z]+(?:[-‐‑][A-Z][A-Za-z]+)?(?:\s+[A-Z]\.)?(?:\s+[A-Z][A-Za-z]+(?:[-‐‑][A-Z][A-Za-z]+)?){1,3})\s+and\s+(?:(?:his|her)\s+(?:wife|husband),?\s+)?([A-Z][A-Za-z]+(?:[-‐‑][A-Z][A-Za-z]+)?(?:\s+[A-Z]\.)?(?:\s+[A-Z][A-Za-z]+(?:[-‐‑][A-Z][A-Za-z]+)?){1,3}),?\s+were\s+(?:indicted|charged|arrested)/g;

function normHyphen(s) {
  return String(s).replace(/[\u2010-\u2015\u2212]/g, "-");
}

export function personOrEntity(title, teaser = "") {
  const op = operationName(title);
  const fromTeaser = teaser ? firstPerson(teaser) : null;
  if (fromTeaser) return fromTeaser;
  const fromTitle = firstPerson(title);
  if (fromTitle) return fromTitle;
  const co = `${title} ${teaser}`.match(COMPANY);
  if (co) return { name: co[1].replace(/\s+/g, " ").trim(), kind: "company" };
  if (op) return { name: op, kind: "scheme" };
  return null;
}

const NAME_STOP =
  /^(Fraud|Defendants?|Owner|Clinic|Man|Woman|Two|Former|United|States|Department|Justice|Medicare|Medicaid|COVID(?:-19)?|Northern|Southern|Eastern|Western|District|Married|Couple|Wife|Husband|American|Elections?|Labrador|Provider|Sentenced|Convicted)$/i;

function cleanPerson(raw) {
  const parts = String(raw)
    .split(/\s+/)
    .filter((w) => !NAME_STOP.test(w.replace(/[.,]$/, "")));
  if (parts.length < 2) return null;
  return parts.join(" ");
}

function pushName(out, seen, raw) {
  const name = cleanPerson(normHyphen(raw).trim());
  if (!name) return;
  const key = name.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  out.push(name);
}

const ALLCAPS_STOP = new Set([
  "SENTENCED",
  "CONVICTED",
  "INDICTED",
  "ARRESTED",
  "CHARGED",
  "FELONY",
  "COUNT",
  "COUNTS",
  "GRAND",
  "THEFT",
  "RELATED",
  "TO",
  "MEDICAID",
  "MEDICARE",
  "IDAHO",
  "FALLS",
  "AG",
  "ATTORNEY",
  "GENERAL",
  "LABRADOR",
  "SECURES",
  "FRAUD",
  "CONVICTION",
  "PROTECTING",
  "FAMILIES",
  "ONE",
  "OF",
  "IN",
  "THE",
  "AND",
  "FOR",
  "PROVIDER",
  "BILLED",
  "HOURS",
  "SHE",
  "SPENT",
  "DELIVERING",
  "AMAZON",
  "PACKAGES",
  "PERSONAL",
  "ERRANDS",
  "INSTEAD",
  "CARING",
  "DISABLED",
  "WOMAN",
  "MY",
  "UNIT",
  "CONTROL",
  "INVESTIGATED",
  "PROSECUTED",
  "SNAP",
  "VISA",
  "VOTING",
  "ELECTION",
  "ILLEGAL",
  "ALIEN",
  "FROM",
  "WITH",
  "THIS",
  "THAT",
  "OFFICE",
  "COUNTY",
  "STATE",
  "DEPARTMENT",
  "TAXPAYERS",
  "AFTER",
  "ANY",
  "WHO",
  "WILL",
  "KEEP",
  "GOING",
  "MFCU",
]);

function titleCasePerson(s) {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) =>
      w
        .split("-")
        .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : p))
        .join("-"),
    )
    .join(" ");
}

/** AG infographic names are often ALL CAPS with no “Name, 36, of City”. */
function allCapsNames(text) {
  const blob = String(text);
  if (!/\bSENTENCED\b|\bCONVICTED\b/.test(blob)) return [];
  const tokens = blob.match(/\b[A-Z]{2,}(?:-[A-Z]{2,})?\b/g) || [];
  const out = [];
  const seen = new Set();
  let run = [];
  const flush = () => {
    if (run.length >= 2 && run.length <= 4) {
      const name = titleCasePerson(run.join(" "));
      const key = name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(name);
      }
    }
    run = [];
  };
  for (const tok of tokens) {
    if (ALLCAPS_STOP.has(tok)) {
      flush();
      continue;
    }
    run.push(tok);
  }
  flush();
  return out;
}

function firstPerson(blob) {
  const text = normHyphen(blob);
  const person = text.match(PERSON);
  if (person) {
    const name = cleanPerson(person[1].trim());
    if (name) return { name, kind: "person" };
  }
  PERSON_AGE.lastIndex = 0;
  const aged = PERSON_AGE.exec(text);
  if (aged) {
    const name = cleanPerson(aged[1].trim());
    if (name) return { name, kind: "person" };
  }
  PERSON_YEAR_OLD.lastIndex = 0;
  const yearOld = PERSON_YEAR_OLD.exec(text);
  if (yearOld) {
    const name = cleanPerson(yearOld[1].trim());
    if (name) return { name, kind: "person" };
  }
  PERSON_WAS.lastIndex = 0;
  const wasHit = PERSON_WAS.exec(text);
  if (wasHit) {
    const name = cleanPerson(wasHit[1].trim());
    if (name) return { name, kind: "person" };
  }
  PERSON_STATUS.lastIndex = 0;
  const status = PERSON_STATUS.exec(text);
  if (status) {
    const name = cleanPerson(status[1].trim());
    if (name) return { name, kind: "person" };
  }
  PERSON_OF.lastIndex = 0;
  const ofCountry = PERSON_OF.exec(text);
  if (ofCountry) {
    const name = cleanPerson(ofCountry[1].trim());
    if (name) return { name, kind: "person" };
  }
  PERSON_ALIEN_LEAD.lastIndex = 0;
  const alienLead = PERSON_ALIEN_LEAD.exec(text);
  if (alienLead) {
    const name = cleanPerson(alienLead[1].trim());
    if (name) return { name, kind: "person" };
  }
  PERSON_PAIR.lastIndex = 0;
  const pair = PERSON_PAIR.exec(text);
  if (pair) {
    const name = cleanPerson(pair[1].trim());
    if (name) return { name, kind: "person" };
  }
  const plead = text.match(PERSON_PLEAD);
  if (plead && !HEADLINE_VERB.test(plead[1])) {
    const name = cleanPerson(plead[1].trim());
    if (name) return { name, kind: "person" };
  }
  const charged = text.match(PERSON_CHARGED);
  if (charged && !HEADLINE_VERB.test(charged[1])) {
    const name = cleanPerson(charged[1].trim());
    if (name) return { name, kind: "person" };
  }
  const caps = allCapsNames(text);
  if (caps.length) return { name: caps[0], kind: "person" };
  return null;
}

/** Every named defendant in a DOJ roundup body, not just the first. */
export function allPeople(title, teaser = "") {
  const text = normHyphen(`${teaser || ""}\n${title || ""}`);
  const out = [];
  const seen = new Set();
  PERSON_AGE.lastIndex = 0;
  for (const m of text.matchAll(PERSON_AGE)) pushName(out, seen, m[1]);
  PERSON_YEAR_OLD.lastIndex = 0;
  for (const m of text.matchAll(PERSON_YEAR_OLD)) pushName(out, seen, m[1]);
  PERSON_WAS.lastIndex = 0;
  for (const m of text.matchAll(PERSON_WAS)) pushName(out, seen, m[1]);
  PERSON_STATUS.lastIndex = 0;
  for (const m of text.matchAll(PERSON_STATUS)) pushName(out, seen, m[1]);
  PERSON_OF.lastIndex = 0;
  for (const m of text.matchAll(PERSON_OF)) pushName(out, seen, m[1]);
  PERSON_ALIEN_LEAD.lastIndex = 0;
  for (const m of text.matchAll(PERSON_ALIEN_LEAD)) pushName(out, seen, m[1]);
  PERSON_CHARGED_G.lastIndex = 0;
  for (const m of text.matchAll(PERSON_CHARGED_G)) {
    if (!HEADLINE_VERB.test(m[1])) pushName(out, seen, m[1]);
  }
  PERSON_PAIR.lastIndex = 0;
  for (const m of text.matchAll(PERSON_PAIR)) {
    pushName(out, seen, m[1]);
    if (m[2]) pushName(out, seen, m[2]);
  }
  const person = text.match(PERSON);
  if (person) pushName(out, seen, person[1]);
  if (!out.length) {
    const one = firstPerson(text);
    if (one) out.push(one.name);
  }
  return out;
}

export function looksLikeHeadline(name) {
  const n = String(name || "").trim();
  if (!n) return true;
  if (/^Operation\s+/i.test(n)) return false;
  if (/\b(Inc|LLC|LLP|Corp|Ltd)\.?\b/i.test(n) && n.split(/\s+/).length <= 8) {
    return false;
  }
  const words = n.split(/\s+/).filter(Boolean);
  if (words.length >= 8) return true;
  if (HEADLINE_VERB.test(n)) return true;
  return false;
}

export function rewriteHarvestName(name, title = "", teaser = "") {
  const entity = personOrEntity(title || name, teaser || "");
  if (entity && !looksLikeHeadline(entity.name)) return entity.name;
  if (!looksLikeHeadline(name)) return name;
  const op = operationName(title || name) || operationName(teaser || "");
  if (op) return op;
  return null;
}

export function isKeepRow(name, title = "", teaser = "") {
  if (operationName(name) || operationName(title)) return true;
  if (!looksLikeHeadline(name)) return true;
  return Boolean(personOrEntity(title || name, teaser));
}

export function newsHasChargingPaper(link, teaser = "") {
  return Boolean(officialUrl(`${link} ${teaser}`) || OFFICIAL.test(link));
}

export function isOfficialHost(link) {
  return /(?:justice|usda|dhs|ice|irs|hud|fema|va|dol|cms)\.gov|oig\.(?:hhs|ssa|sba|dhs|dol)|vaoig\.gov|hudoig\.gov|sba\.gov|ssa\.gov|ag\.idaho\.gov|federalregister\.gov/i.test(
    String(link),
  );
}

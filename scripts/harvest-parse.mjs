/** Shared harvest rules: named people / operations, official URLs, headline drop. */

const OP_STOP =
  /^(Hits|Targets|Nets|Cracks|Announces|Results|Takes|Is|In|On|For|The|A|An)$/i;

const HEADLINE_VERB =
  /pleads guilty|pleaded guilty|sentenced|indicted|imprisoned|charged with|sues |agrees to pay|shuts down|announces|investigation/i;

// Company: up to six capitalized words right before the suffix ("CVS Pharmacy Inc", "La Mota, LLC").
// A lowercase word ends it, so "Attorney Ken Sorenson announced that CVS Pharmacy Inc" is "CVS Pharmacy Inc".
const COMPANY =
  /(?<![A-Za-z0-9&.'’-])((?:[A-Z0-9][A-Za-z0-9&.'’-]*\s+){0,5}[A-Z0-9][A-Za-z0-9&'’-]*(?:,?\s*(?:Incorporated|Inc|LLC|LLP|Corp|Corporation|Ltd|Co)\.?))(?![A-Za-z])/;

// Optional Jr./Sr./II–IV after the last name token (period optional).
// Name tokens are Unicode-aware (Muñoz, Jiménez, Bañuelos-Díaz, Garcés) and may be joined by
// lowercase Spanish / Portuguese / Dutch particles (de León, del Carmen, de la Cruz, dos Santos),
// but a particle never starts or ends a name. Tokens are joined by spaces only, so a name never
// runs across a sentence end ("United States. Camino Giles Jiménez" is two pieces).
const W = String.raw`\p{Lu}[\p{Ll}\p{Lu}'’]*\p{L}(?:[-‐‑]\p{Lu}[\p{Ll}\p{Lu}'’]*\p{L})?`;
const WT = String.raw`\p{Lu}[\p{Ll}'’]*\p{Ll}(?:-\p{Lu}[\p{Ll}'’]*\p{Ll})?`;
const PARTICLE = String.raw`(?:(?:de|del|de la|de las|de los|da|das|do|dos|di|du|van|van der|von|y)\s+)`;
const NAME_CORE =
  String.raw`(?<![\p{L}\p{N}'’])` + W + String.raw`(?:\s+\p{Lu}\.)?(?:\s+` + PARTICLE + String.raw`?` + W + String.raw`){1,4}(?:,?\s+(?:Jr\.?|Sr\.?|II|III|IV)(?![\p{L}]))?`;
const NAME_CORE_TITLE =
  String.raw`(?<![\p{L}\p{N}'’])` + WT + String.raw`(?:\s+\p{Lu}\.)?(?:\s+` + PARTICLE + String.raw`?` + WT + String.raw`){1,3}(?:\s+(?:Jr\.?|Sr\.?|II|III|IV))?`;

const PERSON = new RegExp(
  String.raw`(` + NAME_CORE_TITLE + String.raw`),\s*(?:age\s*)?\d{1,3},\s*(?:of|from)\s+`,
  "u",
);

const PERSON_CHARGED = new RegExp(
  String.raw`\b(?:charged|indicted|sentenced|arrested)\s+(` + NAME_CORE_TITLE + String.raw`)(?![\p{L}\p{N}])`,
  "u",
);

const PERSON_YEAR_OLD = new RegExp(
  String.raw`(` + NAME_CORE + String.raw`),\s+a(?:n)?\s+\d{1,3}[-\s]year[-\s]old\b`,
  "gu",
);

const PERSON_WAS = new RegExp(
  String.raw`(` + NAME_CORE + String.raw`),\s+(?:a|an)\s+[^.!?]{0,200}?\s+(?:was|were)\s+(?:arrested|charged|indicted|sentenced)`,
  "gu",
);

const PERSON_PLEAD = new RegExp(
  String.raw`(` + NAME_CORE_TITLE + String.raw`)\s+(?:pleaded guilty|pleads guilty|was sentenced|was indicted|was arrested|has been charged)`,
  "u",
);


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

const PERSON_AGE = new RegExp(
  String.raw`(` + NAME_CORE + String.raw`),\s*(?:age\s*)?\d{1,3},`,
  "gu",
);

const PERSON_STATUS = new RegExp(
  String.raw`(` + NAME_CORE + String.raw`),\s+(?:(?:a|an)\s+)?(?:suspected\s+)?(?:illegal alien|lawful permanent resident|alien with lawful)`,
  "giu",
);

const PERSON_OF = new RegExp(
  String.raw`(` + NAME_CORE + String.raw`),\s+of\s+[A-Z]`,
  "gu",
);

const PERSON_ALIEN_LEAD = new RegExp(
  String.raw`\b(?:illegal alien|lawful permanent resident)\s+(` + NAME_CORE + String.raw`),\s+of\s+`,
  "giu",
);

const PERSON_CHARGED_G = new RegExp(PERSON_CHARGED.source, "gu");

const PERSON_PAIR = new RegExp(
  String.raw`(` + NAME_CORE + String.raw`)\s+and\s+(?:(?:his|her)\s+(?:wife|husband),?\s+)?(` + NAME_CORE + String.raw`),?\s+were\s+(?:indicted|charged|arrested)`,
  "gu",
);

// Multi-defendant releases (DOL OIG regional roundups, USAO indictments): every named defendant.
//  "On October 7, 2026, Charles Marshall was arrested" / "Hendrick pleaded guilty" (2+ tokens only).
const PERSON_PLEAD_G = new RegExp(
  // Not right after "<Place>, " ("of Hoboken, New Jersey pleaded guilty" is a place, not a person).
  String.raw`(?<!\p{L},\s)(` + NAME_CORE + String.raw`)\s+(?:pleaded guilty|pleads guilty|was sentenced|were sentenced|was indicted|was arrested|has been charged|was charged)\b`,
  "gu",
);
//  "Miguel Dario Bautista Jimenez, a/k/a “Carlos Chapman Hernandez,”"
const PERSON_AKA = new RegExp(String.raw`(` + NAME_CORE + String.raw`),?\s+(?:a/k/a|a\.k\.a\.|aka)\s`, "gu");
//  "her alleged co-conspirator, Randall Easley," / "co-defendant RANDALL EASLEY"
const PERSON_CODEF = new RegExp(
  String.raw`\b[Cc]o-?(?:defendant|conspirator)s?,?\s+(` + NAME_CORE + String.raw`)`,
  "gu",
);
//  "Texas residents Duncan John MacDonald, Sarah Duren, Richard Ronald Cayce and Thomas Weickgenant promoted"
const PERSON_LIST = new RegExp(
  String.raw`\b(?:residents|defendants)\s+((?:` + NAME_CORE + String.raw`,\s+)+` + NAME_CORE + String.raw`(?:,?\s+and\s+` + NAME_CORE + String.raw`)?)`,
  "gu",
);

//  USAO style: the first mention is ALL CAPS ("ANDREA WELLINGTON engaged in fraud ..."). Kept only when
//  the same surname is later the subject of an age / charge line ("Wellington, 35, of Chicago, is charged").
const CAPS_NAME = /(?<![\p{L}\p{N}'’])(\p{Lu}{2,}(?:\s+\p{Lu}\.)?(?:\s+\p{Lu}[\p{Lu}'’-]*\p{Lu}){1,3})(?![\p{L}\p{N}])/gu;
function capsDefendants(text) {
  const out = [];
  for (const m of text.matchAll(CAPS_NAME)) {
    const toks = m[1].split(/\s+/);
    if (toks.some((t) => ALLCAPS_STOP.has(t) || /^(?:U|S|USA|IRS|FBI|DOJ|HSI|ICE|DHS|OIG|PPP|EIDL|SBA|PUA|IDES|CARES|COVID|LLC|INC|II|III|IV|JR|SR)$/.test(t))) continue;
    const sur = toks[toks.length - 1];
    const surT = sur.charAt(0) + sur.slice(1).toLowerCase();
    const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(String.raw`(?<![\p{L}])(?:` + esc(surT) + "|" + esc(sur) + String.raw`)(?:\s*\([“"][^”"]{1,40}[”"]\)\s*)?(?:\s*,\s*(?:age\s*)?\d{1,3},|\s+(?:is|was|were|has been)\s+(?:charged|indicted|sentenced|arrested)|\s+pleaded guilty)`, "u");
    if (re.test(text)) out.push(m[1]);
  }
  return out;
}

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

// A run that starts with a sentence-opening word is not a clean name ("Today John Doe pleaded guilty").
const LEAD_WORD = /^(?:Today|Yesterday|Also|Additionally|Previously|Later|Then|Here|There|Thereafter|Ultimately|Finally|Meanwhile|In|On|At|By|When|After|Before|Since|Defendant|Co-?defendant|Co-?conspirator)\s/;

const NAME_STOP =
  /^(Fraud|Defendants?|Owner|Clinic|Man|Woman|Two|Former|United|States|Department|Justice|Medicare|Medicaid|COVID(?:-19)?|Northern|Southern|Eastern|Western|District|Married|Couple|Wife|Husband|American|Elections?|Labrador|Provider|Sentenced|Convicted)$/i;

// A section header glued onto a name ("Southern District of California José Probitsado Amaro"):
// a leading U.S. state token is never part of the defendant's name.
const STATE_LEAD =
  /^(?:Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|Ohio|Oklahoma|Oregon|Pennsylvania|Tennessee|Texas|Utah|Vermont|Virginia|Wisconsin|Wyoming|Columbia|Rico)$/;
const US_STATE_NAME =
  /^(?:New (?:Jersey|York|Mexico|Hampshire)|North (?:Carolina|Dakota)|South (?:Carolina|Dakota)|West Virginia|Rhode Island|Puerto Rico|District of Columbia|United States)$/;
const PARTICLE_WORD = /^(?:de|del|la|las|los|da|das|do|dos|di|du|van|der|von|y)$/;

function cleanPerson(raw) {
  const parts = String(raw)
    .replace(/,\s+(?=(?:Jr|Sr|II|III|IV)\b)/, " ")
    .split(/\s+/)
    .filter((w) => !NAME_STOP.test(w.replace(/[.,]$/, "")));
  while (parts.length > 2 && STATE_LEAD.test(parts[0])) parts.shift();
  // A particle never starts or ends a name.
  while (parts.length && PARTICLE_WORD.test(parts[0])) parts.shift();
  while (parts.length && PARTICLE_WORD.test(parts[parts.length - 1])) parts.pop();
  if (parts.filter((w) => !PARTICLE_WORD.test(w)).length < 2) return null;
  return parts.join(" ");
}

function pushName(out, seen, raw) {
  const name = cleanPerson(normHyphen(raw).trim());
  if (!name) return;
  // "British National", "Canadian Citizen": a nationality phrase, not a person.
  // Also "Belizean National", "Mexico National", "Philippines National", "Citizen Of Guatemala".
  if (/(?:^|\s)(?:nationals?|citizens?|natives?|residents?)(?:\s+of\b.*)?$/iu.test(name) || /^(?:citizens?|nationals?)\s+of\b/iu.test(name)) return;
  if (US_STATE_NAME.test(name)) return;
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
  PERSON_PLEAD_G.lastIndex = 0;
  for (const m of text.matchAll(PERSON_PLEAD_G)) {
    if (!HEADLINE_VERB.test(m[1]) && !LEAD_WORD.test(m[1])) pushName(out, seen, m[1]);
  }
  PERSON_AKA.lastIndex = 0;
  for (const m of text.matchAll(PERSON_AKA)) pushName(out, seen, m[1]);
  PERSON_CODEF.lastIndex = 0;
  for (const m of text.matchAll(PERSON_CODEF)) pushName(out, seen, m[1]);
  PERSON_LIST.lastIndex = 0;
  for (const m of text.matchAll(PERSON_LIST)) {
    for (const part of m[1].split(/,\s+(?:and\s+)?|\s+and\s+/)) pushName(out, seen, part);
  }
  for (const n of capsDefendants(text)) pushName(out, seen, n);
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

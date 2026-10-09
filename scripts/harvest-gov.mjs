#!/usr/bin/env node
/**
 * Hourly pull: official press (DOJ + USDA + HHS/SBA/SSA/IRS/DOL/VA OIG) plus
 * verified news RSS that cites a charging paper. Keeps named charging
 * cases AND named schemes / retailer-enforcement sweeps when a city can
 * be pinned. Never overwrites curated brief.ts dollars/presence.
 */
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  allPeople,
  isKeepRow,
  isOfficialHost,
  looksLikeHeadline,
  newsHasChargingPaper,
  officialUrl,
  operationName,
  personOrEntity,
  rewriteHarvestName,
} from "./harvest-parse.mjs";
import { rowId, schemeIdFor } from "./ledger-id.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// The hourly GitHub Actions job points these at data/ (durable, published);
// the app's in-process refresh keeps the public/ defaults.
const HARVEST = process.env.LEDGER_HARVEST_FILE
  ? resolve(ROOT, process.env.LEDGER_HARVEST_FILE)
  : join(ROOT, "public/harvest.json");
const STATUS = process.env.LEDGER_STATUS_FILE
  ? resolve(ROOT, process.env.LEDGER_STATUS_FILE)
  : join(ROOT, "public/harvest-status.json");
const CUTOFF = Date.parse("2025-01-21T00:00:00Z");

const DOJ_API =
  "https://www.justice.gov/api/v1/press_releases.json?pagesize=40&sort=created&direction=DESC";
const DOJ_PAGES = 6;

const USDA_LIST =
  "https://www.usda.gov/about-usda/news/press-releases";

const HHS_OIG_LIST =
  "https://oig.hhs.gov/newsroom/news-releases-articles/";

const NEWS_FEEDS = [
  { url: "https://justthenews.com/feed", office: "JustTheNews" },
  { url: "https://nypost.com/feed/", office: "nypost" },
  { url: "https://feeds.foxnews.com/foxnews/latest", office: "FoxNews" },
  { url: "https://www.washingtonexaminer.com/feed/", office: "dcexaminer" },
  { url: "https://dailycaller.com/feed/", office: "DailyCaller" },
  { url: "https://rss.politico.com/politics-news.xml", office: "politico" },
  {
    url: "https://news.google.com/rss/search?q=when:24h+(Medicare+OR+Medicaid+OR+SNAP+OR+WIC+OR+PPP+OR+EIDL+OR+Obamacare+OR+ACA+OR+%22improper+enrollment%22+OR+unemployment+OR+FEMA+OR+%22Section+8%22+OR+%22VA+benefits%22+OR+TANF+OR+asylum+OR+%22I-9%22+OR+%22nursing+diploma%22+OR+%22illegal+voting%22+OR+%22visa+fraud%22+OR+Nightingale)+(charged+OR+indicted+OR+sentenced+OR+enforcement+OR+canceled+OR+fraud)&hl=en-US&gl=US&ceid=US:en",
    office: null,
  },
];

const NEWS_OFFICE = [
  [/just the news|justthenews/i, "JustTheNews"],
  [/fox news/i, "FoxNews"],
  [/new york post|ny post/i, "nypost"],
  [/washington examiner/i, "dcexaminer"],
  [/daily caller/i, "DailyCaller"],
  [/\bassociated press\b|\bap\b/i, "AP"],
  [/reuters/i, "Reuters"],
  [/wall street journal|\bwsj\b/i, "WSJ"],
  [/politico/i, "politico"],
];

const KEEP =
  /medicare|medicaid|masshealth|medi-cal|children.?s health insurance|\bsnap\b|food[- ]stamp|\bebt\b|\bwic\b|school meals|child nutrition|national school lunch|\bppp\b|eidl|paycheck protection|cares act|(?:relief|loan|aid|program).{0,90}covid.?19|covid.?19.{0,90}(?:relief|loan|fraud|aid|ppp|eidl|business)|health care fraud|health-care fraud|healthcare fraud|benefit fraud|aca\b|affordable care|obamacare|improper enroll|phantom enroll|tax credit|visa fraud|\bh-2a\b|\bh-2b\b|\bh-1b\b|birth ?tourism|birthright|citizenship fraud|naturaliz|illegal(?:ly)? vot|unlawful(?:ly)? vot|voting by (an? )?aliens?|vot(?:ed|ing) as (an? )?aliens?|voted in the (?:\d{4} and )?\d{4} elections?|voter fraud|election fraud|election-related|false claims? (to|of).{0,20}citizenship|false statements? of.{0,20}citizenship|falsely claim(?:ing|ed)? .{0,40}citizenship|fraudulent registration|passport fraud|wire fraud|bank fraud|mail fraud|retailer.{0,40}(snap|disqualif|traffick)|traffick.{0,20}(snap|ebt|food.?stamp)|operation snap|bodega|diploma mill|nursing diploma|fraudulent (nursing|transcript|diploma)|fake diploma|operation nightingale|nursing school.{0,48}fraud|credential fraud|marriage fraud|unemployment (insur|benef|fraud|comp)|pandemic unemployment|\bpua\b|ui fraud|section 8|housing choice voucher|public housing|rental assistance|\bhud\b.{0,40}(fraud|charged|indicted|sentenced)|\bfema\b|disaster (relief|assist|loan|benefit|fraud)|asylum fraud|fraudulent asylum|humanitarian parole|parole fraud|\btps\b.{0,30}fraud|temporary protected status|adjustment of status|\bi-?9\b|e-verify|employment eligibility|fake (green.?card|social security|ssn|work (permit|doc))|counterfeit (green.?card|social security|work)|document mill|ssn mill|va (benefit|oig|disability|compensat|fraud)|veterans affairs|stolen valor|\btanf\b|cash assistance|temporary assistance for needy|workers['’]? ?comp|workers compensation|state disability (insur|fraud|benef)/i;

const DROP =
  /enticement of a minor|child (porn|sex|exploit|predator)|sexual (abus|exploit|assault)|rape\b|murder|homicide|manslaughter|carjack|armed robbery|fentanyl|heroin|methamphetamine|kidnapping|tortur|illegal reentry/i;

const IG_LISTS = [
  {
    office: "SBAOIG",
    url: "https://www.sba.gov/articles",
    host: /sba\.gov/i,
  },
  {
    office: "SSAOIG",
    url: "https://oig.ssa.gov/news-releases/",
    host: /oig\.ssa\.gov/i,
  },
  {
    office: "IRSCI",
    url: "https://www.irs.gov/compliance/criminal-investigation/criminal-investigation-press-releases",
    host: /irs\.gov/i,
  },
  {
    office: "DOLOIG",
    url: "https://www.oig.dol.gov/oigpressreleases.htm",
    host: /oig\.dol\.gov/i,
    path: /Press(%20| )Releases/i,
  },
  {
    office: "VAOIG",
    url: "https://www.vaoig.gov/investigative-updates",
    host: /vaoig\.gov|justice\.gov/i,
    path: /usao-.+\/pr\/|vaoig\.gov\/(sites|investigative)/i,
  },
];

const STATE_AG_FEEDS = [
  {
    office: "Raul_Labrador",
    url: "https://www.ag.idaho.gov/newsroom/category/medicaid-fraud/feed/",
  },
];

function loadJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

function strip(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#39;/g, "'")
    .replace(/'/g, "'")
    .replace(/"/g, '"')
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function unixMs(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return NaN;
  return n < 1e12 ? n * 1000 : n;
}

function slug(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

async function fetchText(url, ua = "FraudLedgerHarvest/1.0 (independent public record)") {
  const res = await fetch(url, {
    headers: { "user-agent": ua },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

function rssTag(chunk, tag) {
  const cdata = chunk.match(
    new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, "i"),
  );
  if (cdata) return cdata[1];
  const plain = chunk.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return plain ? plain[1] : "";
}

function parseRssItems(xml) {
  const items = [];
  for (const m of xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)) {
    const chunk = m[0];
    const title = strip(rssTag(chunk, "title"));
    const link = strip(
      rssTag(chunk, "link") ||
        (chunk.match(/<link[^>]+href="([^"]+)"/i) || [])[1] ||
        "",
    );
    const teaser = strip(
      `${rssTag(chunk, "description")} ${rssTag(chunk, "content:encoded")}`,
    );
    const pub = rssTag(chunk, "pubDate") || rssTag(chunk, "dc:date");
    const source = strip(rssTag(chunk, "source"));
    items.push({
      title,
      link,
      teaser: teaser.slice(0, 4000),
      when: Date.parse(pub),
      source,
    });
  }
  return items;
}

function newsOffice(item, fallback) {
  if (fallback) return fallback;
  const blob = `${item.source || ""} ${item.title || ""}`;
  for (const [re, office] of NEWS_OFFICE) {
    if (re.test(blob)) return office;
  }
  return null;
}

const DISTRICT_SEAT = {
  "usao-or": ["Portland, OR", 45.5152, -122.6784],
  "usao-ut": ["Salt Lake City, UT", 40.7608, -111.891],
  "usao-mdtn": ["Nashville, TN", 36.1627, -86.7816],
  "usao-ndal": ["Birmingham, AL", 33.5186, -86.8104],
  "usao-nm": ["Albuquerque, NM", 35.0844, -106.6504],
  "usao-wdwa": ["Tacoma, WA", 47.2529, -122.4443],
  "usao-edwa": ["Spokane, WA", 47.6588, -117.426],
  "usao-co": ["Denver, CO", 39.7392, -104.9903],
  "usao-edwi": ["Green Bay, WI", 44.5133, -88.0133],
  "usao-wdwi": ["Madison, WI", 43.0731, -89.4012],
  "usao-id": ["Boise, ID", 43.615, -116.2023],
  "usao-edva": ["Alexandria, VA", 38.8048, -77.0469],
  "usao-ct": ["Hartford, CT", 41.7658, -72.6734],
  "usao-md": ["Baltimore, MD", 39.2904, -76.6122],
  "usao-ndtx": ["Dallas, TX", 32.7767, -96.797],
  "usao-wdtx": ["San Antonio, TX", 29.4241, -98.4936],
  "usao-sdtx": ["Houston, TX", 29.7604, -95.3698],
  "usao-ma": ["Boston, MA", 42.3601, -71.0589],
  "usao-nj": ["Newark, NJ", 40.7357, -74.1724],
  "usao-edmi": ["Detroit, MI", 42.3314, -83.0458],
  "usao-mdpa": ["Harrisburg, PA", 40.2732, -76.8867],
  "usao-ndga": ["Atlanta, GA", 33.749, -84.388],
  "usao-sdny": ["New York, NY", 40.71, -74.01],
  "usao-edny": ["Brooklyn, NY", 40.6782, -73.9442],
  "usao-sdfl": ["Miami, FL", 25.7617, -80.1918],
  "usao-mdfl": ["Tampa, FL", 27.9506, -82.4572],
  "usao-cdca": ["Los Angeles, CA", 34.0522, -118.2437],
  "usao-ndca": ["San Francisco, CA", 37.7749, -122.4194],
  "usao-ndil": ["Chicago, IL", 41.8781, -87.6298],
  "usao-edpa": ["Philadelphia, PA", 39.9526, -75.1652],
  "usao-sdoh": ["Columbus, OH", 39.9612, -82.9988],
  "usao-wdmo": ["Kansas City, MO", 39.0997, -94.5783],
  "usao-edmo": ["St. Louis, MO", 38.627, -90.1994],
  "usao-wdpa": ["Pittsburgh, PA", 40.4406, -79.9959],
  "usao-wdnc": ["Charlotte, NC", 35.2271, -80.8431],
  "usao-az": ["Phoenix, AZ", 33.4484, -112.074],
  "usao-nv": ["Las Vegas, NV", 36.1699, -115.1398],
};

const PLACE_HINTS = [
  {
    re: /five boroughs|new york city|\bnyc\b|across new york(?:'s)?|bodegas.{0,60}new york|new york.{0,60}(bodega|five borough)/i,
    city: "New York City, NY",
    lat: 40.71,
    lon: -74.01,
  },
  { re: /\bbrooklyn\b/i, city: "Brooklyn, NY", lat: 40.6782, lon: -73.9442 },
  { re: /\bbronx\b/i, city: "Bronx, NY", lat: 40.8448, lon: -73.8648 },
  { re: /\bqueens\b/i, city: "Queens, NY", lat: 40.7282, lon: -73.7949 },
  { re: /\bmanhattan\b/i, city: "Manhattan, NY", lat: 40.7831, lon: -73.9712 },
  { re: /los angeles/i, city: "Los Angeles, CA", lat: 34.0522, lon: -118.2437 },
  { re: /\bchicago\b/i, city: "Chicago, IL", lat: 41.8781, lon: -87.6298 },
  { re: /south florida|fort lauderdale|\bplantation\b|west palm beach|lauderhill/i, city: "Fort Lauderdale, FL", lat: 26.1224, lon: -80.1373 },
  { re: /\bmiami\b/i, city: "Miami, FL", lat: 25.7617, lon: -80.1918 },
  { re: /\bhouston\b/i, city: "Houston, TX", lat: 29.7604, lon: -95.3698 },
  { re: /\bdallas\b/i, city: "Dallas, TX", lat: 32.7767, lon: -96.797 },
  { re: /\bphiladelphia\b/i, city: "Philadelphia, PA", lat: 39.9526, lon: -75.1652 },
  { re: /\batlanta\b/i, city: "Atlanta, GA", lat: 33.749, lon: -84.388 },
  { re: /\bboston\b/i, city: "Boston, MA", lat: 42.3601, lon: -71.0589 },
  { re: /\bdetroit\b/i, city: "Detroit, MI", lat: 42.3314, lon: -83.0458 },
  { re: /kansas city/i, city: "Kansas City, MO", lat: 39.0997, lon: -94.5783 },
  { re: /san tan valley|phoenix|arizona/i, city: "Phoenix, AZ", lat: 33.4484, lon: -112.074 },
  { re: /\bdel rio\b/i, city: "Del Rio, TX", lat: 29.3709, lon: -100.8959 },
  { re: /northern district of texas|fort worth/i, city: "Dallas, TX", lat: 32.7767, lon: -96.797 },
  { re: /western district of texas/i, city: "San Antonio, TX", lat: 29.4241, lon: -98.4936 },
  { re: /idaho falls/i, city: "Idaho Falls, ID", lat: 43.4927, lon: -112.0408 },
  { re: /kootenai|coeur d['’]?alene/i, city: "Coeur d'Alene, ID", lat: 47.6777, lon: -116.7805 },
  { re: /twin falls/i, city: "Twin Falls, ID", lat: 42.563, lon: -114.4609 },
  { re: /canyon county|nampa|caldwell/i, city: "Nampa, ID", lat: 43.5407, lon: -116.5635 },
  { re: /ada county|\bboise\b/i, city: "Boise, ID", lat: 43.615, lon: -116.2023 },
  { re: /district of idaho/i, city: "Boise, ID", lat: 43.615, lon: -116.2023 },
  { re: /northern district of georgia/i, city: "Atlanta, GA", lat: 33.749, lon: -84.388 },
  { re: /district of massachusetts/i, city: "Boston, MA", lat: 42.3601, lon: -71.0589 },
  { re: /western district of wisconsin/i, city: "Madison, WI", lat: 43.0731, lon: -89.4012 },
  { re: /district of new jersey/i, city: "Newark, NJ", lat: 40.7357, lon: -74.1724 },
  { re: /eastern district of michigan/i, city: "Detroit, MI", lat: 42.3314, lon: -83.0458 },
];

function seatFromUrl(url) {
  const m = String(url).match(/usao-([a-z0-9]+)/i);
  if (!m) return null;
  const key = `usao-${m[1].toLowerCase()}`;
  const hit = DISTRICT_SEAT[key];
  if (!hit) return null;
  return { city: hit[0], lat: hit[1], lon: hit[2] };
}

function placeFromText(blob) {
  for (const p of PLACE_HINTS) {
    if (p.re.test(blob)) return { city: p.city, lat: p.lat, lon: p.lon };
  }
  return null;
}

function isSweep(blob) {
  return /operation\s+\w+.{0,48}(snap|fraud|retailer|bodega|nightingale|diploma)|(\d+)\s+retailers|SNAP.{0,40}enforcement|enforcement.{0,40}SNAP|disqualif\w*.{0,48}(snap|retailer)|undercover.{0,40}(bodega|snap|retailer)|diploma mill|nursing diploma|fake diploma/i.test(
    blob,
  );
}

function geoFor(item) {
  return (
    seatFromUrl(item.link) ||
    placeFromText(item.title) ||
    placeFromText(`${item.title} ${item.teaser || ""}`)
  );
}

function geoNearName(blob, name) {
  const text = String(blob);
  const at = text.toLowerCase().indexOf(String(name).toLowerCase());
  if (at < 0) return null;
  let hit = null;
  for (const p of PLACE_HINTS) {
    const re = new RegExp(p.re.source, "gi");
    for (const m of text.matchAll(re)) {
      if (m.index <= at) hit = { city: p.city, lat: p.lat, lon: p.lon };
    }
  }
  return hit;
}

function viaFor(office, official) {
  if (/usda\.gov/i.test(official)) return "USDA press";
  if (/hhs\.gov/i.test(official)) return "HHS OIG press";
  if (/ag\.idaho\.gov/i.test(official) || office === "Raul_Labrador") {
    return "Idaho AG press";
  }
  if (office === "SBAOIG") return "SBA OIG press";
  if (office === "SSAOIG") return "SSA OIG press";
  if (office === "IRSCI") return "IRS-CI press";
  if (office === "DOLOIG") return "DOL OIG press";
  if (office === "VAOIG") return "VA OIG press";
  if (/hud\.gov|hudoig/i.test(official)) return "HUD press";
  if (/fema\.gov/i.test(official)) return "FEMA press";
  if (!isOfficialHost(official)) return `${office} RSS`;
  return "DOJ press feed";
}

function originFor(blob, official) {
  if (/illegal(?:ly)? vot|unlawful(?:ly)? vot|voting by (an? )?aliens?|vot(?:ed|ing) as (an? )?aliens?|voted in the (?:\d{4} and )?\d{4} elections?|voter fraud|election fraud|election-related|noncitizen vot|non-citizen vot|false claims? (to|of).{0,20}citizenship|false statements? of.{0,20}citizenship|falsely claim(?:ing|ed)? .{0,40}citizenship|fraudulent registration/i.test(blob)) {
    return "Voting / elections";
  }
  if (/\bwic\b|school meals|child nutrition|national school lunch/i.test(blob)) {
    return "WIC / child nutrition";
  }
  if (/usda\.gov/i.test(official) || /\bsnap\b|food[- ]stamp|\bebt\b/i.test(blob)) {
    return "SNAP / food stamps";
  }
  if (/nurs|diploma|nightingale|license|credential/i.test(blob) && !/medicaid|medicare/i.test(blob)) {
    return "Health care / nursing credentials";
  }
  if (/aca\b|affordable care|obamacare|improper enroll|phantom enroll/i.test(blob)) {
    return "ACA subsidies";
  }
  if (/medicare|medicaid|masshealth|medi-cal|children.?s health insurance/i.test(blob)) {
    return "Medicare / Medicaid";
  }
  if (/unemployment|\bpua\b|ui fraud|pandemic unemployment/i.test(blob)) {
    return "Unemployment insurance";
  }
  if (/section 8|housing choice|public housing|rental assistance|\bhud\b/i.test(blob)) {
    return "HUD / housing";
  }
  if (/\bfema\b|disaster (relief|assist|loan|benefit)/i.test(blob)) {
    return "FEMA / disaster relief";
  }
  if (/va (benefit|disability|compensat)|veterans affairs|stolen valor/i.test(blob)) {
    return "VA benefits";
  }
  if (/\btanf\b|cash assistance|temporary assistance for needy/i.test(blob)) {
    return "TANF / cash assistance";
  }
  if (/\bi-?9\b|e-verify|employment eligibility|fake (green.?card|ssn|social security)|document mill/i.test(blob)) {
    return "I-9 / work documents";
  }
  if (/asylum|humanitarian parole|parole fraud|temporary protected status|adjustment of status|\bh-2[ab]\b|visa fraud|marriage fraud/i.test(blob)) {
    return "Visa / immigration status";
  }
  return "Federal program (see release)";
}

function buildRow(item, office, name, geo) {
  const blob = `${item.title} ${item.teaser || ""}`;
  const op = operationName(item.title);
  const picked = Number.isFinite(item.when)
    ? new Date(item.when).toLocaleDateString("en-US")
    : "";
  const sweep = isSweep(blob);
  const official = officialUrl(blob) || item.link;
  const news = !isOfficialHost(official);
  const agency = /usda\.gov/i.test(official)
    ? "USDA"
    : /hhs\.gov/i.test(official)
      ? "HHS OIG"
      : /ag\.idaho\.gov/i.test(official) || office === "Raul_Labrador"
        ? "Idaho Attorney General"
        : office === "SBAOIG"
        ? "SBA OIG"
        : office === "SSAOIG"
          ? "SSA OIG"
          : office === "IRSCI"
            ? "IRS Criminal Investigation"
            : office === "DOLOIG"
              ? "DOL OIG"
              : office === "VAOIG"
                ? "VA OIG"
                : /fema\.gov/i.test(official)
                  ? "FEMA"
                  : /hud\.gov/i.test(official)
                    ? "HUD"
                    : news
                      ? "verified news citing official press"
                      : "Justice Department";
  const voting =
    /illegal(?:ly)? vot|unlawful(?:ly)? vot|voting by (an? )?aliens?|vot(?:ed|ing) as (an? )?aliens?|voted in the (?:\d{4} and )?\d{4} elections?|voter fraud|election fraud|election-related|noncitizen vot|non-citizen vot|false claims? (to|of).{0,20}citizenship|false statements? of.{0,20}citizenship|falsely claim(?:ing|ed)? .{0,40}citizenship|fraudulent registration/i.test(
      blob,
    );
  return {
    name,
    city: geo.city,
    crime: item.title,
    usa: item.title,
    foreign: "Not stated in post",
    picked,
    entered: "Amount not stated",
    office,
    // Full source URL + person, hashed: unique across releases that share a
    // long slug prefix, and stable run to run (see scripts/ledger-id.mjs).
    id: rowId(official, name),
    when: Number.isFinite(item.when)
      ? new Date(item.when).toISOString().slice(0, 10)
      : "",
    text: `${item.title}. ${String(item.teaser || "").slice(0, 800)} Source: official ${agency} press. ${
      sweep
        ? "Named scheme / enforcement sweep. Individual stores or defendants are listed only if the release names them. Administrative penalties are not convictions."
        : "Charges are allegations unless the page says convicted or a guilty plea."
    } Presence not stated unless the page says so.`,
    photo: "",
    via: viaFor(office, official),
    sourceUrl: official,
    voting,
    origin: originFor(blob, official),
    confirmedBy: news
      ? "gov-amplified press"
      : office === "Raul_Labrador"
        ? "local LE"
        : "DOJ",
    lat: geo.lat,
    lon: geo.lon,
    presence: "not_stated",
    scheme: (op || name || item.title).slice(0, 80),
    // Full release URL hashed, no name: co-defendants share it, releases
    // that share a long slug prefix don't (see scripts/ledger-id.mjs).
    schemeId: op ? `op-${slug(op)}` : schemeIdFor(official),
  };
}

function rowsFromItem(item, office) {
  const blob = `${item.title} ${item.teaser || ""}`;
  const people = allPeople(item.title, item.teaser || "");
  const op = operationName(item.title);
  const names = people.length ? people : op ? [op] : [];
  if (!names.length) {
    const entity = personOrEntity(item.title, item.teaser || "");
    if (entity) names.push(entity.name);
  }
  if (!names.length) return [];
  const fallback = geoFor(item);
  const out = [];
  for (const raw of names) {
    const name = String(raw).slice(0, 120);
    if (looksLikeHeadline(name) && !op) continue;
    const geo = geoNearName(blob, name) || fallback;
    if (!geo) continue;
    out.push(buildRow(item, office, name, geo));
  }
  return out;
}

function keepBlob(title, teaser) {
  const blob = `${title} ${teaser || ""}`;
  if (
    /enticement of a minor|child (porn|sex|exploit|predator)|sexual (abus|exploit|assault)|rape\b/i.test(
      blob,
    )
  ) {
    return false;
  }
  if (DROP.test(blob) && !KEEP.test(blob)) return false;
  if (KEEP.test(title)) return true;
  if (/^podcasts?$/i.test(title.trim())) return false;
  return KEEP.test(teaser || "");
}

function rewriteExisting(r) {
  // Only headline-style names get rewritten. A real name is left alone:
  // rewriting it to the release's first defendant turned co-defendants
  // into copies of one person (the duplicate rows on the live ledger).
  if (!looksLikeHeadline(r.name)) return r;
  const next = rewriteHarvestName(r.name, r.crime || r.name, r.text || "");
  if (!next) return null;
  if (next === r.name) return r;
  return { ...r, name: next, scheme: looksLikeHeadline(r.scheme || "") ? next : r.scheme };
}

function ingest(existing, have, added, item, office) {
  if (!item.title || !item.link) return;
  if (Number.isFinite(item.when) && item.when < CUTOFF) return;
  if (!keepBlob(item.title, item.teaser || "")) return;
  const rows = rowsFromItem(item, office);
  for (const row of rows) {
    const key = `${row.sourceUrl}|${row.id}`;
    if (have.has(key)) continue;
    have.add(key);
    existing.push(row);
    added.push(row.name);
  }
}

async function harvestDoj(existing, have, added) {
  let scanned = 0;
  for (let page = 0; page < DOJ_PAGES; page++) {
    const url = `${DOJ_API}&page=${page}`;
    let payload;
    try {
      payload = JSON.parse(await fetchText(url));
    } catch (e) {
      console.error("DOJ API skip", page, String(e));
      break;
    }
    const results = Array.isArray(payload?.results) ? payload.results : [];
    if (!results.length) break;
    for (const r of results) {
      scanned += 1;
      ingest(
        existing,
        have,
        added,
        {
          title: strip(String(r.title || "")),
          teaser: strip(String(r.teaser || r.body || "")),
          link: String(r.url || "").trim(),
          when: unixMs(r.date),
        },
        "TheJusticeDept",
      );
    }
  }
  return scanned;
}

async function harvestUsda(existing, have, added) {
  let html;
  try {
    html = await fetchText(USDA_LIST);
  } catch (e) {
    console.error("USDA list skip", String(e));
    return 0;
  }
  const hrefs = [
    ...html.matchAll(
      /href="(https?:\/\/www\.usda\.gov\/about-usda\/news\/press-releases\/20\d{2}\/\d{2}\/\d{2}\/[^"]+)"/gi,
    ),
  ].map((m) => m[1]);
  const rel = [
    ...html.matchAll(
      /href="(\/about-usda\/news\/press-releases\/20\d{2}\/\d{2}\/\d{2}\/[^"]+)"/gi,
    ),
  ].map((m) => `https://www.usda.gov${m[1]}`);
  const urls = [...new Set([...hrefs, ...rel])].slice(0, 20);
  let scanned = 0;
  for (const url of urls) {
    scanned += 1;
    let page = "";
    try {
      page = await fetchText(url);
    } catch (e) {
      console.error("USDA page skip", String(e));
      continue;
    }
    const title =
      strip(
        (page.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
          page.match(/<title>([^<]+)<\/title>/i) ||
          [])[1] || "",
      )
        .replace(/\s*\|\s*USDA.*$/i, "")
        .trim() || url;
    const body = strip(page).slice(0, 4000);
    const dm = url.match(/press-releases\/(\d{4})\/(\d{2})\/(\d{2})/);
    const when = dm ? Date.parse(`${dm[1]}-${dm[2]}-${dm[3]}T12:00:00Z`) : NaN;
    ingest(
      existing,
      have,
      added,
      { title, teaser: body, link: url, when },
      "USDAnews",
    );
  }
  return scanned;
}

async function harvestHhsOig(existing, have, added) {
  let html;
  try {
    html = await fetchText(HHS_OIG_LIST);
  } catch (e) {
    console.error("HHS OIG list skip", String(e));
    return 0;
  }
  const hrefs = [
    ...html.matchAll(/href="(https?:\/\/oig\.hhs\.gov\/[^"]+)"/gi),
  ].map((m) => m[1]);
  const rel = [...html.matchAll(/href="(\/newsroom\/[^"]+)"/gi)].map(
    (m) => `https://oig.hhs.gov${m[1]}`,
  );
  const urls = [...new Set([...hrefs, ...rel])]
    .filter(
      (u) =>
        /newsroom\/(news-releases|fraud|enforcement|oa)/i.test(u) &&
        !/podcast/i.test(u) &&
        !/news-releases-articles\/?$/i.test(u),
    )
    .slice(0, 16);
  let scanned = 0;
  for (const url of urls) {
    scanned += 1;
    let page = "";
    try {
      page = await fetchText(url);
    } catch (e) {
      console.error("HHS OIG page skip", String(e));
      continue;
    }
    const title =
      strip(
        (page.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
          page.match(/<title>([^<]+)<\/title>/i) ||
          [])[1] || "",
      )
        .replace(/\s*\|\s*.*$/, "")
        .trim() || url;
    const body = strip(page).slice(0, 4000);
    const dm = url.match(/\/(20\d{2})\/(\d{2})\/(\d{2})\//);
    const when = dm ? Date.parse(`${dm[1]}-${dm[2]}-${dm[3]}T12:00:00Z`) : NaN;
    ingest(
      existing,
      have,
      added,
      { title, teaser: body, link: url, when },
      "HHSOIG",
    );
  }
  return scanned;
}

async function harvestIgLists(existing, have, added) {
  let scanned = 0;
  for (const ig of IG_LISTS) {
    let html;
    try {
      html = await fetchText(ig.url);
    } catch (e) {
      console.error("IG list skip", ig.office, String(e));
      continue;
    }
    const hrefs = [...html.matchAll(/href="(https?:\/\/[^"]+)"/gi)].map((m) => m[1]);
    const rel = [...html.matchAll(/href="(\/[^"]+)"/gi)].map((m) => {
      try {
        return new URL(m[1], ig.url).href;
      } catch {
        return "";
      }
    });
    const urls = [...new Set([...hrefs, ...rel])]
      .filter((u) => {
        if (!ig.host.test(u)) return false;
        if (/\/articles\/?$/i.test(u) || /\/news-releases\/?$/i.test(u)) return false;
        if (/criminal-investigation-press-releases\/?$/i.test(u)) return false;
        if (ig.path) return ig.path.test(u);
        return /article\/|news-releases\/|press-release|oig|ppp|fraud/i.test(u);
      })
      .slice(0, 12);
    for (const url of urls) {
      scanned += 1;
      let page = "";
      try {
        page = await fetchText(url);
      } catch {
        continue;
      }
      const title =
        strip(
          (page.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
            page.match(/<title>([^<]+)<\/title>/i) ||
            [])[1] || "",
        )
          .replace(/\s*\|\s*.*$/, "")
          .trim() || url;
      ingest(
        existing,
        have,
        added,
        { title, teaser: strip(page).slice(0, 4000), link: url, when: NaN },
        ig.office,
      );
    }
  }
  return scanned;
}

async function harvestStateAg(existing, have, added) {
  let scanned = 0;
  for (const feed of STATE_AG_FEEDS) {
    let xml = "";
    try {
      xml = await fetchText(feed.url);
    } catch (e) {
      console.error("state AG feed skip", feed.office, String(e));
      continue;
    }
    for (const item of parseRssItems(xml)) {
      scanned += 1;
      ingest(
        existing,
        have,
        added,
        {
          title: item.title.replace(/\s+-\s+Idaho Office of Attorney General\s*$/i, "").trim(),
          teaser: item.teaser,
          link: item.link,
          when: item.when,
        },
        feed.office,
      );
    }
  }
  return scanned;
}

async function harvestNews(existing, have, added) {
  let scanned = 0;
  for (const feed of NEWS_FEEDS) {
    let xml = "";
    try {
      xml = await fetchText(
        feed.url,
        "Mozilla/5.0 FraudLedgerHarvest/1.0 (independent public record)",
      );
    } catch (e) {
      console.error("news feed skip", feed.office || "google", String(e));
      continue;
    }
    for (const item of parseRssItems(xml)) {
      scanned += 1;
      const office = newsOffice(item, feed.office);
      if (!office) continue;
      if (!item.title || !item.link) continue;
      if (!newsHasChargingPaper(item.link, item.teaser || item.title)) continue;
      ingest(
        existing,
        have,
        added,
        {
          title: item.title.replace(/\s+-\s+(Just the News|Fox News|New York Post|Washington Examiner|Daily Caller|Associated Press|Reuters|Politico|Wall Street Journal)\s*$/i, "").trim(),
          teaser: item.teaser,
          link: item.link,
          when: item.when,
        },
        office,
      );
    }
  }
  return scanned;
}

async function main() {
  const existing = loadJson(HARVEST, []).map(rewriteExisting).filter(Boolean);
  const have = new Set(
    existing.map((r) => `${r.sourceUrl || ""}|${r.id || ""}`),
  );
  const added = [];
  const doj = await harvestDoj(existing, have, added);
  const usda = await harvestUsda(existing, have, added);
  const hhs = await harvestHhsOig(existing, have, added);
  const ig = await harvestIgLists(existing, have, added);
  const stateAg = await harvestStateAg(existing, have, added);
  const news = await harvestNews(existing, have, added);
  const kept = existing.filter((r) => {
    if (looksLikeHeadline(r.name)) return false;
    return isKeepRow(r.name, r.crime || r.name, r.text || "");
  });
  const scanned = doj + usda + hhs + ig + stateAg + news;

  writeFileSync(HARVEST, `${JSON.stringify(kept, null, 2)}\n`);
  writeFileSync(
    STATUS,
    `${JSON.stringify(
      {
        checkedAt: Date.now(),
        added,
        enriched: [],
        scanned,
        note: "Hourly: justice.gov + USDA + HHS/SBA/SSA/IRS/DOL/VA OIG + Idaho AG Medicaid-fraud newsroom + verified news that cites an official charging paper. Headline-only rows dropped. Named people and named operations kept.",
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    `scanned ${scanned} (doj ${doj}, usda ${usda}, hhs ${hhs}, ig ${ig}, stateAg ${stateAg}, news ${news}); added ${added.length}; harvest ${kept.length}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

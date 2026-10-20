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
import { nameKey } from "./ledger-dedupe.mjs";

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
  /medicare|medicaid|masshealth|medi-cal|children.?s health insurance|\bsnap\b|food[- ]stamp|\bebt\b|\bwic\b|school meals|child nutrition|national school lunch|\bppp\b|eidl|paycheck protection|cares act|(?:relief|loan|aid|program).{0,90}covid.?19|covid.?19.{0,90}(?:relief|loan|fraud|aid|ppp|eidl|business)|health care fraud|health-care fraud|healthcare fraud|benefit fraud|aca\b|affordable care|obamacare|improper enroll|phantom enroll|tax credit|visa fraud|\bh-2a\b|\bh-2b\b|\bh-1b\b|birth ?tourism|birthright|citizenship fraud|naturaliz|illegal(?:ly)? vot|unlawful(?:ly)? vot|voting by (an? )?aliens?|vot(?:ed|ing) as (an? )?aliens?|voted in the (?:\d{4} and )?\d{4} elections?|voter fraud|election fraud|election-related|false claims? (to|of).{0,20}citizenship|false statements? of.{0,20}citizenship|falsely claim(?:ing|ed)? .{0,40}citizenship|fraudulent registration|fraudulent(?:ly)? (?:voter )?regist|election crimes?|operation protect the vote|passport fraud|retailer.{0,40}(snap|disqualif|traffick)|traffick.{0,20}(snap|ebt|food.?stamp)|operation snap|bodega|diploma mill|nursing diploma|fraudulent (nursing|transcript|diploma)|fake diploma|operation nightingale|nursing school.{0,48}fraud|credential fraud|marriage fraud|unemployment (insur|benef|fraud|comp)|pandemic unemployment|\bpua\b|ui fraud|section 8|housing choice voucher|public housing|rental assistance|\bhud\b.{0,40}(fraud|charged|indicted|sentenced)|\bfema\b|disaster (relief|assist|loan|benefit|fraud)|asylum fraud|fraudulent asylum|humanitarian parole|parole fraud|\btps\b.{0,30}fraud|temporary protected status|adjustment of status|\bi-?9\b|e-verify|employment eligibility|fake (green.?card|social security|ssn|work (permit|doc))|counterfeit (green.?card|social security|work)|document mill|ssn mill|va (benefit|oig|disability|compensat|fraud)|veterans affairs|stolen valor|\btanf\b|cash assistance|temporary assistance for needy|workers['’]? ?comp|workers compensation|state disability (insur|fraud|benef)|pandemic relief|pandemic(?:[- ]era)?(?: and \w+)? (?:relief |loan |benefits? )?fraud|covid.?19 relief|employee retention credits?|\bercs?\b|sick and family leave credits?|tax shelter|theft of (?:government|public) (?:money|funds|property|benefits)|false claims act|fraud against taxpayers act|overbill\w*.{0,60}(?:postal service|usps|government|federal|army|navy|air force|military|agency|program)|(?:postal service|usps|government|federal) .{0,40}overbill|sham marriage|immigration (?:document )?fraud|fraud and misuse of visas/i;

// 2026-10-20: "wire fraud | bank fraud | mail fraud" were removed from KEEP. On their own they put
// private-victim schemes (investors, banks, elderly victims) on the ledger whenever the district had a
// map pin. The ledger covers government-program fraud: a release now needs a program term above.

// Government money that is not a named benefit program: taxes and public funds (Krennic 2026-10-20: "keep
// government-money cases: stolen U.S. Treasury check, state agency, MBTA, tax ..."). Specific phrases only,
// so "IRS Criminal Investigation" credits on a private-victim case do not count.
const GOV_MONEY =
  /tax evasion|evad(?:e|ed|ing) (?:federal |income |payroll |employment )?taxes|(?:false|fraudulent|bogus) (?:federal |income |individual |corporate )?tax returns?|tax fraud|tax[- ]refund fraud|fraudulent (?:tax )?refunds?|employment tax|payroll tax(?:es)? (?:fraud|evasion|scheme)|trust fund taxes|fail(?:ed|ing|ure) to (?:pay|collect|account for)(?: over)? (?:payroll |employment |federal )?taxes|(?:return|tax) preparer|conspiracy to defraud the United States|defraud(?:ing)? the (?:United States|IRS|Internal Revenue Service|government)|(?:U\.S\.|United States) Treasury checks?|stolen treasury checks?|theft of (?:government|public) (?:money|funds|property)|major fraud against the United States|(?:false|fraudulent) (?:documents?|statements?|claims?|records?) (?:to|with) the (?:\w+ )?(?:Department|Division|Bureau) of/i;
// Weaker words (public money, a public agency) count only on a crime release, so an SBA grant announcement or a
// page footer does not.
const GOV_MONEY_WEAK = /(?:public|taxpayer|government) funds|government contracts?|transit authority|\bmbta\b/i;
const CRIME_TITLE = /fraud|defraud|stole|steal|theft|embezzl|false|kickback|brib|sentenced|pleads?|pleaded|charged|indicted|convicted|guilty/i;
function govMoney(title, text) {
  return GOV_MONEY.test(text) || (CRIME_TITLE.test(title) && GOV_MONEY_WEAK.test(text));
}

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

export function strip(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&rsquo;|&lsquo;/g, "’")
    .replace(/&rdquo;|&ldquo;/g, "”")
    .replace(/&ndash;|&mdash;/g, "–")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
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
  "usao-ndny": ["Albany, NY", 42.6526, -73.7562],
  "usao-ednc": ["Raleigh, NC", 35.7796, -78.6382],
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
  "usao-edca": ["Sacramento, CA", 38.5816, -121.4944],
  "usao-sdca": ["San Diego, CA", 32.7157, -117.1611],
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
  // Every other U.S. Attorney's office (seat city). Before 2026-10-20 a release from a district missing
  // here produced no row at all (no map pin), which silently dropped e.g. D. Kan., S.D. Ind., D. Haw.
  "usao-mdal": ["Montgomery, AL", 32.3792, -86.3077],
  "usao-sdal": ["Mobile, AL", 30.6954, -88.0399],
  "usao-ak": ["Anchorage, AK", 61.2181, -149.9003],
  "usao-edar": ["Little Rock, AR", 34.7465, -92.2896],
  "usao-wdar": ["Fort Smith, AR", 35.3859, -94.3985],
  "usao-de": ["Wilmington, DE", 39.7391, -75.5398],
  "usao-dc": ["Washington, DC", 38.9072, -77.0369],
  "usao-ndfl": ["Tallahassee, FL", 30.4383, -84.2807],
  "usao-mdga": ["Macon, GA", 32.8407, -83.6324],
  "usao-sdga": ["Savannah, GA", 32.0809, -81.0912],
  "usao-gu": ["Hagatna, GU", 13.4757, 144.7489],
  "usao-hi": ["Honolulu, HI", 21.3069, -157.8583],
  "usao-cdil": ["Springfield, IL", 39.7817, -89.6501],
  "usao-sdil": ["Fairview Heights, IL", 38.5889, -89.9904],
  "usao-ndin": ["South Bend, IN", 41.6764, -86.252],
  "usao-sdin": ["Indianapolis, IN", 39.7684, -86.1581],
  "usao-ndia": ["Cedar Rapids, IA", 41.9779, -91.6656],
  "usao-sdia": ["Des Moines, IA", 41.5868, -93.625],
  "usao-ks": ["Wichita, KS", 37.6872, -97.3301],
  "usao-edky": ["Lexington, KY", 38.0406, -84.5037],
  "usao-wdky": ["Louisville, KY", 38.2527, -85.7585],
  "usao-edla": ["New Orleans, LA", 29.9511, -90.0715],
  "usao-mdla": ["Baton Rouge, LA", 30.4515, -91.1871],
  "usao-wdla": ["Shreveport, LA", 32.5252, -93.7502],
  "usao-me": ["Portland, ME", 43.6591, -70.2568],
  "usao-wdmi": ["Grand Rapids, MI", 42.9634, -85.6681],
  "usao-mn": ["Minneapolis, MN", 44.9778, -93.265],
  "usao-ndms": ["Oxford, MS", 34.3665, -89.5192],
  "usao-sdms": ["Jackson, MS", 32.2988, -90.1848],
  "usao-mt": ["Billings, MT", 45.7833, -108.5007],
  "usao-ne": ["Omaha, NE", 41.2565, -95.9345],
  "usao-nh": ["Concord, NH", 43.2081, -71.5376],
  "usao-wdny": ["Buffalo, NY", 42.8864, -78.8784],
  "usao-mdnc": ["Greensboro, NC", 36.0726, -79.792],
  "usao-nd": ["Fargo, ND", 46.8772, -96.7898],
  "usao-nmi": ["Saipan, MP", 15.1778, 145.7508],
  "usao-ndoh": ["Cleveland, OH", 41.4993, -81.6944],
  "usao-edok": ["Muskogee, OK", 35.7479, -95.3697],
  "usao-ndok": ["Tulsa, OK", 36.154, -95.9928],
  "usao-wdok": ["Oklahoma City, OK", 35.4676, -97.5164],
  "usao-pr": ["San Juan, PR", 18.4655, -66.1057],
  "usao-ri": ["Providence, RI", 41.824, -71.4128],
  "usao-sc": ["Columbia, SC", 34.0007, -81.0348],
  "usao-sd": ["Sioux Falls, SD", 43.5446, -96.7311],
  "usao-edtn": ["Knoxville, TN", 35.9606, -83.9207],
  "usao-wdtn": ["Memphis, TN", 35.1495, -90.049],
  "usao-edtx": ["Plano, TX", 33.0198, -96.6989],
  "usao-vt": ["Burlington, VT", 44.4759, -73.2121],
  "usao-vi": ["St. Thomas, VI", 18.3381, -64.8941],
  "usao-wdva": ["Roanoke, VA", 37.271, -79.9414],
  "usao-ndwv": ["Wheeling, WV", 40.064, -80.7209],
  "usao-sdwv": ["Charleston, WV", 38.3498, -81.6326],
  "usao-wy": ["Cheyenne, WY", 41.14, -104.8202],
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
  { re: /\bsacramento\b|eastern district of california/i, city: "Sacramento, CA", lat: 38.5816, lon: -121.4944 },
  { re: /central district of california/i, city: "Los Angeles, CA", lat: 34.0522, lon: -118.2437 },
  { re: /northern district of california/i, city: "San Francisco, CA", lat: 37.7749, lon: -122.4194 },
  { re: /southern district of california/i, city: "San Diego, CA", lat: 32.7157, lon: -117.1611 },
  { re: /las vegas/i, city: "Las Vegas, NV", lat: 36.1699, lon: -115.1398 },
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
    (item.seat ? seatFromUrl(item.seat) : null) ||
    placeFromText(item.title) ||
    placeFromText(`${item.title} ${item.teaser || ""}`)
  );
}

function geoNearName(blob, name) {
  const text = String(blob);
  const at = text.toLowerCase().indexOf(String(name).toLowerCase());
  if (at < 0) return null;
  // The place named closest before the defendant wins (a roundup's section header, e.g.
  // "Eastern District of California", beats an earlier "Central District of California").
  let hit = null;
  let best = -1;
  for (const p of PLACE_HINTS) {
    const re = new RegExp(p.re.source, "gi");
    for (const m of text.matchAll(re)) {
      if (m.index <= at && m.index > best) {
        best = m.index;
        hit = { city: p.city, lat: p.lat, lon: p.lon };
      }
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
  if (/dhs\.gov/i.test(official)) return "DHS press";
  if (/fema\.gov/i.test(official)) return "FEMA press";
  if (!isOfficialHost(official)) return `${office} RSS`;
  return "DOJ press feed";
}

function originFor(rawBlob, official) {
  const blob = programText(rawBlob);
  if (/illegal(?:ly)? vot|unlawful(?:ly)? vot|voting by (an? )?aliens?|vot(?:ed|ing) as (an? )?aliens?|voted in the (?:\d{4} and )?\d{4} elections?|voter fraud|election fraud|election-related|noncitizen vot|non-citizen vot|false claims? (to|of).{0,20}citizenship|false statements? of.{0,20}citizenship|falsely claim(?:ing|ed)? .{0,40}citizenship|fraudulent registration/i.test(blob)) {
    return "Voting / elections";
  }
  if (/naturaliz|passport fraud|citizenship fraud|immigration (?:document )?fraud|sham marriage|fraud and misuse of visas/i.test(blob) && !/medicare|medicaid|unemployment|\bppp\b|eidl|\bsnap\b/i.test(blob)) {
    return /\bi-?9\b|employment eligibility/i.test(blob) ? "I-9 / work documents" : "Visa / immigration status";
  }
  if (/\bwic\b|school meals|child nutrition|national school lunch/i.test(blob)) {
    return "WIC / child nutrition";
  }
  if (/usda\.gov/i.test(official) || /\bsnap\b|food[- ]stamp|\bebt\b/i.test(blob)) {
    return "SNAP / food stamps";
  }
  if (/nurs(?:e|es|ing)\b|diploma|nightingale|\blicen[cs]e\b|credential/i.test(blob) && !/medicaid|medicare/i.test(blob)) {
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

/**
 * The release's own words for one defendant in a roundup: from the name up to the next named
 * defendant or the next "<X> District of <State>" section header (max 700 chars). Verbatim.
 */
export function ownLine(teaser, name, names = []) {
  const text = String(teaser || "");
  const at = text.indexOf(name);
  if (at < 0) return "";
  let end = Math.min(text.length, at + 700);
  for (const other of names) {
    if (other === name) continue;
    const j = text.indexOf(other, at + name.length);
    if (j > at && j < end) end = j;
  }
  const rest = text.slice(at + name.length, end);
  const hdr = rest.search(/\s(?:(?:Central|Eastern|Northern|Southern|Western|Middle)\s+)?District of [A-Z]/);
  if (hdr >= 0) end = at + name.length + hdr;
  return text.slice(at, end).trim();
}

/** The DOJ nationality wording for the defendant, exactly as written ("a Belizean national",
 *  "a Mexico national", "a citizen of the Philippines"). Never inferred. */
export function nationalityAsPosted(line, name) {
  const s = String(line || "");
  if (!s.startsWith(name)) return "";
  const m = s.slice(name.length).match(
    /^,\s*\d{1,3},\s*(?:a\.k\.a\.\s*[“"][^”"]+[”"]\s*,?\s*)?((?:a|an)\s+(?:citizen of (?:the\s+)?\p{Lu}[\p{L}]*(?:\s\p{Lu}[\p{L}]*)*|\p{Lu}[\p{L}]*(?:\s\p{Lu}[\p{L}]*)*\s+national))(?=[\s,.])/u,
  );
  return m ? m[1] : "";
}

function buildRow(item, office, name, geo, names = [name]) {
  const blob = `${item.title} ${item.teaser || ""}`;
  const line = names.length > 1 ? ownLine(item.teaser || "", name, names) : "";
  const nationality = nationalityAsPosted(line || ownLine(item.teaser || "", name, names), name);
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
                    : /dhs\.gov/i.test(official)
                    ? "DHS"
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
    text: `${item.title}. ${line ? `As posted for this defendant: ${line} ` : ""}${String(item.teaser || "").slice(0, 800)} Source: official ${agency} press. ${item.stage === "Charged" ? "Stage: Charged (not convicted). " : item.stage ? `Stage: ${item.stage}. ` : ""}${
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
      : /\/\/(?:www\.)?(?:dhs|ice)\.gov\//i.test(official)
        ? "DHS"
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
    ...(nationality ? { nationality } : {}),
    ...(item.stage ? { stage: item.stage } : {}),
  };
}

export function rowsFromItem(item, office) {
  const blob = `${item.title} ${item.teaser || ""}`;
  // A seed (or a cross-posted Invasion Update row) may list its defendants explicitly; each must appear
  // verbatim in the teaser, so the row still quotes the release's own words for that person.
  const listed = Array.isArray(item.names) ? item.names.filter((n) => n && String(item.teaser || "").includes(n)) : null;
  const people = listed && listed.length ? listed : allPeople(item.title, item.teaser || "");
  const op = operationName(item.title);
  const names = people.length ? people : op ? [op] : [];
  if (!names.length) {
    const entity = personOrEntity(item.title, item.teaser || "");
    if (entity) names.push(entity.name);
  }
  if (!names.length) return [];
  const fallback = geoFor(item) || item.geo || null;
  const out = [];
  for (const raw of names) {
    const name = String(raw).slice(0, 120);
    if (looksLikeHeadline(name) && !op) continue;
    const geo = geoNearName(blob, name) || fallback;
    if (!geo) continue;
    out.push(buildRow(item, office, name, geo, names));
  }
  return out;
}

/**
 * Servicemember-rights civil cases (SCRA / USERRA settlements: interest-rate caps, foreclosures,
 * lease terminations, reemployment) are not fraud. They are kept out unless the same release
 * also speaks of fraud, false claims, kickbacks, false statements, theft or embezzlement.
 */
const SERVICEMEMBER_RIGHTS =
  /servicemembers['’]? civil relief act|\bSCRA\b|servicemembers['’]? rights|uniformed services employment and reemployment rights act|\bUSERRA\b/i;
const FRAUD_WORDS = /fraud|false claims?|kickback|false statements?|embezzl|theft|\bstole\b|brib/i;
export function isServicememberRightsCase(blob) {
  return SERVICEMEMBER_RIGHTS.test(blob) && !FRAUD_WORDS.test(blob);
}

// data/exclude.json: rows Krennic removed, by source URL or id. Never ingested again.
const EXCLUDE_FILE = join(ROOT, "data/exclude.json");
function urlKeyOf(url) {
  try {
    const u = new URL(String(url).trim());
    return `${u.hostname.replace(/^(www|legacy)\./, "")}${u.pathname.replace(/\/+$/, "")}`.toLowerCase();
  } catch {
    return String(url || "").trim().toLowerCase();
  }
}
export function loadExclude(file = EXCLUDE_FILE) {
  const list = loadJson(file, { rows: [] })?.rows;
  const rows = Array.isArray(list) ? list : [];
  return {
    urls: new Set(rows.map((e) => e?.sourceUrl).filter(Boolean).map(urlKeyOf)),
    ids: new Set(rows.map((e) => e?.id).filter(Boolean)),
  };
}
let EXCLUDE = null;
export function isExcluded(row, ex = (EXCLUDE ??= loadExclude())) {
  if (!row) return false;
  if (row.id && ex.ids.has(row.id)) return true;
  for (const u of [row.sourceUrl, row.link]) if (u && ex.urls.has(urlKeyOf(u))) return true;
  return false;
}

/**
 * Agency boilerplate that names a program without the case being about it: strike-force paragraphs
 * ("... billed federal health care programs ... Centers for Medicare & Medicaid Services"), the Task
 * Force / Fraud Division paragraph, and payroll "Social Security and Medicare taxes". Removed before
 * the program test, so a drug or payroll-tax case is not filed as Medicare fraud.
 */
const BOILERPLATE_SENTENCE =
  /[^.]*\b(?:Strike Force|Health Care Fraud Unit|National Fraud Enforcement Division|Task Force to Eliminate Fraud|Centers for Medicare\W+(?:and\W+)?Medicaid Services\W+working|Fraud Section (?:is|are) prosecuting|Health Care Fraud Section|has charged more than [\d,]+ defendants|800-HHS-TIPS|Report Fraud)[^.]*(?:\.|$)/g;
export function programText(text) {
  return String(text || "")
    .replace(BOILERPLATE_SENTENCE, " ")
    .replace(/\b(?:social security and )?medicare tax(?:es)?\b/gi, " ");
}

export function keepBlob(title, teaser) {
  const blob = `${title} ${programText(teaser || "")}`;
  if (isServicememberRightsCase(blob)) return false;
  if (
    /enticement of a minor|child (porn|sex|exploit|predator)|sexual (abus|exploit|assault)|rape\b/i.test(
      blob,
    )
  ) {
    return false;
  }
  if (DROP.test(blob) && !KEEP.test(blob) && !govMoney(title, blob)) return false;
  if (KEEP.test(title) || govMoney(title, title)) return true;
  if (/^podcasts?$/i.test(title.trim())) return false;
  // HHS-OIG exclusion notices are administrative program bans, not fraud cases.
  if (/\bnotice of exclusion\b/i.test(title)) return false;
  const prog = programText(teaser || "");
  return KEEP.test(prog) || govMoney(title, prog);
}

/**
 * Krennic 2026-10-20: PRIVATE-VICTIM fraud (victims are private people, businesses, banks, clients, investors,
 * nonprofits, churches, sports betting ...) is on the ledger ONLY when the official release states the person
 * is a non-citizen. Government-program fraud (KEEP above) is unchanged. These run only when keepBlob() is false.
 */
const PRIVATE_FRAUD =
  /\b(?:wire|bank|mail|securities|investment|commodities|access device|credit card|check|insurance|sleight-of-hand|romance|lottery|sweepstakes|elder|grandparent|tech[- ]support|gift[- ]card|business email|bust-out) (?:fraud|scams?|compromise)|\bdefraud(?:ed|ing|s)?\b|\bscam(?:s|med|mer|mers)?\b|\bswindl|\bembezzl|identity theft|\bponzi\b|fraud(?:ulent)? (?:scheme|conspiracy)/i;
// Not private-victim fraud even with non-citizen wording: smuggling, drugs, sanctions/export, immigration-case
// roundups and document cases belong to other trackers.
const PRIVATE_NOT =
  /smuggl|drug trafficking|narcotic|cartel|sanctions|export(?:ing|s|ed)? (?:of )?(?:controlled|micro|military|defense)|unlawful(?:ly)? export|immigration cases|false identification document/i;
// Non-citizen status as the release states it. Case-sensitive parts need a capitalised country/demonym, so
// "National Fraud Enforcement Division", "senior citizens" or "our citizens" never count; "criminal aliens"
// in HSTF boilerplate does not count either (only "illegal alien" / "is an alien" style wording).
const NONCITIZEN_CI =
  /\billegal (?:alien|immigrant|migrant)s?\b|\b(?:is|was|as|an?) (?:alien|non-?citizen)\b|\bundocumented (?:immigrant|migrant|alien|non-?citizen)s?\b|\bnon-?citizens?\b|\b(?:unlawfully|illegally) (?:present|residing|living) in the (?:United States|U\.S\.)|\bforeign nationals?\b|\b(?:lawful|legal) permanent resident\b|\bgreen[- ]card holders?\b|\bvisa (?:had |has )?(?:expired|overstay)|\boverst(?:ayed|aying) (?:his|her|their|a|the) (?:\w+ )?visa|\b(?:student|tourist|visitor|work|H-1B|H-2[AB]|B-?[12]|F-?1|J-?1) visa (?:that|which) (?:had )?expired|\bin the country on an? (?:\w+ )?visa\b|\bsubject to (?:deportation|removal from the United States)|\bwill be (?:immediately )?deported\b/i;
const NONCITIZEN_CS =
  /\b(?:is|was|are|were|a|an|as|and|both)\s+(?:a\s+)?citizens? of (?!the United States|the U\.S\.)(?:the )?\p{Lu}|\bnationals? of (?!the United States|the U\.S\.)(?:the )?\p{Lu}|\b(?!American\b|U\.S\b)\p{Lu}[\p{Ll}]+(?:[- ]\p{Lu}[\p{Ll}]+)? nationals?\b/u;
const CITIZEN_TOO = /\bdual (?:U\.S\. )?(?:national|citizen)|\bnaturali[sz]ed\b|\bU\.S\. citizen\b|\bUnited States citizen\b|\bnational of the United States\b/i;
const US_STATES_RE = /citizens? of (?:the )?(?:Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New \w+|North \w+|South \w+|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming|Puerto Rico|Guam|this|our|[A-Z][a-z]+ County|[A-Z][a-z]+ City)\b/g;

function sentencesOf(text) {
  return String(text || "").replace(US_STATES_RE, " ").split(/(?<=[.!?])\s+(?=[“"(]?[A-Z0-9])/);
}
export function nonCitizenSentence(s) {
  return (NONCITIZEN_CI.test(s) || NONCITIZEN_CS.test(s)) && !CITIZEN_TOO.test(s);
}
/** True when the release itself states someone's non-citizen status. */
export function nonCitizenInRelease(text) {
  return sentencesOf(text).some(nonCitizenSentence);
}
/**
 * The release states THIS person's non-citizen status: a sentence that names them (full name or surname)
 * carries the wording, or the release has a single defendant and its title/lead carries it
 * ("Illegal alien sentenced ... a Chinese national ..." with one defendant, Jin).
 */
export function nonCitizenStatedFor(name, text, single = false) {
  const sents = sentencesOf(text);
  const words = String(name || "").replace(/\b(?:Jr|Sr|II|III|IV)\.?$/i, "").trim().split(/\s+/).filter(Boolean);
  const sur = words.length ? words[words.length - 1] : "";
  const re = sur && sur.length > 1 ? new RegExp(`\\b${sur.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i") : null;
  if (re && sents.some((s) => re.test(s) && nonCitizenSentence(s))) return true;
  return single && sents.some(nonCitizenSentence);
}
/** Private-victim fraud release that may still go on the ledger: fraud, not a dropped crime, non-citizen stated. */
export function privateVictimNonCitizen(title, text) {
  const blob = `${title} ${text || ""}`;
  if (isServicememberRightsCase(blob)) return false;
  if (/enticement of a minor|child (porn|sex|exploit|predator)|sexual (abus|exploit|assault)|rape\b/i.test(blob)) return false;
  // Illegal reentry is not a reason to drop here: it is itself the release stating non-citizen status.
  if (DROP.test(blob.replace(/illegal(?:ly)? re-?entry/gi, " "))) return false;
  if (PRIVATE_NOT.test(title) || /smuggl|drug trafficking|narcotic|cartel|sanctions/i.test(blob)) return false;
  return PRIVATE_FRAUD.test(blob) && nonCitizenInRelease(blob);
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

/**
 * Same person, same voting case, announced again by another office (an OPA roundup of USAO
 * cases, or the USAO mirror of an OPA roundup): an existing voting row from a different
 * release within 14 days whose name equals this name or ends it ("Yugoslavia Gjina Gojcaj
 * McDonald" is "Gjina Gojcaj McDonald" with the country glued on).
 */
export function alreadyListedVoter(existing, row) {
  if (!row?.voting) return false;
  const tok = nameKey(row.name).split(" ").filter(Boolean);
  const t = Date.parse(row.when);
  return existing.some((e) => {
    if (!e?.voting || e.sourceUrl === row.sourceUrl) return false;
    const et = Date.parse(e.when);
    if (Number.isFinite(t) && Number.isFinite(et) && Math.abs(t - et) > 14 * 86400000) return false;
    const etok = nameKey(e.name).split(" ").filter(Boolean);
    return etok.length >= 2 && etok.length <= tok.length && tok.slice(-etok.length).join(" ") === etok.join(" ");
  });
}

/**
 * Same person, same case, posted again by another agency within 21 days (a DOL OIG regional roundup
 * repeating a USAO indictment: "Andrea Wellington" there, "ANDREA WELLINGTON" at the USAO). Full name
 * match (case / accent-insensitive, 2+ words) only; the row already on the ledger is kept.
 */
export function samePersonRecent(existing, row) {
  const k = nameKey(row?.name);
  if (!k || k.split(" ").length < 2) return false;
  const t = Date.parse(row.when);
  return existing.some((e) => {
    if (!e || nameKey(e.name) !== k) return false;
    if (e.sourceUrl === row.sourceUrl) return true;
    const et = Date.parse(e.when);
    return !Number.isFinite(t) || !Number.isFinite(et) || Math.abs(t - et) <= 21 * 86400000;
  });
}

export function ingest(existing, have, added, item, office) {
  if (!item.title || !item.link) return;
  if (isExcluded({ link: item.link })) return;
  if (Number.isFinite(item.when) && item.when < CUTOFF) return;
  const program = keepBlob(item.title, item.teaser || "");
  // Not a government program: a private-victim fraud release, kept only for defendants the release states are
  // non-citizens (Krennic 2026-10-20). fullText is the whole release body when the source gave one.
  const fullText = `${item.title}. ${item.fullText || item.teaser || ""}`;
  if (!program && !privateVictimNonCitizen(item.title, item.fullText || item.teaser || "")) return;
  let rows = rowsFromItem(item, office);
  if (!program) rows = rows.filter((r) => nonCitizenStatedFor(r.name, fullText, rows.length === 1));
  for (const row of rows) {
    if (isExcluded(row)) continue;
    const key = `${row.sourceUrl}|${row.id}`;
    if (have.has(key)) {
      // A seed that names the stage (e.g. "Charged") fills it in on a row the DOJ API added first.
      // Only a missing stage is filled; an existing stage is never changed (never upgraded).
      if (item.stage) {
        const prev = existing.find((e) => e && e.id === row.id && e.sourceUrl === row.sourceUrl);
        if (prev && !prev.stage) {
          prev.stage = item.stage;
          if (item.stage === "Charged" && !/Stage: Charged/.test(prev.text || "")) {
            prev.text = String(prev.text || "").replace(/ Charges are allegations unless/, " Stage: Charged (not convicted). Charges are allegations unless");
          }
        }
      }
      continue;
    }
    if (alreadyListedVoter(existing, row)) continue;
    if (samePersonRecent(existing, row)) continue;
    have.add(key);
    existing.push(row);
    added.push(row.name);
  }
}

const ELECTION =
  /illegal(?:ly)? vot|unlawful(?:ly)? vot|voting by (?:an? )?aliens?|election crimes?|election fraud|voter fraud|fraudulent(?:ly)? (?:voter )?regist|registered to vote|false claims? (?:to|of).{0,20}citizenship|protect the vote/i;

/**
 * True for an OPA (Main Justice) election-crimes roundup that lists defendants district by
 * district ("Central District of California ... Eastern District of California ..."). These
 * have no usao- office in the URL and their API "teaser" is only the opening paragraph.
 */
export function isOpaElectionRoundup(url, title, body) {
  if (!/justice\.gov\/opa\/pr\//i.test(String(url))) return false;
  if (!ELECTION.test(`${title} ${body}`)) return false;
  const districts = new Set(
    (String(body).match(/\b(?:(?:Central|Eastern|Northern|Southern|Western|Middle)\s+)?District of [A-Z][a-z]+(?: [A-Z][a-z]+)?/g) || []).map((d) => d.toLowerCase()),
  );
  return districts.size >= 2;
}

/**
 * One DOJ API result as an ingest item. The API "teaser" is often only the opening paragraph
 * (no defendant names), so an OPA multi-district election roundup such as "Justice Department
 * Charges 28 Foreign Nationals in California for Election Crimes" lost every name. For those
 * releases the full body is read; every other release keeps the teaser (reading every body
 * pulled in officials' names and glued headers).
 */
export function dojItem(r) {
  const title = strip(String(r.title || ""));
  const link = String(r.url || "").trim();
  const body = strip(String(r.body || ""));
  const teaser = strip(String(r.teaser || r.body || ""));
  let use = teaser;
  if (body && isOpaElectionRoundup(link, title, body)) use = body;
  // The teaser of many USAO releases is a one-line summary with no name ("A former employee of a State
  // of Illinois subcontractor has been indicted ..."). Then, and only then, the opening of the body is
  // read (first 3,000 characters: the case paragraphs, before the agency-credit boilerplate).
  else if (body && !operationName(title)) {
    const head = body.slice(0, 3000);
    const named = allPeople(title, teaser);
    if (!named.length && keepBlob(title, head)) use = head;
    // The teaser names the defendant(s) but not the program ("... for filing false tax returns and wire
    // fraud"; the PUA claims are in the next paragraph): read the opening of the body for the program,
    // but keep the teaser's names, so no official or agent named further down becomes a row.
    else if (named.length && !keepBlob(title, teaser) && keepBlob(title, head)) return { title, teaser: head, link, when: unixMs(r.date), names: named };
  }
  // Not a program case by teaser or opening: if the body states a defendant's non-citizen status, ingest()
  // may keep it as private-victim fraud (Krennic 2026-10-20); it needs the whole body for that check.
  if (body && !keepBlob(title, use) && !keepBlob(title, body.slice(0, 3000)) && privateVictimNonCitizen(title, body)) {
    const named = allPeople(title, teaser);
    return { title, teaser: named.length ? teaser : body.slice(0, 3000), link, when: unixMs(r.date), fullText: body, ...(named.length ? { names: named } : {}) };
  }
  return {
    title,
    teaser: use,
    link,
    when: unixMs(r.date),
  };
}

export function seededLinks(seedFile = SEED) {
  const seed = loadJson(seedFile, { releases: [] });
  return new Set((Array.isArray(seed?.releases) ? seed.releases : []).map((r) => urlKeyOf(r.link)).filter(Boolean));
}

async function harvestDoj(existing, have, added) {
  let scanned = 0;
  const seeded = seededLinks();
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
      if (seeded.has(urlKeyOf(r.url))) continue;
      ingest(
        existing,
        have,
        added,
        dojItem(r),
        "TheJusticeDept",
      );
    }
  }
  return scanned;
}

// Manual-add intake: data/seed-releases.json lists official release URLs with
// the release's own wording (named defendants only). Same ingest path as DOJ.
const SEED = join(ROOT, "data/seed-releases.json");
export function harvestSeed(existing, have, added, seedFile = SEED) {
  const seed = loadJson(seedFile, { releases: [] });
  const list = Array.isArray(seed?.releases) ? seed.releases : [];
  for (const r of list) {
    const link = String(r.link || "").trim();
    if (!isOfficialHost(link)) continue;
    ingest(existing, have, added, {
      title: String(r.title || ""),
      teaser: String(r.teaser || ""),
      link,
      when: Date.parse(`${r.date}T12:00:00Z`),
      seat: r.seat || "",
      stage: r.stage || "",
      ...(Array.isArray(r.names) && r.names.length ? { names: r.names } : {}),
    }, /oig\.dol\.gov/i.test(link) ? "DOLOIG" : /dhs\.gov/i.test(link) ? "DHSgov" : "TheJusticeDept");
  }
  return list.length;
}

/**
 * Cross-post: election / voting-fraud rows that the Invasion Update harvester found in official
 * releases (status "approved", voting: true, official .gov source) and the ledger does not have yet.
 * Only rows the Invasion harvester built itself are used (usa = "<DOJ|DHS|ICE|CBP> release <date>:
 * <headline>"), because their label is the release's own sentence, word for word. X posts, news and
 * hand-summarized rows are never cross-posted. A person already on the ledger as a voter (any release,
 * any date, same name or the name with a country glued on) is not added again. Stage comes from the
 * Invasion label and is never upgraded ("Arrested" stays Arrested, "Charged" stays Charged).
 */
const INVASION_FEED = process.env.INVASION_FEED_URL || "https://krennic212.github.io/invasionupdate-data/harvest.json";
const INV_USA = /^(DOJ|DHS|ICE|CBP) release [A-Z][a-z]{2} \d{1,2}, \d{4}: (.+)$/;
const STATE_NAMES = { AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", PR: "Puerto Rico" };

/** "District of Minnesota" / "Northern District of Texas" in the release text -> that office's seat. */
export function districtSeatFromText(text) {
  const m = String(text || "").match(/\b(?:(Northern|Southern|Eastern|Western|Middle|Central)\s+)?District of ((?:New |North |South |West |Rhode |Puerto )?[A-Z][a-z]+)/);
  if (!m) return null;
  const code = Object.keys(STATE_NAMES).find((k) => STATE_NAMES[k] === m[2]);
  if (!code) return null;
  const key = `usao-${m[1] ? `${m[1][0].toLowerCase()}d` : ""}${code.toLowerCase()}`;
  const hit = DISTRICT_SEAT[key] || Object.values(DISTRICT_SEAT).find((v) => v[0].endsWith(`, ${code}`));
  return hit ? { city: hit[0], lat: hit[1], lon: hit[2] } : null;
}

/** Map pin for a cross-posted row: the Invasion row's own lat/lon, else a district named in its
 *  sentence, else the first listed district seat of its state. */
export function geoForInvasionRow(row) {
  if (Number.isFinite(row?.lat) && Number.isFinite(row?.lon)) return { city: row.city, lat: row.lat, lon: row.lon };
  const fromText = districtSeatFromText(row?.crime);
  if (fromText) return fromText;
  const city = String(row?.city || "");
  const code = (city.match(/,\s*([A-Z]{2})\s*$/) || [])[1] || Object.keys(STATE_NAMES).find((k) => STATE_NAMES[k].toLowerCase() === city.trim().toLowerCase());
  if (!code) return null;
  const seat = Object.values(DISTRICT_SEAT).find((v) => v[0].endsWith(`, ${code}`));
  return seat ? { city: /,\s*[A-Z]{2}$/.test(city) ? city : seat[0], lat: seat[1], lon: seat[2] } : null;
}

export function listedVoterAnyDate(existing, name) {
  const tok = nameKey(name).split(" ").filter(Boolean);
  return existing.some((e) => {
    if (!e?.voting) return false;
    const etok = nameKey(e.name).split(" ").filter(Boolean);
    if (etok.length < 2) return false;
    const [short, long] = etok.length <= tok.length ? [etok, tok] : [tok, etok];
    return long.slice(-short.length).join(" ") === short.join(" ");
  });
}

/** One Invasion Update row as a ledger ingest item, or null when it must not be cross-posted. */
export function invasionVotingItem(row) {
  if (row?.status !== "approved" || row?.voting !== true) return null;
  const link = String(row.sourceUrl || "").trim();
  if (!/^https:\/\/(?:www\.)?(?:justice|dhs|ice|cbp)\.gov\//i.test(link)) return null;
  const m = String(row.usa || "").match(INV_USA);
  if (!m) return null;
  const crime = String(row.crime || "");
  const colon = crime.indexOf(":");
  const label = colon > 0 ? crime.slice(0, colon).trim() : "";
  const sentence = colon > 0 ? crime.slice(colon + 1).trim() : "";
  if (!sentence.includes(row.name)) return null;
  const when = Date.parse(`${row.when} 12:00 UTC`);
  const stage = /^(Charged|Arrested|Convicted|Removed)$/.test(label) ? label : "";
  const geo = geoForInvasionRow(row);
  return { title: m[2].trim(), teaser: sentence, link, when, names: [row.name], ...(stage ? { stage } : {}), ...(geo ? { geo } : {}) };
}

export function crossPostInvasionVoting(existing, have, added, rows) {
  let n = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    const item = invasionVotingItem(row);
    if (!item) continue;
    n += 1;
    if (listedVoterAnyDate(existing, row.name)) continue;
    ingest(existing, have, added, item, /\/\/(?:www\.)?(?:dhs|ice|cbp)\.gov\//i.test(item.link) ? "DHSgov" : "TheJusticeDept");
  }
  return n;
}

async function harvestInvasionVoting(existing, have, added) {
  let rows;
  try {
    rows = JSON.parse(await fetchText(`${INVASION_FEED}?t=${Date.now()}`));
  } catch (e) {
    console.error("Invasion Update feed skip", String(e));
    return 0;
  }
  return crossPostInvasionVoting(existing, have, added, rows);
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


/** DOL OIG pages put the agency logo in <h1>; the real headline is often <h3> or twitter:description. */
function oigPageTitle(page, url) {
  const twitter = (page.match(
    /<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["']/i,
  ) || page.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:description["']/i,
  ) || [])[1];
  const og = (page.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
  ) || [])[1];
  const h3s = [...page.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)].map((m) =>
    strip(m[1]),
  );
  const h3 = h3s.find(
    (t) =>
      t &&
      t.length >= 20 &&
      !/^sub header/i.test(t) &&
      !/united states department of labor/i.test(t) &&
      !/^office of inspector general$/i.test(t),
  );
  const h1 = strip(
    (page.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "",
  );
  const titleTag = strip(
    (page.match(/<title>([^<]+)<\/title>/i) || [])[1] || "",
  )
    .replace(/^Office of Inspector General\s*-\s*/i, "")
    .replace(/\s*\|\s*.*$/, "")
    .trim();
  for (const cand of [twitter, og, h3, titleTag, h1]) {
    const t = strip(String(cand || ""))
      .replace(/^Office of Inspector General\s*-\s*/i, "")
      .replace(/\s*\|\s*.*$/, "")
      .trim();
    if (
      t &&
      t.length >= 12 &&
      !/^united states department of labor$/i.test(t) &&
      !/^office of inspector general$/i.test(t) &&
      !/^investigative updates$/i.test(t) &&
      !/^press releases$/i.test(t)
    ) {
      return t;
    }
  }
  return url;
}

/** Prefer article text from the release headline onward; nav chrome otherwise fills the teaser. */
function oigPageBody(page, title) {
  const full = strip(page);
  if (title && title.length >= 12) {
    const at = full.toLowerCase().indexOf(title.toLowerCase());
    if (at >= 0) return full.slice(at, at + 4000);
  }
  return full.slice(0, 4000);
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
    // Absolute paths (/foo) and DOL-style relatives that omit the leading slash
    // (public/Press%20Releases/....htm).
    const rel = [
      ...html.matchAll(/href="(\/[^"]+)"/gi),
      ...html.matchAll(/href="((?:public|Press)[^"]+)"/gi),
    ].map((m) => {
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
        if (/oigpressreleases\.htm/i.test(u)) return false;
        if (ig.path) return ig.path.test(u);
        return /article\/|news-releases\/|press-release|oig|ppp|fraud/i.test(u);
      })
      .slice(0, 16);
    for (const url of urls) {
      scanned += 1;
      let page = "";
      try {
        page = await fetchText(url);
      } catch {
        continue;
      }
      const title = oigPageTitle(page, url);
      const body = oigPageBody(page, title);
      const monthHit = body.match(
        /\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+20\d{2})\b/i,
      );
      const urlHit = url.match(/\/(20\d{2})(\d{2})(\d{2})[_\/]/);
      let when = NaN;
      if (monthHit) when = Date.parse(monthHit[1]);
      else if (urlHit) when = Date.parse(`${urlHit[1]}-${urlHit[2]}-${urlHit[3]}T12:00:00Z`);
      ingest(
        existing,
        have,
        added,
        { title, teaser: body, link: url, when },
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
  const existing = loadJson(HARVEST, [])
    .map(rewriteExisting)
    .filter(Boolean)
    // Rows Krennic removed (data/exclude.json) never come back.
    .filter((r) => !isExcluded(r))
    // Drop prior DOL OIG rows whose title scrape grabbed the agency logo <h1>.
    .filter(
      (r) =>
        !/^UNITED STATES DEPARTMENT OF LABOR$/i.test(String(r.crime || "").trim()),
    );
  const have = new Set(
    existing.map((r) => `${r.sourceUrl || ""}|${r.id || ""}`),
  );
  const added = [];
  // Seeds first: a hand-listed release keeps exactly the names and stage Krennic chose, and the DOJ API
  // pass skips that release (see seededLinks), so it cannot add a second spelling or an extra name.
  const seedN = harvestSeed(existing, have, added);
  const doj = await harvestDoj(existing, have, added);
  const inv = await harvestInvasionVoting(existing, have, added);
  const usda = await harvestUsda(existing, have, added);
  const hhs = await harvestHhsOig(existing, have, added);
  const ig = await harvestIgLists(existing, have, added);
  const stateAg = await harvestStateAg(existing, have, added);
  const news = await harvestNews(existing, have, added);
  const kept = existing.filter((r) => {
    if (looksLikeHeadline(r.name)) return false;
    return isKeepRow(r.name, r.crime || r.name, r.text || "");
  });
  const scanned = doj + seedN + inv + usda + hhs + ig + stateAg + news;

  writeFileSync(HARVEST, `${JSON.stringify(kept, null, 2)}\n`);
  writeFileSync(
    STATUS,
    `${JSON.stringify(
      {
        checkedAt: Date.now(),
        added,
        enriched: [],
        scanned,
        note: "Hourly: justice.gov + seed releases + Invasion Update official voting rows + USDA + HHS/SBA/SSA/IRS/DOL/VA OIG + Idaho AG Medicaid-fraud newsroom + verified news that cites an official charging paper. Headline-only rows dropped. Named people and named operations kept.",
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    `scanned ${scanned} (doj ${doj}, seed ${seedN}, invasion-voting ${inv}, usda ${usda}, hhs ${hhs}, ig ${ig}, stateAg ${stateAg}, news ${news}); added ${added.length}; harvest ${kept.length}`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

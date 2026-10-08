import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  allPeople,
  isKeepRow,
  looksLikeHeadline,
  newsHasChargingPaper,
  officialUrl,
  operationName,
  personOrEntity,
  rewriteHarvestName,
} from "./harvest-parse.mjs";

describe("personOrEntity", () => {
  it("pulls a named defendant from a DOJ teaser", () => {
    const hit = personOrEntity(
      "Owner of Two South Florida Nursing Schools Pleads Guilty",
      "MIAMI – Carleen Noreus, 52, of Plantation, pleaded guilty to conspiracy to commit wire fraud.",
    );
    assert.equal(hit?.name, "Carleen Noreus");
    assert.equal(hit?.kind, "person");
  });
  it("keeps Operation SNAP Back", () => {
    assert.equal(
      personOrEntity("USDA's Operation SNAP Back Hits Five Boroughs")?.name,
      "Operation SNAP Back",
    );
  });
  it("keeps a company", () => {
    const hit = personOrEntity(
      "Trax Retail, Inc. Agrees to Pay $3 Million to Resolve Allegations of PPP Loan Fraud",
    );
    assert.match(hit?.name || "", /Trax Retail/i);
  });
  it("does not glue the headline noun onto the defendant", () => {
    const hit = personOrEntity(
      "Two Defendants Indicted for COVID-19 Fraud",
      "Alyshia Smith, 33, of Kansas City, and Michelle Green, 36, of Grandview, Mo., have been indicted.",
    );
    assert.equal(hit?.name, "Alyshia Smith");
  });
  it("pulls a name from arrested X, of Country", () => {
    const hit = personOrEntity(
      "AMERICAN ELECTIONS ARE FOR AMERICAN CITIZENS, NOT FOREIGN FRAUDSTERS",
      "special agents arrested Julieta Engelstad, of Colombia, Sept. 18, for alleged violations of federal law regarding voting by aliens.",
    );
    assert.equal(hit?.name, "Julieta Engelstad");
  });
  it("pulls the first spouse from an HSI couple indictment", () => {
    const hit = personOrEntity(
      "MARRIED COUPLE INDICTED IN ELECTION FRAUD CASE",
      "Thomas Holtzman and his wife, Marisol Guzman, were indicted by a federal grand jury on election-related charges.",
    );
    assert.equal(hit?.name, "Thomas Holtzman");
  });
  it("pulls Illegal alien Name, of Country", () => {
    const hit = personOrEntity(
      "HSI Dallas arrested this illegal voter",
      "Illegal alien Anjelica Pena, of Mexico, voted in the 2024 election in Fort Worth, Texas.",
    );
    assert.equal(hit?.name, "Anjelica Pena");
    const mora = personOrEntity(
      "",
      "Illegal alien Jhonatan Mora-Serrano, of Colombia, voted in the 2024 election in Atlanta, Georgia.",
    );
    assert.equal(mora?.name, "Jhonatan Mora-Serrano");
  });
  it("pulls an ALL-CAPS name off a state-AG Medicaid sentencing graphic", () => {
    const hit = personOrEntity(
      "AG Labrador secures Medicaid fraud conviction in Idaho Falls",
      "SENTENCED ONE FELONY COUNT OF GRAND THEFT RELATED TO MEDICAID CHELSEA KAY AUSTIN AG LABRADOR SECURES MEDICAID FRAUD CONVICTION IN IDAHO FALLS An Idaho Falls Medicaid provider billed for hours she spent delivering Amazon packages and running personal errands instead of caring for a disabled woman. My Medicaid Fraud Control Unit investigated, prosecuted, and secured her felony conviction.",
    );
    assert.equal(hit?.name, "Chelsea Kay Austin");
    assert.equal(hit?.kind, "person");
  });
  it("pulls Name, a 36-year-old NATIONALITY citizen, was arrested", () => {
    const hit = personOrEntity(
      "VOTER FRAUD COUNTS AS A CRIME",
      "Moises Anwar Arellano-Alba, a 36-year-old Mexican citizen, was arrested following a federal indictment in the Northern District of Texas. He is alleged to have unlawfully voted in a federal election and to have made a false statement of U.S. citizenship to register to vote.",
    );
    assert.equal(hit?.name, "Moises Anwar Arellano-Alba");
    assert.equal(hit?.kind, "person");
  });
  it("pulls a named unemployment-fraud defendant", () => {
    const hit = personOrEntity(
      "Georgia Sisters Plead Guilty to Pandemic Unemployment Fraud",
      "ATLANTA – Keisha Williams, 41, of Macon, pleaded guilty to conspiracy to commit wire fraud in a pandemic unemployment scheme.",
    );
    assert.equal(hit?.name, "Keisha Williams");
  });
  it("pulls a named FEMA defendant", () => {
    const hit = personOrEntity(
      "Texas Woman Sentenced for Fraudulent FEMA Claims",
      "HOUSTON – Maria Lopez, 38, of Pasadena, was sentenced for filing fraudulent FEMA disaster-relief claims.",
    );
    assert.equal(hit?.name, "Maria Lopez");
  });
  it("pulls a named I-9 document-mill defendant", () => {
    const hit = personOrEntity(
      "Employer Indicted for E-Verify and Fake Green-Card Mill",
      "CHICAGO – Robert Chen, 52, of Naperville, was indicted for I-9 and E-Verify fraud.",
    );
    assert.equal(hit?.name, "Robert Chen");
  });
  it("pulls a named MFCU defendant with age", () => {
    const hit = personOrEntity(
      "AG Labrador’s Office Arrests Two Men in Ada County for Medicaid Fraud",
      "BOISE, ID — Attorney General Raúl Labrador has announced that investigations by his Medicaid Fraud Control Unit (MFCU) led to the arrests of Joseph Hakizimana, 36, on four counts of Provider Fraud and Hussein Hamad, 49, on five counts of Provider Fraud.",
    );
    assert.equal(hit?.name, "Joseph Hakizimana");
  });
});

describe("allPeople", () => {
  it("pulls every named defendant from a DOJ voting roundup", () => {
    const names = allPeople(
      "Department of Justice Charges 16 Individuals for Illegal Voting",
      "Moises Anwar Arellano-Alba, 36, an illegal alien from Mexico, was charged. Helen Sayen Adams, 67, a Nigerian national, lawful permanent resident. Avila Gomez, an illegal alien from Mexico, was charged with wire fraud. Gabriel Covarrubias, 44, a suspected illegal alien from Mexico.",
    );
    assert.ok(names.includes("Moises Anwar Arellano-Alba"));
    assert.ok(names.includes("Helen Sayen Adams"));
    assert.ok(names.includes("Avila Gomez"));
    assert.ok(names.includes("Gabriel Covarrubias"));
    assert.equal(
      names.some((n) => /16 Individuals|Department of Justice/i.test(n)),
      false,
    );
  });
  it("pulls an ICE field-office arrest without an age", () => {
    const names = allPeople(
      "AMERICAN ELECTIONS ARE FOR AMERICAN CITIZENS, NOT FOREIGN FRAUDSTERS",
      "@HSIChicago's Madison & Milwaukee Wisconsin special agents arrested Julieta Engelstad, of Colombia, Sept. 18, for alleged violations of federal law regarding voting by aliens & false claims of U.S. citizenship.",
    );
    assert.ok(names.includes("Julieta Engelstad"));
    assert.equal(
      names.some((n) => /AMERICAN|ELECTIONS|FRAUDSTERS|Wisconsin/i.test(n)),
      false,
    );
  });
  it("pulls both spouses from an HSI couple indictment", () => {
    const names = allPeople(
      "MARRIED COUPLE INDICTED IN ELECTION FRAUD CASE",
      "Thomas Holtzman and his wife, Marisol Guzman, were indicted by a federal grand jury on election-related charges. Holtzman faces charges related to false statements of citizenship and fraudulent registration; Guzman was charged with allegedly voting as an alien.",
    );
    assert.ok(names.includes("Thomas Holtzman"));
    assert.ok(names.includes("Marisol Guzman"));
    assert.equal(
      names.some((n) => /Married|Couple|Election Fraud/i.test(n)),
      false,
    );
  });
  it("pulls both Ada County Medicaid-fraud arrests", () => {
    const names = allPeople(
      "AG Labrador’s Office Arrests Two Men in Ada County for Medicaid Fraud",
      "investigations by his Medicaid Fraud Control Unit (MFCU) led to the arrests of Joseph Hakizimana, 36, on four counts of Provider Fraud and Hussein Hamad, 49, on five counts of Provider Fraud.",
    );
    assert.ok(names.includes("Joseph Hakizimana"));
    assert.ok(names.includes("Hussein Hamad"));
  });
  it("pulls an HSI HQ year-old-citizen voting arrest", () => {
    const names = allPeople(
      "Mexican National Charged with Voter Fraud in Texas",
      "Moises Anwar Arellano-Alba, a 36-year-old Mexican citizen, was arrested following a federal indictment in the Northern District of Texas. He is alleged to have unlawfully voted in a federal election and to have made a false statement of U.S. citizenship to register to vote.",
    );
    assert.ok(names.includes("Moises Anwar Arellano-Alba"));
    assert.equal(
      names.some((n) => /Mexican National|Voter Fraud|Texas/i.test(n) && !/Arellano/i.test(n)),
      false,
    );
  });
});

describe("looksLikeHeadline", () => {
  it("drops press-release titles without a person", () => {
    assert.equal(
      looksLikeHeadline(
        "Clinic owner imprisoned for health care fraud kickback scheme causing $49 million loss",
      ),
      true,
    );
    assert.equal(looksLikeHeadline("Carleen Noreus"), false);
    assert.equal(looksLikeHeadline("Operation SNAP Back"), false);
  });
});

describe("rewriteHarvestName", () => {
  it("turns a headline row into the named defendant", () => {
    assert.equal(
      rewriteHarvestName(
        "Owner of Two South Florida Nursing Schools Pleads Guilty",
        "Owner of Two South Florida Nursing Schools Pleads Guilty",
        "MIAMI – Carleen Noreus, 52, of Plantation, pleaded guilty.",
      ),
      "Carleen Noreus",
    );
  });
  it("drops a headline with no person and no operation", () => {
    assert.equal(
      rewriteHarvestName(
        "Clinic owner imprisoned for health care fraud kickback scheme causing $49 million loss",
      ),
      null,
    );
  });
  it("repairs a glued headline name from the teaser", () => {
    assert.equal(
      rewriteHarvestName(
        "Fraud Alyshia Smith",
        "Two Defendants Indicted for COVID-19 Fraud",
        "Alyshia Smith, 33, of Kansas City, and Michelle Green, 36, of Grandview, Mo., have been indicted.",
      ),
      "Alyshia Smith",
    );
  });
  it("names the defendant from an HSI HQ year-old-citizen recap", () => {
    assert.equal(
      rewriteHarvestName(
        "Mexican National Charged with Voter Fraud in Texas",
        "Mexican National Charged with Voter Fraud in Texas",
        "Moises Anwar Arellano-Alba, a 36-year-old Mexican citizen, was arrested following a federal indictment in the Northern District of Texas. He is alleged to have unlawfully voted in a federal election and to have made a false statement of U.S. citizenship to register to vote.",
      ),
      "Moises Anwar Arellano-Alba",
    );
  });
  it("names the defendant when a USAO post only says the nationality", () => {
    assert.equal(
      rewriteHarvestName(
        "Haitian National Pleads Guilty to Illegally Voting in 2024 General Election",
        "Haitian National Pleads Guilty to Illegally Voting in 2024 General Election",
        "MIAMI – A Haitian national who falsely claimed to be a U.S. citizen to register to vote pleaded guilty. Valery Zidor, 23, of Haiti, falsely claimed that she was a U.S. citizen on two voter registration forms.",
      ),
      "Valery Zidor",
    );
  });
});

describe("isKeepRow", () => {
  it("keeps named people and operations", () => {
    assert.equal(isKeepRow("Carleen Noreus"), true);
    assert.equal(isKeepRow("Operation SNAP Back"), true);
    assert.equal(
      isKeepRow(
        "Clinic owner imprisoned for health care fraud kickback scheme causing $49 million loss",
      ),
      false,
    );
  });
  it("keeps an HSI HQ year-old-citizen arrest from the teaser", () => {
    assert.equal(
      isKeepRow(
        "Mexican National Charged with Voter Fraud in Texas",
        "Mexican National Charged with Voter Fraud in Texas",
        "Moises Anwar Arellano-Alba, a 36-year-old Mexican citizen, was arrested following a federal indictment in the Northern District of Texas. He is alleged to have unlawfully voted in a federal election and to have made a false statement of U.S. citizenship to register to vote.",
      ),
      true,
    );
  });
});

describe("charging paper", () => {
  it("requires an official URL on news recaps", () => {
    assert.equal(
      newsHasChargingPaper("https://justthenews.com/foo", "no official link"),
      false,
    );
    assert.equal(
      newsHasChargingPaper(
        "https://justthenews.com/foo",
        "See https://www.justice.gov/usao-sdfl/pr/example",
      ),
      true,
    );
    assert.equal(officialUrl("read https://www.usda.gov/about-usda/news/x"), "https://www.usda.gov/about-usda/news/x");
    assert.equal(
      officialUrl("https://www.ag.idaho.gov/newsroom/ag-labradors-office-arrests-two-men-in-ada-county-for-medicaid-fraud/"),
      "https://www.ag.idaho.gov/newsroom/ag-labradors-office-arrests-two-men-in-ada-county-for-medicaid-fraud/",
    );
    assert.equal(
      officialUrl("see https://www.fema.gov/press-release/20260630/texas-woman-who-filed-fraudulent-fema-claims"),
      "https://www.fema.gov/press-release/20260630/texas-woman-who-filed-fraudulent-fema-claims",
    );
    assert.equal(
      officialUrl("https://www.oig.dol.gov/public/Press%20Releases/OIG-OI-Press-Release-091526.htm"),
      "https://www.oig.dol.gov/public/Press%20Releases/OIG-OI-Press-Release-091526.htm",
    );
    assert.equal(
      officialUrl("CMS: https://www.cms.gov/newsroom/press-releases/example"),
      "https://www.cms.gov/newsroom/press-releases/example",
    );
    assert.equal(
      newsHasChargingPaper(
        "https://www.reuters.com/legal/government/us-says-it-canceled-315000-obamacare-policies-last-month-2026-09-22/",
        "disclosed in rule making documents published in the US Federal Register https://www.federalregister.gov/documents/2026/09/22/example",
      ),
      true,
    );
  });
});

describe("operationName", () => {
  it("parses Nightingale and SNAP Back without trailing verbs", () => {
    assert.equal(
      operationName("Fraud Charges Filed Against 12 Defendants in Phase II of Operation Nightingale"),
      "Operation Nightingale",
    );
    assert.equal(
      operationName("USDA's Operation SNAP Back Hits Five Boroughs"),
      "Operation SNAP Back",
    );
  });
});

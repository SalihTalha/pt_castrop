// Fetches Diyanet prayer times for the configured district from the ezanvakti
// API and writes them to the local prayer-times.json files the app reads.
// The API only returns about one month at a time, so new days are merged into
// the existing file. Run with: npm run fetch:prayer-times
import { readFile, writeFile } from "node:fs/promises";

const API_BASE_URL = "https://ezanvakti.emushaf.net";
const DISTRICT_ID = "10964";
const CITY = "Castrop-Rauxel";
const COUNTRY = "Almanya";
const OUTPUT_FILES = ["public/prayer-times.json", "docs/prayer-times.json", "prayer-times.json"];

const response = await fetch(`${API_BASE_URL}/vakitler/${DISTRICT_ID}`);

if (!response.ok) {
  throw new Error(`Prayer times API returned ${response.status}`);
}

const fetchedDays = await response.json();

if (!Array.isArray(fetchedDays) || fetchedDays.length === 0) {
  throw new Error("Prayer times API returned no days");
}

const existing = await readExistingFile(OUTPUT_FILES[0]);
const daysByDate = new Map();

if (existing?.districtId === DISTRICT_ID) {
  for (const day of existing.days) {
    daysByDate.set(day.MiladiTarihKisa, day);
  }
}

for (const day of fetchedDays) {
  daysByDate.set(day.MiladiTarihKisa, day);
}

const days = [...daysByDate.values()].sort((a, b) => toSortKey(a).localeCompare(toSortKey(b)));
const includedYears = [...new Set(days.map((day) => Number(day.MiladiTarihKisa.slice(6))))];

const file = {
  source: `Diyanet prayer times for ${CITY}, district ${DISTRICT_ID}, via the ezanvakti API`,
  sourceUrl: `${API_BASE_URL}/vakitler/${DISTRICT_ID}`,
  districtId: DISTRICT_ID,
  city: CITY,
  country: COUNTRY,
  generatedAt: new Date().toISOString(),
  requestedYears: includedYears,
  includedYears,
  note: "The API returns about one month per request. Re-run `npm run fetch:prayer-times` before the last day in this file to extend it.",
  days
};

const json = `${JSON.stringify(file, null, 2)}\n`;

for (const path of OUTPUT_FILES) {
  await writeFile(path, json);
}

console.log(
  `Wrote ${days.length} days (${days[0].MiladiTarihKisa} – ${days.at(-1).MiladiTarihKisa}) to ${OUTPUT_FILES.join(", ")}`
);

async function readExistingFile(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

function toSortKey(day) {
  const [dd, mm, yyyy] = day.MiladiTarihKisa.split(".");
  return `${yyyy}-${mm}-${dd}`;
}

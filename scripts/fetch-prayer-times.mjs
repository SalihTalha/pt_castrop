// Fetches Diyanet prayer times for Castrop-Rauxel and writes prayer-times.js,
// which index.html loads with a plain <script> tag (the TV never has to fetch).
// Sources: Diyanet's own page (the next 12 months) and the ezanvakti API
// (about one month). Official days already in the file are kept.
//
// Diyanet publishes only about a year ahead, but the screen has to keep
// working for years without anyone touching it. So every day up to the end
// of the year 10 years from now that has no official times is calculated and
// marked with "calc": 1, and recalculated on every run until official times
// replace it:
// - Times: those of the latest official day with the same month and day,
//   moved to that year's summer/winter time. Diyanet's own times for the same
//   date differ by at most a minute from year to year.
// - Hijri date: continued from the last official one, months starting the day
//   after the new moon if it falls before 12:00 UTC, else the day after that.
//   This matches every month start Diyanet published for 2026-2027; a month
//   whose new moon falls close to that time can come out a day off.
// Run with: npm run fetch:prayer-times
import { readFile, writeFile } from "node:fs/promises";

const DISTRICT_ID = "10964";
const CITY = "Castrop-Rauxel";
const DIYANET_URL = `https://namazvakitleri.diyanet.gov.tr/tr-TR/${DISTRICT_ID}/castrop-rauxel-namaz-vakitleri`;
const API_URL = `https://ezanvakti.emushaf.net/vakitler/${DISTRICT_ID}`;
const OUTPUT_FILE = "prayer-times.js";
const PRAYER_KEYS = ["imsak", "gunes", "ogle", "ikindi", "aksam", "yatsi"];
const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const HIJRI_MONTHS = ["Muharrem", "Safer", "Rebiulevvel", "Rebiulahir", "Cemaziyelevvel", "Cemaziyelahir",
  "Recep", "Şaban", "Ramazan", "Şevval", "Zilkade", "Zilhicce"];
const YEARS_AHEAD = 10;
// A Hijri month starts the day after the new moon if it falls before this time
// of day (UTC), else the day after that. Diyanet's 2026-2027 month starts put
// the cut-off between 10:58 and 13:36 UTC.
const NEW_MOON_CUTOFF_MINUTES = 12 * 60;
const UNSURE_FROM_MINUTES = 10 * 60 + 58;
const UNSURE_TO_MINUTES = 13 * 60 + 36;

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
const existing = await readExistingFile();
// Calculated days are made again below, from the newest official data.
const days = new Map(Object.entries(existing?.days ?? {}).filter(([, day]) => !day.calc));
const sources = [];

// Diyanet's own page goes last so its values win if the two ever disagree.
for (const [name, load] of [["ezanvakti API", loadApi], ["Diyanet page", loadDiyanetPage]]) {
  try {
    const loaded = await load();

    for (const [date, day] of loaded) {
      const previous = days.get(date);
      if (previous && PRAYER_KEYS.some((key) => previous[key] !== day[key])) {
        console.warn(`${date}: ${name} differs from earlier data, using ${name}`);
      }
      days.set(date, day);
    }

    sources.push(name);
    console.log(`${name}: ${loaded.size} days`);
  } catch (error) {
    console.warn(`${name} failed: ${error.message}`);
  }
}

if (!sources.length) {
  throw new Error("No source returned prayer times; prayer-times.js was not changed");
}

const horizon = `${Number(today.slice(0, 4)) + YEARS_AHEAD}-12-31`;
const calculated = fillCalculatedDays(days, today, horizon);

const sorted = [...days.entries()]
  .filter(([date]) => date >= today)
  .sort(([a], [b]) => a.localeCompare(b));
const lines = sorted.map(([date, day]) => `    ${JSON.stringify(date)}: ${JSON.stringify(day)}`);

await writeFile(
  OUTPUT_FILE,
  `// Prayer times for the display, written by scripts/fetch-prayer-times.mjs or admin.html.
var PRAYER_TIMES = {
  "city": ${JSON.stringify(CITY)},
  "districtId": ${JSON.stringify(DISTRICT_ID)},
  "generatedAt": ${JSON.stringify(new Date().toISOString())},
  "days": {
${lines.join(",\n")}
  }
};
`
);

console.log(`Wrote ${sorted.length} days (${sorted[0][0]} to ${sorted.at(-1)[0]}) to ${OUTPUT_FILE}`);
console.log(`Official Diyanet times until ${calculated.officialUntil}; ${calculated.count} days calculated after that.`);
for (const start of calculated.unsure) {
  console.warn(`Hijri month starting ${start} is close to the cut-off and could be a day off.`);
}

for (const gap of findGaps(sorted.map(([date]) => date))) {
  console.warn(`Missing: ${gap}`);
}

// ---------- Calculated days ----------

function fillCalculatedDays(days, from, until) {
  const official = [...days.keys()].sort();
  if (!official.length) {
    throw new Error("no official days to calculate from");
  }
  const officialUntil = official.at(-1);

  // The latest official day for each month and day of the year.
  const sameDay = new Map();
  for (const date of official) {
    sameDay.set(date.slice(5), date);
  }

  // The last official Hijri date is where the calculated calendar continues.
  const anchor = official.filter((date) => /^\d+ \S+ \d+$/.test(days.get(date).hicri ?? "")).at(-1);
  const hijriOf = anchor ? hijriCalendar(anchor, days.get(anchor).hicri, until) : null;

  let count = 0;
  for (let date = from; date <= until; date = addDay(date)) {
    if (days.has(date)) {
      continue;
    }
    const times = timesFor(date, days, sameDay);
    if (!times) {
      continue;
    }
    const day = { hicri: hijriOf ? hijriOf.label(date) : "" };
    PRAYER_KEYS.forEach((key) => {
      day[key] = times[key];
    });
    day.calc = 1;
    days.set(date, day);
    count++;
  }
  return { officialUntil, count, unsure: hijriOf ? hijriOf.unsure.filter((start) => start > officialUntil) : [] };
}

// Times of the latest official day with the same month and day, moved to the
// target year's summer or winter time. 29 February is the average of the
// days around it.
function timesFor(date, days, sameDay) {
  const monthDay = date.slice(5);
  if (monthDay === "02-29" && !sameDay.has(monthDay)) {
    const before = timesFor(`${date.slice(0, 4)}-02-28`, days, sameDay);
    const after = timesFor(`${date.slice(0, 4)}-03-01`, days, sameDay);
    if (!before || !after) {
      return null;
    }
    const result = {};
    for (const key of PRAYER_KEYS) {
      result[key] = fromMinutes(Math.round((toMinutes(before[key]) + toMinutes(after[key])) / 2));
    }
    return result;
  }
  const source = sameDay.get(monthDay);
  if (!source) {
    return null;
  }
  const shift = (isSummerTime(date) ? 60 : 0) - (isSummerTime(source) ? 60 : 0);
  const result = {};
  for (const key of PRAYER_KEYS) {
    result[key] = fromMinutes(toMinutes(days.get(source)[key]) + shift);
  }
  return result;
}

// German summer time: from the last Sunday of March to the day before the last
// Sunday of October (the prayer times of both change days already follow the
// new time, as in Diyanet's tables).
function isSummerTime(date) {
  const year = Number(date.slice(0, 4));
  return date >= lastSunday(year, 3) && date < lastSunday(year, 10);
}

function lastSunday(year, month) {
  const last = new Date(Date.UTC(year, month, 0));
  last.setUTCDate(last.getUTCDate() - last.getUTCDay());
  return last.toISOString().slice(0, 10);
}

function toMinutes(hhmm) {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return hours * 60 + minutes;
}

function fromMinutes(total) {
  const minutes = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

// The Hijri calendar continued from an official date such as "3 Şaban 1449".
function hijriCalendar(anchorDate, anchorText, until) {
  const [dayText, monthName, yearText] = anchorText.split(" ");
  const anchorMonth = HIJRI_MONTHS.indexOf(monthName);
  if (anchorMonth === -1) {
    throw new Error(`unknown Hijri month: ${monthName}`);
  }
  const months = [{ start: addDay(anchorDate, 1 - Number(dayText)), month: anchorMonth, year: Number(yearText) }];
  const unsure = [];
  for (const moon of newMoons(addDay(months[0].start, 20), addDay(until, 40))) {
    const minutes = moon.getUTCHours() * 60 + moon.getUTCMinutes();
    const start = addDay(moon.toISOString().slice(0, 10), minutes < NEW_MOON_CUTOFF_MINUTES ? 1 : 2);
    const previous = months.at(-1);
    months.push({
      start,
      month: (previous.month + 1) % 12,
      year: previous.month === 11 ? previous.year + 1 : previous.year
    });
    if (minutes >= UNSURE_FROM_MINUTES && minutes <= UNSURE_TO_MINUTES) {
      unsure.push(start);
    }
  }
  return {
    unsure,
    label(date) {
      const month = months.filter((m) => m.start <= date).at(-1);
      const day = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${month.start}T00:00:00Z`)) / 86400000) + 1;
      return `${day} ${HIJRI_MONTHS[month.month]} ${month.year}`;
    }
  };
}

// New moons (UTC) between two dates, from Meeus, Astronomical Algorithms,
// chapter 49 (accurate to a few minutes).
function newMoons(from, until) {
  const start = new Date(`${from}T00:00:00Z`);
  const year = start.getUTCFullYear() + (start - Date.UTC(start.getUTCFullYear(), 0, 1)) / 86400000 / 365.25;
  const result = [];
  for (let k = Math.floor((year - 2000) * 12.3685) - 1; ; k++) {
    const moon = newMoon(k);
    const date = moon.toISOString().slice(0, 10);
    if (date > until) {
      return result;
    }
    if (date >= from) {
      result.push(moon);
    }
  }
}

function newMoon(k) {
  const T = k / 1236.85;
  const rad = (degrees) => (degrees * Math.PI) / 180;
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  const M = rad(2.5534 + 29.1053567 * k - 0.0000014 * T * T - 0.00000011 * T ** 3);
  const Mp = rad(201.5643 + 385.81693528 * k + 0.0107582 * T * T + 0.00001238 * T ** 3 - 0.000000058 * T ** 4);
  const F = rad(160.7108 + 390.67050284 * k - 0.0016118 * T * T - 0.00000227 * T ** 3 + 0.000000011 * T ** 4);
  const O = rad(124.7746 - 1.56375588 * k + 0.0020672 * T * T + 0.00000215 * T ** 3);
  const s = Math.sin;
  let jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T * T - 0.00000015 * T ** 3 + 0.00000000073 * T ** 4;
  jde += -0.4072 * s(Mp) + 0.17241 * E * s(M) + 0.01608 * s(2 * Mp) + 0.01039 * s(2 * F)
    + 0.00739 * E * s(Mp - M) - 0.00514 * E * s(Mp + M) + 0.00208 * E * E * s(2 * M)
    - 0.00111 * s(Mp - 2 * F) - 0.00057 * s(Mp + 2 * F) + 0.00056 * E * s(2 * Mp + M)
    - 0.00042 * s(3 * Mp) + 0.00042 * E * s(M + 2 * F) + 0.00038 * E * s(M - 2 * F)
    - 0.00024 * E * s(2 * Mp - M) - 0.00017 * s(O) - 0.00007 * s(Mp + 2 * M)
    + 0.00004 * s(2 * Mp - 2 * F) + 0.00004 * s(3 * M) + 0.00003 * s(Mp + M - 2 * F)
    + 0.00003 * s(2 * Mp + 2 * F) - 0.00003 * s(Mp + M + 2 * F) + 0.00003 * s(Mp - M + 2 * F)
    - 0.00002 * s(Mp - M - 2 * F) - 0.00002 * s(3 * Mp + M) + 0.00002 * s(4 * Mp);
  const planets = [
    [0.000325, 299.77 + 0.107408 * k - 0.009173 * T * T], [0.000165, 251.88 + 0.016321 * k],
    [0.000164, 251.83 + 26.651886 * k], [0.000126, 349.42 + 36.412478 * k], [0.00011, 84.66 + 18.206239 * k],
    [0.000062, 141.74 + 53.303771 * k], [0.00006, 207.14 + 2.453732 * k], [0.000056, 154.84 + 7.30686 * k],
    [0.000047, 34.52 + 27.261239 * k], [0.000042, 207.19 + 0.121824 * k], [0.00004, 291.34 + 1.844379 * k],
    [0.000037, 161.72 + 24.198154 * k], [0.000035, 239.56 + 25.513099 * k], [0.000023, 331.55 + 3.592518 * k]
  ];
  for (const [weight, angle] of planets) {
    jde += weight * s(rad(angle));
  }
  // From dynamical time to UTC: about 72 seconds in these years.
  return new Date((jde - 2440587.5) * 86400000 - 72000);
}

// ---------- Sources ----------

async function loadApi() {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const result = new Map();

  for (const day of await response.json()) {
    const [dd, mm, yyyy] = day.MiladiTarihKisa.split(".");
    result.set(
      `${yyyy}-${mm}-${dd}`,
      toDay(day.HicriTarihUzun, [day.Imsak, day.Gunes, day.Ogle, day.Ikindi, day.Aksam, day.Yatsi])
    );
  }

  return result;
}

// The page has weekly, monthly and yearly tables with rows like:
// 11 Ekim 2026 Pazar | 30 Rebiulahir 1448 | 05:56 | 07:40 | 13:23 | 16:14 | 18:55 | 20:26
async function loadDiyanetPage() {
  const response = await fetch(DIYANET_URL, { headers: { "User-Agent": "Mozilla/5.0" } });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();
  const result = new Map();

  for (const row of html.match(/<tr>[\s\S]*?<\/tr>/g) ?? []) {
    const cells = [...row.matchAll(/<td>([^<]*)<\/td>/g)].map((match) => decodeEntities(match[1]).trim());

    if (cells.length === 8) {
      result.set(parseTurkishDate(cells[0]), toDay(cells[1], cells.slice(2)));
    }
  }

  if (!result.size) {
    throw new Error("no prayer time rows found on the page");
  }

  return result;
}

function toDay(hicri, times) {
  if (!times.every((time) => /^\d{2}:\d{2}$/.test(time))) {
    throw new Error(`unexpected times: ${times.join(", ")}`);
  }

  const day = { hicri };
  PRAYER_KEYS.forEach((key, index) => {
    day[key] = times[index];
  });
  return day;
}

function parseTurkishDate(text) {
  const [dd, monthName, yyyy] = text.split(/\s+/);
  const month = MONTHS.indexOf(monthName) + 1;

  if (!month || !/^\d{2}$/.test(dd) || !/^\d{4}$/.test(yyyy)) {
    throw new Error(`unexpected date: ${text}`);
  }

  return `${yyyy}-${String(month).padStart(2, "0")}-${dd}`;
}

function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function findGaps(dates) {
  const gaps = [];

  for (let i = 1; i < dates.length; i++) {
    const expected = addDay(dates[i - 1]);
    if (dates[i] !== expected) {
      gaps.push(`${expected} to ${addDay(dates[i], -1)}`);
    }
  }

  return gaps;
}

function addDay(date, amount = 1) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + amount);
  return next.toISOString().slice(0, 10);
}

async function readExistingFile() {
  try {
    const text = await readFile(OUTPUT_FILE, "utf8");
    return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  } catch {
    return null;
  }
}

import { mosqueConfig } from "../config";
import type { AppDataState, DiyanetPrayerDay } from "../types";

const CACHE_KEY = "heidelberg-prayer-times-v1";
const LOCAL_PRAYER_TIMES_URL = `${import.meta.env.BASE_URL}prayer-times.json`;

type LocalPrayerTimesFile = {
  source: string;
  sourceUrl: string;
  districtId: string;
  city: string;
  country: string;
  generatedAt: string;
  requestedYears: number[];
  includedYears: number[];
  note: string;
  days: DiyanetPrayerDay[];
};

type PrayerTimesCache = {
  fetchedAt: string;
  days: DiyanetPrayerDay[];
};

export async function getPrayerTimes(): Promise<AppDataState> {
  try {
    const response = await fetch(LOCAL_PRAYER_TIMES_URL, { cache: "no-cache" });

    if (!response.ok) {
      throw new Error(`Local prayer-times file returned ${response.status}`);
    }

    const file = (await response.json()) as LocalPrayerTimesFile;
    const days = file.days;
    saveCache(days);

    return buildAppDataState(days, getCoverageMessage(file), new Date(file.generatedAt));
  } catch (error) {
    const cached = readCache();

    if (cached) {
      return buildAppDataState(
        cached.days,
        "Yerel dosya okunamadı, kayıtlı Diyanet verisi gösteriliyor.",
        new Date(cached.fetchedAt)
      );
    }

    return buildAppDataState(
      fallbackPrayerTimes,
      "Yerel Diyanet verisi okunamadı, örnek Heidelberg vakitleri gösteriliyor.",
      null
    );
  }
}

function getCoverageMessage(file: LocalPrayerTimesFile) {
  const currentYear = new Intl.DateTimeFormat("de-DE", {
    timeZone: mosqueConfig.timezone,
    year: "numeric"
  }).format(new Date());

  if (file.includedYears.includes(Number(currentYear))) {
    return null;
  }

  return `Yerel Diyanet dosyasında ${file.includedYears.join(", ")} verisi var.`;
}

function saveCache(days: DiyanetPrayerDay[]) {
  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({
      fetchedAt: new Date().toISOString(),
      days
    } satisfies PrayerTimesCache)
  );
}

function readCache(): PrayerTimesCache | null {
  const raw = localStorage.getItem(CACHE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PrayerTimesCache;
    return Array.isArray(parsed.days) ? parsed : null;
  } catch {
    return null;
  }
}

function buildAppDataState(
  days: DiyanetPrayerDay[],
  error: string | null,
  fetchedAt: Date | null
): AppDataState {
  const now = new Date();
  const todayKey = formatDiyanetDateKey(now);
  const tomorrowKey = formatDiyanetDateKey(addDays(now, 1));
  const today = days.find((day) => day.MiladiTarihKisa === todayKey) ?? days[0] ?? null;
  const tomorrow =
    days.find((day) => day.MiladiTarihKisa === tomorrowKey) ??
    days[days.findIndex((day) => day.MiladiTarihKisa === today?.MiladiTarihKisa) + 1] ??
    null;

  return {
    today,
    tomorrow,
    allDays: days,
    error,
    fetchedAt
  };
}

function formatDiyanetDateKey(date: Date) {
  const formatter = new Intl.DateTimeFormat("de-DE", {
    timeZone: mosqueConfig.timezone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

  return formatter.format(date);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

const fallbackPrayerTimes: DiyanetPrayerDay[] = [
  {
    HicriTarihKisa: "22.12.1447",
    HicriTarihKisaIso8601: null,
    HicriTarihUzun: "22 Zilhicce 1447",
    HicriTarihUzunIso8601: null,
    AyinSekliURL: "https://namazvakti.diyanet.gov.tr/images/sondordun.gif",
    MiladiTarihKisa: "08.06.2026",
    MiladiTarihKisaIso8601: "08.06.2026",
    MiladiTarihUzun: "08 Haziran 2026 Pazartesi",
    MiladiTarihUzunIso8601: "2026-06-08T00:00:00.0000000+02:00",
    GreenwichOrtalamaZamani: 3,
    Aksam: "21:35",
    Gunes: "05:13",
    GunesBatis: "21:28",
    GunesDogus: "05:20",
    Ikindi: "17:46",
    Imsak: "03:42",
    KibleSaati: "11:24",
    Ogle: "13:29",
    Yatsi: "22:56"
  }
];

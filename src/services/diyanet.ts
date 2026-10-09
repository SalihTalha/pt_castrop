import { mosqueConfig } from "../config";
import type { AppDataState, DiyanetPrayerDay } from "../types";

const CACHE_KEY = "castrop-rauxel-prayer-times-v1";
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
      `Yerel Diyanet verisi okunamadı, örnek ${mosqueConfig.city} vakitleri gösteriliyor.`,
      null
    );
  }
}

function getCoverageMessage(file: LocalPrayerTimesFile) {
  const todayKey = formatDiyanetDateKey(new Date());

  if (file.days.some((day) => day.MiladiTarihKisa === todayKey)) {
    return null;
  }

  const first = file.days[0]?.MiladiTarihKisa;
  const last = file.days.at(-1)?.MiladiTarihKisa;

  return `Yerel Diyanet dosyasında bugünün verisi yok (${first} – ${last}).`;
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
    HicriTarihKisa: "28.4.1448",
    HicriTarihKisaIso8601: null,
    HicriTarihUzun: "28 Rebiulahir 1448",
    HicriTarihUzunIso8601: null,
    AyinSekliURL: "https://namazvakti.diyanet.gov.tr/images/sd6.gif",
    MiladiTarihKisa: "09.10.2026",
    MiladiTarihKisaIso8601: "09.10.2026",
    MiladiTarihUzun: "09 Ekim 2026 Cuma",
    MiladiTarihUzunIso8601: "2026-10-09T00:00:00.0000000+02:00",
    GreenwichOrtalamaZamani: 3,
    Aksam: "18:59",
    Gunes: "07:37",
    GunesBatis: "18:52",
    GunesDogus: "07:44",
    Ikindi: "16:18",
    Imsak: "05:53",
    KibleSaati: "10:03",
    Ogle: "13:23",
    Yatsi: "20:30"
  }
];

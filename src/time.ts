import { mosqueConfig } from "./config";
import type { DiyanetPrayerDay, PrayerDisplayItem, PrayerKey } from "./types";

export const prayerLabels: Record<PrayerKey, string> = {
  Imsak: "İmsak",
  Gunes: "Güneş",
  Ogle: "Öğle",
  Ikindi: "İkindi",
  Aksam: "Akşam",
  Yatsi: "Yatsı"
};

const prayerOrder: PrayerKey[] = ["Imsak", "Gunes", "Ogle", "Ikindi", "Aksam", "Yatsi"];

export function buildPrayerItems(
  today: DiyanetPrayerDay,
  nextKey: PrayerKey | null,
  currentKey: PrayerKey | null,
  urgentNext = false
): PrayerDisplayItem[] {
  return prayerOrder.map((key) => ({
    key,
    label: prayerLabels[key],
    time: today[key],
    isNext: key === nextKey,
    isCurrent: key === currentKey,
    isUrgent: urgentNext && key === nextKey
  }));
}

export function getClockParts(now: Date) {
  return {
    time: new Intl.DateTimeFormat("tr-TR", {
      timeZone: mosqueConfig.timezone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(now),
    date: new Intl.DateTimeFormat("tr-TR", {
      timeZone: mosqueConfig.timezone,
      day: "2-digit",
      month: "long",
      year: "numeric",
      weekday: "long"
    }).format(now)
  };
}

export function getCountdown(
  now: Date,
  today: DiyanetPrayerDay | null,
  tomorrow: DiyanetPrayerDay | null
) {
  if (!today) {
    return {
      nextKey: null,
      currentKey: null,
      label: "Vakit bekleniyor",
      remaining: "--:--:--",
      remainingMs: null,
      isFinalFiveMinutes: false
    };
  }

  const schedule = prayerOrder.map((key) => ({
    key,
    date: combineDateAndTime(now, today[key])
  }));

  const next = schedule.find((item) => item.date.getTime() > now.getTime());
  const current = [...schedule].reverse().find((item) => item.date.getTime() <= now.getTime());

  if (next) {
    const remainingMs = next.date.getTime() - now.getTime();

    return {
      nextKey: next.key,
      currentKey: current?.key ?? null,
      label: `${prayerLabels[next.key]} Vaktine Kalan Süre`,
      remaining: formatDuration(remainingMs),
      remainingMs,
      isFinalFiveMinutes: remainingMs <= 5 * 60 * 1000
    };
  }

  const tomorrowImsak = tomorrow
    ? combineDateAndTime(addDays(now, 1), tomorrow.Imsak)
    : combineDateAndTime(addDays(now, 1), today.Imsak);

  const remainingMs = tomorrowImsak.getTime() - now.getTime();

  return {
    nextKey: "Imsak" as PrayerKey,
    currentKey: current?.key ?? "Yatsi",
    label: `${prayerLabels.Imsak} Vaktine Kalan Süre`,
    remaining: formatDuration(remainingMs),
    remainingMs,
    isFinalFiveMinutes: remainingMs <= 5 * 60 * 1000
  };
}

export function getFormattedFetchTime(date: Date | null) {
  if (!date) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: mosqueConfig.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function combineDateAndTime(reference: Date, hhmm: string) {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: mosqueConfig.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(reference);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

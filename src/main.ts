import { mosqueConfig, refreshConfig } from "./config";
import { scheduleFitText } from "./fitText";
import { getPrayerTimes } from "./services/diyanet";
import { getWeather } from "./services/weather";
import {
  buildPrayerItems,
  getClockParts,
  getCountdown,
  getFormattedFetchTime
} from "./time";
import type { AppDataState, PrayerDisplayItem, WeatherState } from "./types";
import "./styles.css";

declare global {
  interface Window {
    __PRAYER_DISPLAY_TEST_TIME__?: string | number | Date | null;
    setPrayerDisplayTime?: (value: string | number | Date) => void;
    clearPrayerDisplayTime?: () => void;
  }
}

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("App root was not found");
}

const appRoot = root;
const logoUrl = `${import.meta.env.BASE_URL}logo.png`;

let appData: AppDataState = {
  today: null,
  tomorrow: null,
  allDays: [],
  error: null,
  fetchedAt: null
};

let weather: WeatherState = {
  temperature: null,
  code: null,
  label: "Yükleniyor",
  fetchedAt: null
};

async function boot() {
  exposeConsoleTestingHelpers();
  render();
  await Promise.all([refreshPrayerTimes(), refreshWeather()]);
  render();

  window.setInterval(() => render(), refreshConfig.tickMs);
  window.setInterval(refreshPrayerTimes, refreshConfig.prayerTimesMs);
  window.setInterval(refreshWeather, refreshConfig.weatherMs);
}

async function refreshPrayerTimes() {
  appData = await getPrayerTimes();
  render();
}

async function refreshWeather() {
  weather = await getWeather();
  render();
}

function render() {
  const now = getDisplayNow();
  const clock = getClockParts(now);
  const countdown = getCountdown(now, appData.today, appData.tomorrow);
  const prayerItems = appData.today
    ? buildPrayerItems(
        appData.today,
        countdown.nextKey,
        countdown.currentKey,
        countdown.isFinalFiveMinutes
      )
    : [];

  appRoot.innerHTML = `
    <main class="screen" aria-label="${mosqueConfig.mosqueName} namaz vakitleri">
      <div class="ambient ambient-one"></div>
      <div class="ambient ambient-two"></div>
      <section class="topbar">
        <div class="brand-lockup" data-fit-boundary aria-label="${mosqueConfig.mosqueName}">
          <div class="brand-mark">
            <img class="brand-logo" src="${logoUrl}" alt="" />
          </div>
          <div class="brand-copy">
            <p class="location" data-fit data-fit-min="12">${mosqueConfig.city}, ${mosqueConfig.country}</p>
            <h1 data-fit data-fit-min="18">${mosqueConfig.mosqueName}</h1>
          </div>
        </div>
        <div class="title-panel" data-fit-boundary>
          <p data-fit data-fit-min="18">${mosqueConfig.subtitle}</p>
          <strong data-fit data-fit-min="18">Diyanet</strong>
        </div>
      </section>

      <section class="content-grid">
        <div class="prayer-grid">
          ${renderPrayerCards(prayerItems)}
        </div>

        <aside class="info-stack">
          <section class="clock-panel" data-fit-boundary aria-label="Saat ve tarih">
            <p class="eyebrow" data-fit data-fit-min="12">Saat</p>
            <div class="live-clock" data-fit data-fit-min="24">${clock.time}</div>
            <div class="date-line" data-fit data-fit-min="14">${appData.today?.MiladiTarihUzun ?? clock.date}</div>
            <div class="hijri-line" data-fit data-fit-min="12">${appData.today?.HicriTarihUzun ?? ""}</div>
          </section>

          <section class="detail-panel" aria-label="Hava durumu ve kible">
            <div class="weather-block" data-fit-boundary>
              <p class="eyebrow" data-fit data-fit-min="12">Hava Durumu</p>
              <div class="weather-main">
                ${renderWeatherIcon(weather.code)}
                <div>
                  <strong data-fit data-fit-min="18">${formatTemperature(weather.temperature)}</strong>
                  <span data-fit data-fit-min="11">${weather.label}</span>
                </div>
              </div>
            </div>
            <div class="qibla-block" data-fit-boundary>
              <p class="eyebrow" data-fit data-fit-min="12">Kıble Saati</p>
              <strong data-fit data-fit-min="18">${appData.today?.KibleSaati ?? "--:--"}</strong>
              <span data-fit data-fit-min="11">Son veri ${getFormattedFetchTime(appData.fetchedAt)}</span>
            </div>
          </section>
        </aside>
      </section>

      <section class="countdown-panel" data-fit-boundary aria-live="polite">
        <span data-fit data-fit-min="18">${countdown.label}</span>
        <strong data-fit data-fit-min="20">${countdown.remaining}</strong>
      </section>

      ${appData.error ? `<div class="status-line">${appData.error}</div>` : ""}
    </main>
  `;

  scheduleFitText(appRoot);
}

function exposeConsoleTestingHelpers() {
  window.setPrayerDisplayTime = (value: string | number | Date) => {
    window.__PRAYER_DISPLAY_TEST_TIME__ = value;
    render();
  };

  window.clearPrayerDisplayTime = () => {
    window.__PRAYER_DISPLAY_TEST_TIME__ = null;
    render();
  };
}

function getDisplayNow() {
  const override = window.__PRAYER_DISPLAY_TEST_TIME__;

  if (override === null || override === undefined || override === "") {
    return new Date();
  }

  const parsed = parseTestTime(override);
  return parsed ?? new Date();
}

function parseTestTime(value: string | number | Date) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value);
  }

  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const trimmed = value.trim();
  const timeOnly = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);

  if (timeOnly) {
    const date = new Date();
    date.setHours(
      Number(timeOnly[1]),
      Number(timeOnly[2]),
      Number(timeOnly[3] ?? "0"),
      0
    );
    return date;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

function renderPrayerCards(items: PrayerDisplayItem[]) {
  if (!items.length) {
    return Array.from({ length: 6 })
      .map(
        () => `
          <article class="prayer-card skeleton">
            <span data-fit data-fit-min="14">Yükleniyor</span>
            <strong data-fit data-fit-min="20">--:--</strong>
          </article>
        `
      )
      .join("");
  }

  return items
    .map(
      (item) => `
        <article class="prayer-card ${item.isNext ? "is-next" : ""} ${item.isCurrent ? "is-current" : ""} ${item.isUrgent ? "is-urgent" : ""}" data-fit-boundary>
          <span data-fit data-fit-min="16">${item.label}</span>
          <strong data-fit data-fit-min="28">${item.time}</strong>
        </article>
      `
    )
    .join("");
}

function renderWeatherIcon(code: number | null) {
  const iconClass = getWeatherIconClass(code);

  if (iconClass === "weather-sun") {
    return `
      <svg class="weather-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <circle cx="32" cy="32" r="14" fill="#f3d46a" />
        <g stroke="#f3d46a" stroke-width="5" stroke-linecap="round">
          <path d="M32 7v7" />
          <path d="M32 50v7" />
          <path d="M7 32h7" />
          <path d="M50 32h7" />
          <path d="M14 14l5 5" />
          <path d="M45 45l5 5" />
          <path d="M50 14l-5 5" />
          <path d="M19 45l-5 5" />
        </g>
      </svg>
    `;
  }

  if (iconClass === "weather-rain") {
    return `
      <svg class="weather-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <path d="M20 45h29c7 0 12-5 12-11s-5-11-12-11h-1C46 14 38 8 29 10c-8 1-14 8-14 16h-1C8 26 3 31 3 37s5 8 17 8Z" fill="#d7f0ef" />
        <g stroke="#8fd7ff" stroke-width="5" stroke-linecap="round">
          <path d="M22 51v8" />
          <path d="M34 51v8" />
          <path d="M46 51v8" />
        </g>
      </svg>
    `;
  }

  if (iconClass === "weather-snow") {
    return `
      <svg class="weather-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <path d="M20 45h29c7 0 12-5 12-11s-5-11-12-11h-1C46 14 38 8 29 10c-8 1-14 8-14 16h-1C8 26 3 31 3 37s5 8 17 8Z" fill="#d7f0ef" />
        <g fill="#ffffff">
          <circle cx="23" cy="56" r="3" />
          <circle cx="35" cy="56" r="3" />
          <circle cx="47" cy="56" r="3" />
        </g>
      </svg>
    `;
  }

  return `
    <svg class="weather-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path d="M20 45h29c7 0 12-5 12-11s-5-11-12-11h-1C46 14 38 8 29 10c-8 1-14 8-14 16h-1C8 26 3 31 3 37s5 8 17 8Z" fill="#d7f0ef" />
    </svg>
  `;
}

function getWeatherIconClass(code: number | null) {
  if (code === null) {
    return "weather-unknown";
  }

  if ([0, 1].includes(code)) {
    return "weather-sun";
  }

  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return "weather-rain";
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return "weather-snow";
  }

  return "weather-cloud";
}

function formatTemperature(value: number | null) {
  if (value === null) {
    return "--.- °C";
  }

  return `${value.toFixed(1).replace(".", ",")} °C`;
}

boot();

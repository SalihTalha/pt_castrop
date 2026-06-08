import { mosqueConfig } from "../config";
import type { WeatherState } from "../types";

const WEATHER_URL = new URL("https://api.open-meteo.com/v1/forecast");
WEATHER_URL.searchParams.set("latitude", String(mosqueConfig.coordinates.latitude));
WEATHER_URL.searchParams.set("longitude", String(mosqueConfig.coordinates.longitude));
WEATHER_URL.searchParams.set("current", "temperature_2m,weather_code");
WEATHER_URL.searchParams.set("timezone", mosqueConfig.timezone);

type OpenMeteoResponse = {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
  };
};

export async function getWeather(): Promise<WeatherState> {
  try {
    const response = await fetch(WEATHER_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Weather API returned ${response.status}`);
    }

    const payload = (await response.json()) as OpenMeteoResponse;
    const code = payload.current?.weather_code ?? null;

    return {
      temperature: payload.current?.temperature_2m ?? null,
      code,
      label: getWeatherLabel(code),
      fetchedAt: new Date()
    };
  } catch {
    return {
      temperature: null,
      code: null,
      label: "Bilgi yok",
      fetchedAt: null
    };
  }
}

function getWeatherLabel(code: number | null) {
  if (code === null) {
    return "Bilgi yok";
  }

  if ([0, 1].includes(code)) {
    return "Açık";
  }

  if ([2, 3].includes(code)) {
    return "Parçalı bulutlu";
  }

  if ([45, 48].includes(code)) {
    return "Sisli";
  }

  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return "Yağmurlu";
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return "Karlı";
  }

  if ([95, 96, 99].includes(code)) {
    return "Fırtınalı";
  }

  return "Değişken";
}

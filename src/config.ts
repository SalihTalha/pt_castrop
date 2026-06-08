export const mosqueConfig = {
  mosqueName: "Yavuz Sultan Selim Camii",
  subtitle: "Namaz Vakitleri",
  city: "Heidelberg",
  country: "Almanya",
  timezone: "Europe/Berlin",
  diyanetDistrictId: "11033",
  coordinates: {
    latitude: 49.4094,
    longitude: 8.6947
  }
} as const;

export const refreshConfig = {
  prayerTimesMs: 1000 * 60 * 60 * 6,
  weatherMs: 1000 * 60 * 30,
  tickMs: 1000
} as const;

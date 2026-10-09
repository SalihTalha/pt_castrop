export const mosqueConfig = {
  mosqueName: "IGMG Castrop-Rauxel Merkez Camii",
  subtitle: "Namaz Vakitleri",
  city: "Castrop-Rauxel",
  country: "Almanya",
  timezone: "Europe/Berlin",
  diyanetDistrictId: "10964",
  coordinates: {
    latitude: 51.5500,
    longitude: 7.3167
  }
} as const;

export const refreshConfig = {
  prayerTimesMs: 1000 * 60 * 60 * 6,
  weatherMs: 1000 * 60 * 30,
  tickMs: 1000
} as const;

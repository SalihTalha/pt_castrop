export type PrayerKey = "Imsak" | "Gunes" | "Ogle" | "Ikindi" | "Aksam" | "Yatsi";

export type DiyanetPrayerDay = {
  HicriTarihKisa: string | null;
  HicriTarihKisaIso8601: string | null;
  HicriTarihUzun: string | null;
  HicriTarihUzunIso8601: string | null;
  AyinSekliURL: string | null;
  MiladiTarihKisa: string;
  MiladiTarihKisaIso8601: string;
  MiladiTarihUzun: string;
  MiladiTarihUzunIso8601: string;
  GreenwichOrtalamaZamani: number;
  Aksam: string;
  Gunes: string;
  GunesBatis: string;
  GunesDogus: string;
  Ikindi: string;
  Imsak: string;
  KibleSaati: string;
  Ogle: string;
  Yatsi: string;
};

export type PrayerDisplayItem = {
  key: PrayerKey;
  label: string;
  time: string;
  isNext: boolean;
  isCurrent: boolean;
  isUrgent: boolean;
};

export type WeatherState = {
  temperature: number | null;
  code: number | null;
  label: string;
  fetchedAt: Date | null;
};

export type AppDataState = {
  today: DiyanetPrayerDay | null;
  tomorrow: DiyanetPrayerDay | null;
  allDays: DiyanetPrayerDay[];
  error: string | null;
  fetchedAt: Date | null;
};

export const DAY_MS = 40 * 60 * 1000;
export const EPOCH = Date.UTC(2026, 0, 1);
export const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'] as const;
export type Season = (typeof SEASONS)[number];
export type Weather = 'Sunny' | 'Rain' | 'Snow';
export type WorldPreview = { hour: number; season: Season; weather: Weather };
const mod = (n: number, d: number) => ((n % d) + d) % d;
const smooth = (n: number) => {
  const x = Math.min(1, Math.max(0, n));
  return x * x * (3 - 2 * x);
};
export function worldAt(now: number, preview?: WorldPreview) {
  const elapsed = now - EPOCH;
  const day = Math.floor(elapsed / DAY_MS);
  const season = preview?.season ?? SEASONS[mod(Math.floor(day / 4), 4)];
  const hour = preview?.hour ?? mod((elapsed / DAY_MS) * 24 + 6, 24);
  const weatherSlot = Math.floor(elapsed / 300000);
  const weather: Weather =
    preview?.weather ??
    (mod(weatherSlot * 7 + day, 5) < 2
      ? season === 'Winter'
        ? 'Snow'
        : 'Rain'
      : 'Sunny');
  const previousSlot = weatherSlot - 1;
  const previousDay = Math.floor((previousSlot * 300000) / DAY_MS);
  const previousSeason = SEASONS[mod(Math.floor(previousDay / 4), 4)];
  const previousWeather =
    mod(previousSlot * 7 + previousDay, 5) < 2
      ? previousSeason === 'Winter'
        ? 'Snow'
        : 'Rain'
      : 'Sunny';
  const transition = preview ? 1 : smooth(mod(elapsed, 300000) / 45000);
  const blend = (type: Weather) =>
    (previousWeather === type ? 1 : 0) * (1 - transition) +
    (weather === type ? 1 : 0) * transition;
  const sunAngle = ((hour - 6) / 24) * Math.PI * 2;
  const daylight = smooth((Math.sin(sunAngle) + 0.16) / 0.5);
  return {
    hour,
    season,
    weather,
    daylight,
    sunAngle,
    rain: blend('Rain'),
    snow: blend('Snow'),
    distance: mod((elapsed / 1000) * 6.5, 384),
    seconds: elapsed / 1000,
  };
}
export function messageBody(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const body = value.trim();
  return body.length > 0 &&
    body.length <= 300 &&
    !Array.from(body).some((char) => {
      const code = char.charCodeAt(0);
      return code < 32 && code !== 9 && code !== 10 && code !== 13;
    })
    ? body
    : null;
}

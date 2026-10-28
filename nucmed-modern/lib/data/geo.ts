import { COUNTRIES, DEFAULT_COUNTRY } from "./countries";
import { RUSSIAN_CITIES } from "./russian-cities";
import { WORLD_CITIES } from "./world-cities";

export { COUNTRIES, DEFAULT_COUNTRY };

/**
 * Города для автодополнения по выбранной стране. Для России — полный
 * справочник (1100+ городов), для остальных стран — крупные города из
 * WORLD_CITIES. Если страна не распознана, возвращает пустой список —
 * поле города остаётся обычным текстовым вводом.
 */
export function getCitiesForCountry(countryName: string): string[] {
  if (countryName === DEFAULT_COUNTRY) {
    return RUSSIAN_CITIES.map((c) => c.name);
  }
  return WORLD_CITIES.filter((c) => c.country === countryName).map((c) => c.name);
}

export function searchCountries(query: string, limit = 10): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return COUNTRIES.slice(0, limit).map((c) => c.name);
  return COUNTRIES.filter((c) => c.name.toLowerCase().startsWith(q))
    .slice(0, limit)
    .map((c) => c.name);
}

export function searchCities(countryName: string, query: string, limit = 10): string[] {
  const q = query.trim().toLowerCase();
  const cities = getCitiesForCountry(countryName);
  if (!q) return cities.slice(0, limit);
  return cities.filter((c) => c.toLowerCase().startsWith(q)).slice(0, limit);
}

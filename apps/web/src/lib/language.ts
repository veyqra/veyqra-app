export type Locale = "de" | "en";
export type LanguagePreference = Locale | "system";

export const LANGUAGE_COOKIE = "veyqra-language";

export function resolveLocale(language?: string | null): Locale {
  return language?.toLowerCase().startsWith("de") ? "de" : "en";
}

export function isLanguagePreference(
  value?: string | null
): value is LanguagePreference {
  return value === "system" || value === "de" || value === "en";
}

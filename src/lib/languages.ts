// The languages the Language page and its APIs support. Dependency-free so
// both client components and API routes can import it.
export const LANGUAGES = ['Arabic', 'English', 'German', 'Japanese', 'Spanish', 'Vietnamese'] as const;

export type Language = (typeof LANGUAGES)[number];

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

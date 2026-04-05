import { differenceInYears, format, isValid, parseISO } from "date-fns";

export function parseBirthDate(value?: string | null): Date | null {
  if (!value) return null;

  const parsed = parseISO(value);
  if (!isValid(parsed)) return null;

  return parsed;
}

export function isValidBirthDate(value: string): boolean {
  return parseBirthDate(value) !== null;
}

export function isAtLeastAge(value: string, minimumAge: number): boolean {
  const birthDate = parseBirthDate(value);
  if (!birthDate) return false;

  return differenceInYears(new Date(), birthDate) >= minimumAge;
}

export function calculateAgeFromBirthDate(value?: string | null): number | null {
  const birthDate = parseBirthDate(value);
  if (!birthDate) return null;

  return differenceInYears(new Date(), birthDate);
}

export function formatBirthDate(value?: string | null): string {
  const birthDate = parseBirthDate(value);
  if (!birthDate) return "";

  return format(birthDate, "dd MMM yyyy");
}

export function toBirthDateValue(date: Date): string {
  return format(date, "yyyy-MM-dd");
}
import { Plot, PersonalizedFertilizerItem, PersonalizedSprayItem } from "@/types";

export function getDateInIndia(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function dateFromCropDay(sowingDate: string, day: number): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(sowingDate);
  if (!match || !Number.isInteger(day) || day < 1) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() !== Number(match[2]) - 1 ||
    date.getUTCDate() !== Number(match[3])
  ) {
    return null;
  }
  date.setUTCDate(date.getUTCDate() + day - 1);
  return date.toISOString().slice(0, 10);
}

export function isValidScheduleDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return dateFromCropDay(value, 1) === value;
}

export function getSprayScheduledDate(
  plot: Pick<Plot, "sowingDate">,
  item: Pick<PersonalizedSprayItem, "day" | "scheduledDate">
): string | null {
  return item.scheduledDate || dateFromCropDay(plot.sowingDate, item.day);
}

export function getFertilizerScheduledDate(
  plot: Pick<Plot, "sowingDate">,
  item: Pick<PersonalizedFertilizerItem, "day" | "scheduledDate">
): string | null {
  return item.scheduledDate || dateFromCropDay(plot.sowingDate, item.day);
}

export function formatScheduleDate(date: string, language: "en" | "mr"): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(language === "mr" ? "mr-IN" : "en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBDT(amount: number): string {
  return `৳${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function getMonthLabel(month: string): string {
  const [year, m] = month.split("-");
  const date = new Date(parseInt(year), parseInt(m) - 1, 1);
  return date.toLocaleString("en-US", { month: "long", year: "numeric" });
}

export function prevMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(year, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function nextMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(year, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatDate(date: string | Date): string {
  const d = date instanceof Date ? date : new Date(date + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function toDateString(date: string | Date): string {
  if (date instanceof Date) return date.toISOString().slice(0, 10);
  return date;
}


import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | null | undefined, options: Intl.NumberFormatOptions = {}): string {
  if (amount === null || amount === undefined) return "$0.00";
  
  const numberAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(numberAmount);
}

export function formatPercentage(value: number | string | null | undefined, digits: number = 2): string {
  if (value === null || value === undefined) return "0.00%";
  
  const numberValue = typeof value === "string" ? parseFloat(value) : value;
  
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(numberValue / 100);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(dateObj);
}

export function calculateProgressPercentage(startDate: Date | string, endDate: Date | string): number {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = new Date().getTime();
  
  // If the CD has already matured
  if (now >= end) return 100;
  
  // If the CD hasn't started yet
  if (now <= start) return 0;
  
  const totalDuration = end - start;
  const elapsed = now - start;
  
  return Math.min(100, Math.round((elapsed / totalDuration) * 100));
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export const termLengthToString = (months: number): string => {
  if (months < 12) {
    return `${months} Month${months > 1 ? 's' : ''}`;
  } else {
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (remainingMonths === 0) {
      return `${years} Year${years > 1 ? 's' : ''}`;
    } else {
      return `${years} Year${years > 1 ? 's' : ''} ${remainingMonths} Month${remainingMonths > 1 ? 's' : ''}`;
    }
  }
};

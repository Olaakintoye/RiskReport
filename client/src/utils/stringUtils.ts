/**
 * String utility functions for safe string operations
 * Prevents errors when dealing with null/undefined values
 */

/**
 * Safely extract a substring from a string value
 * @param value - The string value to extract from
 * @param start - The start index
 * @param end - The end index (optional)
 * @param fallback - Fallback value if extraction fails
 * @returns The extracted substring or fallback
 */
export const safeSubstring = (
  value: unknown, 
  start: number, 
  end?: number, 
  fallback = ''
): string => {
  if (typeof value !== 'string' || value == null) {
    return fallback;
  }
  
  try {
    return end !== undefined ? value.substring(start, end) : value.substring(start);
  } catch {
    return fallback;
  }
};

/**
 * Safely get the first N characters of a string for display purposes
 * @param value - The string value
 * @param length - Number of characters to extract
 * @param fallback - Fallback value if extraction fails
 * @returns The first N characters or fallback
 */
export const safeAbbreviation = (
  value: unknown, 
  length: number, 
  fallback = 'N/A'
): string => {
  if (typeof value !== 'string' || value == null || value.trim() === '') {
    return fallback;
  }
  
  const trimmed = value.trim();
  return trimmed.length <= length ? trimmed : trimmed.substring(0, length);
};

/**
 * Safely truncate a string with ellipsis
 * @param value - The string value
 * @param maxLength - Maximum length before truncation
 * @param ellipsis - Ellipsis string to append
 * @param fallback - Fallback value if input is invalid
 * @returns Truncated string or fallback
 */
export const safeTruncate = (
  value: unknown, 
  maxLength: number, 
  ellipsis = '...', 
  fallback = 'No description available'
): string => {
  if (typeof value !== 'string' || value == null || value.trim() === '') {
    return fallback;
  }
  
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  
  return trimmed.substring(0, maxLength - ellipsis.length) + ellipsis;
};

/**
 * Safely get a display name from a value
 * @param value - The value to convert to display name
 * @param fallback - Fallback display name
 * @returns Display name or fallback
 */
export const safeDisplayName = (
  value: unknown, 
  fallback = 'Unnamed'
): string => {
  if (typeof value !== 'string' || value == null || value.trim() === '') {
    return fallback;
  }
  
  return value.trim();
};

/**
 * Type guard to check if a value is a non-empty string
 * @param value - The value to check
 * @returns True if value is a non-empty string
 */
export const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value != null && value.trim() !== '';
};

/**
 * Create a safe scenario symbol from a name
 * @param name - The scenario name
 * @param fallback - Fallback symbol
 * @returns Safe scenario symbol
 */
export const createScenarioSymbol = (
  name: unknown, 
  fallback = 'SCN'
): string => {
  return safeAbbreviation(name, 3, fallback).toUpperCase();
}; 
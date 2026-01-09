const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/**
 * Parse a date string in "YYYY-MM-DD HH:MM" format
 * Returns [year, month, day] as strings
 */
export function parsePostDate(dateString: string): [string, string, string] {
  const datePart = dateString.split(' ')[0];
  const [year, month, day] = datePart.split('-');
  return [year, month, day];
}

/**
 * Get month name from 1-indexed month number
 */
export function getMonthName(monthNumber: number): string {
  const index = monthNumber - 1;
  if (index < 0 || index > 11) {
    throw new Error(`Invalid month number: ${String(monthNumber)}`);
  }
  return MONTH_NAMES[index];
}

/**
 * Get month name from month string (e.g., "01" -> "January")
 */
export function getMonthNameFromString(monthString: string): string {
  const monthNumber = parseInt(monthString, 10);
  return getMonthName(monthNumber);
}

/**
 * Format a date string for display
 * Input: "YYYY-MM-DD HH:MM" or "YYYY-MM-DD"
 * Output: "January 8, 2026"
 */
export function formatDate(date: string): string {
  return new Date(date.replace(/-/g, '/')).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Compare two date strings for sorting (newest first)
 */
export function compareDatesDescending(a: string, b: string): number {
  return parseInt(b) - parseInt(a);
}

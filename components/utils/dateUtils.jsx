import { format, parseISO } from "date-fns";

/**
 * Converts a UTC date string (from DB) to a formatted Local Time string.
 * @param {string} dateString - ISO UTC date string.
 * @param {string} formatStr - date-fns format string (default: 'MMM d, HH:mm').
 * @returns {string} - Formatted local time string.
 */
export function toLocalTime(dateString, formatStr = 'MMM d, HH:mm') {
  if (!dateString) return 'TBD';
  try {
    const date = parseISO(dateString);
    return format(date, formatStr);
  } catch (error) {
    console.error("Date conversion error:", error);
    return dateString;
  }
}

/**
 * Returns the user's local time zone code (e.g., 'EST', 'GMT+1').
 * @returns {string}
 */
export function getLocalTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Formats a date for input fields (datetime-local) in local time
 * @param {string} dateString 
 * @returns {string}
 */
export function toInputDateTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  // Adjust for timezone offset to ensure the input shows the correct local time
  const offsetMs = date.getTimezoneOffset() * 60000;
  const localISOTime = (new Date(date.getTime() - offsetMs)).toISOString().slice(0, 16);
  return localISOTime;
}
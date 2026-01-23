/**
 * Formats large numbers with appropriate unit suffixes
 * 0 -> 0
 * 1000 -> 1K
 * 1000000 -> 1M
 * 1000000000 -> 1B
 */
export function formatAUEC(value) {
  if (value === 0) return '0';
  
  const absValue = Math.abs(value);
  
  if (absValue >= 1000000000) {
    return (value / 1000000000).toFixed(2) + 'B';
  }
  if (absValue >= 1000000) {
    return (value / 1000000).toFixed(2) + 'M';
  }
  if (absValue >= 1000) {
    return (value / 1000).toFixed(2) + 'K';
  }
  
  return Math.floor(value).toString();
}
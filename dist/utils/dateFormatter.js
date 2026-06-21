// utils/dateFormatter.js - LAW48 Compatible
export function formatDate(ts) {
  try {
    // Handle string, number, or undefined/null
    const timestamp = ts ? (typeof ts === "string" ? ts : Number(ts)) : Date.now();
    const date = new Date(timestamp);

    // Robust formatting (your preferred style + fallback)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/,/g, '');   // Removes comma for clean log output
  } catch (e) {
    // Fallback
    return new Date().toLocaleString('en-US', { 
      hour12: false 
    });
  }
}

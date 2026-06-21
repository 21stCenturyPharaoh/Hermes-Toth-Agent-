// utils/dateFormatter.js
export function formatDate(ts) {
  // Handles both ISO strings and numeric timestamps
  const date = new Date(
    typeof ts === "string" ? ts : Number(ts)
  );
  return date.toLocaleString();
}

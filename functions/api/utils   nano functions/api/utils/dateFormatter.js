// utils/dateFormatter.js
  export function formatDate(ts) {
    const date = new Date(
      typeof ts === "string" ? ts : Number(ts)
    );
    return date.toLocaleString();
  }

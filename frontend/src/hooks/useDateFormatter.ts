const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";

  const date = new Date(dateString);

  const parts = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).formatToParts(date);

  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  const year = parts.find((p) => p.type === "year")?.value;

  return `${month} ${day}, ${year}`;
};

export default function useDateFormatter() {
  return { formatDate };
}
export const cents = (p: number) => `${Math.max(1, Math.min(99, Math.round(p * 100)))}¢`;
export const pct = (p: number) => `${Math.round(p * 100)}%`;
export const coins = (n: number) => Math.round(n).toLocaleString();

export function compact(n: number) {
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function countdown(iso: string, now = Date.now()) {
  const ms = Date.parse(iso) - now;
  const abs = Math.abs(ms);
  const d = Math.floor(abs / 86_400_000);
  const h = Math.floor((abs % 86_400_000) / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  const s = Math.floor((abs % 60_000) / 1000);
  const text = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
  return { live: ms <= 0, text };
}

export const METRIC_LABEL: Record<string, string> = {
  wishlists_d1: "Day-1 Wishlists",
  favorites_d1: "Day-1 Favorites",
  revenue_w1: "Week-1 Revenue",
  revenue_m1: "Month-1 Revenue",
  reviews_w1: "Week-1 Reviews",
  rating_w1: "Week-1 Rating",
  visits_w1: "Week-1 Visits",
};

export const METRIC_ICON: Record<string, string> = {
  wishlists_d1: "⭐",
  favorites_d1: "❤️",
  revenue_w1: "💵",
  revenue_m1: "💰",
  reviews_w1: "💬",
  rating_w1: "👍",
  visits_w1: "🚪",
};

/** One colour per bucket, low → high. */
export const BUCKET_COLORS = ["#5ad1ff", "#7ae582", "#ffd23f", "#ff9f1c", "#ff4ecd"];

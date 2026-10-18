// Valve's public store endpoints. No key needed.
// Reviews: https://partner.steamgames.com/doc/store/getreviews
import { getJson, UpstreamError, type Fetch } from "./http.ts";

interface ReviewsResponse {
  success: number;
  query_summary?: { total_reviews: number; total_positive: number; total_negative: number };
}

/** Total and positive review counts. `purchase_type=all` includes key activations, not just Steam purchases. */
export async function steamReviews(appId: number, fetchImpl?: Fetch) {
  const url =
    `https://store.steampowered.com/appreviews/${appId}` +
    `?json=1&language=all&purchase_type=all&filter=all&review_type=all&num_per_page=1&cursor=*`;
  const r = await getJson<ReviewsResponse>(url, { fetchImpl });
  if (r.success !== 1 || !r.query_summary) throw new UpstreamError(`Steam has no reviews summary for app ${appId}`, 404);
  return { totalReviews: r.query_summary.total_reviews, totalPositive: r.query_summary.total_positive };
}

interface AppDetailsResponse {
  [appId: string]: {
    success: boolean;
    data?: {
      name: string;
      short_description: string;
      header_image: string;
      developers?: string[];
      genres?: { description: string }[];
      release_date: { coming_soon: boolean; date: string };
    };
  };
}

/** Store page details, used to list a real game by its app id. */
export async function steamAppDetails(appId: number, fetchImpl?: Fetch) {
  const r = await getJson<AppDetailsResponse>(
    `https://store.steampowered.com/api/appdetails?appids=${appId}&l=english&cc=us`,
    { fetchImpl },
  );
  const d = r[appId]?.data;
  if (!r[appId]?.success || !d) throw new UpstreamError(`Steam app ${appId} not found`, 404);
  const parsed = Date.parse(d.release_date.date);
  return {
    title: d.name,
    tagline: d.short_description,
    imageUrl: d.header_image,
    studio: d.developers?.[0] ?? "Unknown studio",
    genre: d.genres?.map((g) => g.description).slice(0, 2).join(" / ") || "Game",
    comingSoon: d.release_date.coming_soon,
    // Steam dates are free text ("Coming soon", "Q1 2027", "Nov 14, 2026"); only exact dates parse.
    releaseAt: Number.isFinite(parsed) ? new Date(parsed).toISOString() : null,
  };
}

import type { MarketView } from "../../../shared/types.ts";
import { BUCKET_COLORS } from "../format.ts";

/** Probability of every bucket over time, one line each. */
export function OddsChart({ market }: { market: MarketView }) {
  const pts = market.history.length > 1 ? market.history : [...market.history, { at: "", prices: market.prices }];
  const W = 600;
  const H = 120;
  const x = (i: number) => (i / Math.max(1, pts.length - 1)) * W;
  const y = (p: number) => H - p * H;

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Odds over time">
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={0} x2={W} y1={y(g)} y2={y(g)} className="grid" />
        ))}
        {market.outcomes.map((_, o) => (
          <polyline
            key={o}
            fill="none"
            stroke={BUCKET_COLORS[o % BUCKET_COLORS.length]}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            points={pts.map((h, i) => `${x(i)},${y(h.prices[o])}`).join(" ")}
          />
        ))}
      </svg>
      <figcaption>
        {market.outcomes.map((o, i) => (
          <span key={i}>
            <i style={{ background: BUCKET_COLORS[i % BUCKET_COLORS.length] }} />
            {o.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

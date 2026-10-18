// Logarithmic Market Scoring Rule (Hanson). The house is the counterparty for every
// trade, so a market is always liquid even with one player. Each share of the winning
// outcome pays 1 coin; prices are probabilities that sum to 1.

function logSumExp(q: number[], b: number): number {
  const m = Math.max(...q.map((x) => x / b));
  return m + Math.log(q.reduce((s, x) => s + Math.exp(x / b - m), 0));
}

export function cost(q: number[], b: number): number {
  return b * logSumExp(q, b);
}

export function prices(q: number[], b: number): number[] {
  const m = Math.max(...q.map((x) => x / b));
  const e = q.map((x) => Math.exp(x / b - m));
  const s = e.reduce((a, x) => a + x, 0);
  return e.map((x) => x / s);
}

/** Shares of `outcome` that `spend` coins buys. Closed form of C(q + x·e_i) − C(q) = spend. */
export function sharesForSpend(q: number[], b: number, outcome: number, spend: number): number {
  if (spend <= 0) return 0;
  const p = prices(q, b)[outcome];
  // x = b·ln(1 + (e^{spend/b} − 1) / p_i)
  return b * Math.log1p(Math.expm1(spend / b) / p);
}

/** Coins paid out for selling `shares` of `outcome` back to the market maker. */
export function proceedsForSell(q: number[], b: number, outcome: number, shares: number): number {
  const after = q.slice();
  after[outcome] -= shares;
  return cost(q, b) - cost(after, b);
}

/** Worst-case loss the house can take on a market: b·ln(n). */
export function maxHouseLoss(b: number, n: number): number {
  return b * Math.log(n);
}

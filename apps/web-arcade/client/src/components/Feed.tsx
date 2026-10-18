import type { GameView, Trade } from "../../../shared/types.ts";
import { cents } from "../format.ts";

export function Feed({ trades, games }: { trades: Trade[]; games: GameView[] }) {
  if (!trades.length) return <p className="muted">No calls yet — be first.</p>;
  return (
    <ul className="feed">
      {trades.slice(0, 12).map((t) => {
        const g = games.find((x) => x.id === t.gameId);
        const mk = g?.markets.find((x) => x.id === t.marketId);
        return (
          <li key={t.id} className={t.side}>
            <span className="avatar sm">{t.avatar}</span>
            <span>
              <b>{t.userName}</b> {t.side === "buy" ? "called" : "cashed out"}{" "}
              <b>{mk?.outcomes[t.outcome].label}</b> on {g?.emoji} {g?.title}
            </span>
            <span className="price">{cents(t.priceAfter)}</span>
          </li>
        );
      })}
    </ul>
  );
}

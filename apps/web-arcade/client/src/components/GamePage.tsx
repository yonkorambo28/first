import { useEffect, useState } from "react";
import type { GameView, MarketView, Trade } from "../../../shared/types.ts";
import { api, type Me, type Quote } from "../api.ts";
import { BUCKET_COLORS, cents, coins, compact, countdown, METRIC_ICON, METRIC_LABEL } from "../format.ts";
import { OddsChart } from "./OddsChart.tsx";
import { usePopups } from "./Popups.tsx";

interface Props {
  game: GameView;
  me: Me;
  onMe: (m: Me) => void;
  feed: Trade[];
}

export function GamePage({ game, me, onMe, feed }: Props) {
  const [marketId, setMarketId] = useState(game.markets[0].id);
  const market = game.markets.find((m) => m.id === marketId) ?? game.markets[0];
  const [pick, setPick] = useState<number | null>(null);
  const cd = countdown(game.launchAt);

  useEffect(() => setPick(null), [marketId]);

  return (
    <div className="game-page">
      <section
        className="banner"
        style={{ background: `linear-gradient(120deg, ${game.palette[0]} 10%, ${game.palette[1]})` }}
      >
        <a href="#/" className="back">
          ← Lobby
        </a>
        {game.imageUrl ? (
          <img className="banner-img" src={game.imageUrl} alt="" />
        ) : (
          <div className="banner-emoji">{game.emoji}</div>
        )}
        <div>
          <span className={`plat plat-${game.platform}`}>{game.platform}</span>
          <h1>{game.title}</h1>
          <p>{game.tagline}</p>
          <p className="muted">
            {game.genre} · {game.studio} · {compact(game.hype)} 🪙 traded
          </p>
        </div>
        <div className={`banner-cd ${cd.live ? "live" : ""}`}>
          <small>{cd.live ? "launched" : "launch in"}</small>
          <b>{cd.text}</b>
        </div>
      </section>

      <div className="challenges" role="tablist">
        {game.markets.map((m) => {
          const held = me.positions.some((p) => p.marketId === m.id);
          return (
            <button
              key={m.id}
              role="tab"
              aria-selected={m.id === market.id}
              className={`challenge ${m.status}`}
              onClick={() => setMarketId(m.id)}
            >
              <span className="ch-icon">{METRIC_ICON[m.metric]}</span>
              <span>{METRIC_LABEL[m.metric]}</span>
              <small>{m.status === "open" ? (held ? "● in play" : "open") : m.status}</small>
            </button>
          );
        })}
      </div>

      <div className="arena">
        <section className="panel board-panel">
          <h2>{market.question}</h2>
          <Board market={market} me={me} pick={pick} onPick={setPick} />
          <OddsChart market={market} />
          <p className="source">
            <b>Resolves from:</b> {market.resolution?.source ?? market.source}
            <br />
            <b>{market.status === "open" ? "Trading closes" : "Closed"}:</b>{" "}
            {new Date(market.closesAt).toLocaleString()}
          </p>
        </section>
        <aside className="side">
          <BetSlip market={market} me={me} pick={pick} onMe={onMe} />
          <Holdings market={market} me={me} onMe={onMe} />
          <div className="panel">
            <h2>📡 Recent calls</h2>
            <ul className="feed">
              {feed
                .filter((t) => t.marketId === market.id)
                .slice(0, 8)
                .map((t) => (
                  <li key={t.id} className={t.side}>
                    <span className="avatar sm">{t.avatar}</span>
                    <span>
                      <b>{t.userName}</b> {t.side === "buy" ? "→" : "←"} {market.outcomes[t.outcome].label}
                    </span>
                    <span className="price">{coins(t.coins)} 🪙</span>
                  </li>
                ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Board({
  market,
  me,
  pick,
  onPick,
}: {
  market: MarketView;
  me: Me;
  pick: number | null;
  onPick: (i: number) => void;
}) {
  const winner = market.resolution?.outcome;
  return (
    <div className="board">
      {market.outcomes.map((o, i) => {
        const p = market.prices[i];
        const held = me.positions.find((x) => x.marketId === market.id && x.outcome === i);
        const cls = [
          "bucket",
          pick === i ? "picked" : "",
          winner === i ? "winner" : "",
          winner !== undefined && winner !== i ? "loser" : "",
        ].join(" ");
        return (
          <button
            key={i}
            className={cls}
            style={{ "--c": BUCKET_COLORS[i % BUCKET_COLORS.length] } as React.CSSProperties}
            disabled={market.status !== "open"}
            onClick={() => onPick(i)}
          >
            <span className="b-odds">{cents(p)}</span>
            <span className="b-meter">
              <i style={{ height: `${Math.max(3, p * 100)}%` }} />
            </span>
            <span className="b-label">{o.label}</span>
            <span className="b-mult">×{(1 / Math.max(p, 0.01)).toFixed(1)}</span>
            {held && <span className="b-held">{held.shares.toFixed(0)} sh</span>}
            {winner === i && <span className="b-crown">👑</span>}
          </button>
        );
      })}
    </div>
  );
}

const CHIPS = [10, 25, 50, 100, 250];

function BetSlip({ market, me, pick, onMe }: { market: MarketView; me: Me; pick: number | null; onMe: (m: Me) => void }) {
  const popups = usePopups();
  const [stake, setStake] = useState(50);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [stamp, setStamp] = useState(0);

  // Re-quote when the pick, stake or live price changes.
  const priceKey = pick === null ? "" : market.prices[pick].toFixed(4);
  useEffect(() => {
    if (pick === null || stake < 1) return setQuote(null);
    const t = setTimeout(() => api.quote(market.id, pick, stake).then(setQuote).catch(() => setQuote(null)), 120);
    return () => clearTimeout(t);
  }, [market.id, pick, stake, priceKey]);

  if (market.status !== "open")
    return (
      <div className="panel slip">
        <h2>{market.status === "resolved" ? "🏁 Settled" : "🔒 Trading closed"}</h2>
        {market.resolution ? (
          <p>
            Final: <b>{compact(market.resolution.value)}</b> {market.unit} →{" "}
            <b>{market.outcomes[market.resolution.outcome].label}</b>
          </p>
        ) : (
          <p className="muted">Waiting for the real numbers. Payouts land automatically.</p>
        )}
      </div>
    );

  if (pick === null)
    return (
      <div className="panel slip">
        <h2>🎯 Make your call</h2>
        <p className="muted">Tap a bucket on the board. Cheaper buckets pay more if they hit.</p>
      </div>
    );

  async function lockIn() {
    if (pick === null) return;
    setBusy(true);
    try {
      const r = await api.buy(market.id, pick, stake);
      onMe(r.me);
      setStamp((s) => s + 1);
      popups.events(r.events);
    } catch (e) {
      popups.toast({ icon: "⚠️", title: (e as Error).message, tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  const color = BUCKET_COLORS[pick % BUCKET_COLORS.length];
  return (
    <div className="panel slip" style={{ "--c": color } as React.CSSProperties}>
      {stamp > 0 && (
        <div key={stamp} className="stamp">
          LOCKED IN
        </div>
      )}
      <h2>
        Your call: <span style={{ color }}>{market.outcomes[pick].label}</span>
      </h2>
      <label className="stake">
        <span>Stake</span>
        <input
          type="range"
          min={5}
          max={Math.max(5, Math.min(1000, me.coins))}
          value={Math.min(stake, Math.max(5, me.coins))}
          onChange={(e) => setStake(Number(e.target.value))}
        />
        <input
          type="number"
          min={5}
          value={stake}
          onChange={(e) => setStake(Math.max(0, Math.floor(Number(e.target.value))))}
        />
      </label>
      <div className="chips">
        {CHIPS.map((c) => (
          <button key={c} className={stake === c ? "on" : ""} onClick={() => setStake(c)} disabled={c > me.coins}>
            {c}
          </button>
        ))}
        <button onClick={() => setStake(Math.floor(me.coins))}>MAX</button>
      </div>
      <div className="payout">
        <div>
          <small>Win</small>
          <b>{quote ? coins(quote.payout) : "—"} 🪙</b>
        </div>
        <div>
          <small>Multiplier</small>
          <b>×{quote ? quote.multiplier.toFixed(2) : "—"}</b>
        </div>
        <div>
          <small>Odds after</small>
          <b>{quote ? cents(quote.priceAfter) : "—"}</b>
        </div>
      </div>
      <button className="btn primary lock" onClick={lockIn} disabled={busy || stake < 5 || stake > me.coins}>
        {busy ? "…" : `LOCK IN ${stake} 🪙`}
      </button>
    </div>
  );
}

function Holdings({ market, me, onMe }: { market: MarketView; me: Me; onMe: (m: Me) => void }) {
  const popups = usePopups();
  const held = me.positions.filter((p) => p.marketId === market.id);
  if (!held.length) return null;

  async function cashOut(outcome: number, shares: number) {
    try {
      const r = await api.sell(market.id, outcome, shares);
      onMe(r.me);
      popups.toast({ icon: "💱", title: `Cashed out ${coins(r.trade.coins)} 🪙`, tone: "coins" });
    } catch (e) {
      popups.toast({ icon: "⚠️", title: (e as Error).message, tone: "error" });
    }
  }

  return (
    <div className="panel">
      <h2>🎒 Your calls</h2>
      <ul className="holdings">
        {held.map((p) => {
          const value = p.shares * market.prices[p.outcome];
          const pnl = value - p.cost;
          return (
            <li key={p.outcome}>
              <div>
                <b>{market.outcomes[p.outcome].label}</b>
                <small>
                  {p.shares.toFixed(1)} shares · paid {coins(p.cost)} · wins {coins(p.shares)}
                </small>
              </div>
              <span className={pnl >= 0 ? "up" : "down"}>
                {pnl >= 0 ? "+" : ""}
                {coins(pnl)}
              </span>
              {market.status === "open" && (
                <button className="btn sm" onClick={() => cashOut(p.outcome, p.shares)}>
                  Cash out {coins(value)}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

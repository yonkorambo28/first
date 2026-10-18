import { useEffect, useState } from "react";
import type { GameView, Platform, Trade } from "../../../shared/types.ts";
import type { Me } from "../api.ts";
import { cents, compact, countdown, METRIC_ICON, METRIC_LABEL } from "../format.ts";
import { Feed } from "./Feed.tsx";

type Filter = "all" | Platform;

export function Lobby({ games, me, feed }: { games: GameView[]; me: Me; feed: Trade[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const shown = games.filter((g) => filter === "all" || g.platform === filter);
  const maxHype = Math.max(1, ...games.map((g) => g.hype));

  return (
    <div className="lobby">
      <section>
        <div className="section-head">
          <h1>Upcoming launches</h1>
          <div className="tabs" role="tablist">
            {(["all", "steam", "roblox"] as Filter[]).map((f) => (
              <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}>
                {f === "all" ? "All" : f === "steam" ? "♨️ Steam" : "🟥 Roblox"}
              </button>
            ))}
          </div>
        </div>
        <div className="cards">
          {shown.map((g) => {
            const cd = countdown(g.launchAt);
            const headline = g.markets[0];
            const fav = headline.prices.indexOf(Math.max(...headline.prices));
            const held = me.positions.filter((p) => p.marketId.startsWith(`${g.id}:`)).length;
            return (
              <a key={g.id} className="card" href={`#/game/${g.id}`}>
                <div
                  className="card-art"
                  style={{ background: `linear-gradient(135deg, ${g.palette[0]}, ${g.palette[1]})` }}
                >
                  {g.imageUrl ? <img className="card-img" src={g.imageUrl} alt="" /> : <span className="card-emoji">{g.emoji}</span>}
                  <span className={`plat plat-${g.platform}`}>{g.platform}</span>
                  {held > 0 && <span className="held">{held} call{held > 1 ? "s" : ""}</span>}
                </div>
                <div className="card-body">
                  <h3>{g.title}</h3>
                  <p className="muted">
                    {g.genre} · {g.studio}
                  </p>
                  <div className={`countdown ${cd.live ? "live" : ""}`}>
                    {cd.live ? `🟢 LAUNCHED ${cd.text} ago` : `⏱ T-minus ${cd.text}`}
                  </div>
                  <div className="favourite">
                    <span>
                      {METRIC_ICON[headline.metric]} {METRIC_LABEL[headline.metric]}
                    </span>
                    <b>
                      {headline.outcomes[fav].label} · {cents(headline.prices[fav])}
                    </b>
                  </div>
                  <div className="hype" title={`${compact(g.hype)} coins traded`}>
                    <span>HYPE</span>
                    <i>
                      <i style={{ width: `${Math.max(4, (100 * g.hype) / maxHype)}%` }} />
                    </i>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </section>
      <aside className="side">
        <div className="panel">
          <h2>📜 Daily quests</h2>
          <ul className="quests">
            {me.quests.items.map((q) => (
              <li key={q.id} className={q.claimed ? "done" : ""}>
                <div>
                  <span>{q.title}</span>
                  <small>
                    +{q.rewardCoins} 🪙 · +{q.rewardXp} XP
                  </small>
                </div>
                <b>{q.claimed ? "✓" : `${q.progress}/${q.goal}`}</b>
                <i className="qbar">
                  <i style={{ width: `${(100 * q.progress) / q.goal}%` }} />
                </i>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <h2>📡 Live calls</h2>
          <Feed trades={feed} games={games} />
        </div>
      </aside>
    </div>
  );
}

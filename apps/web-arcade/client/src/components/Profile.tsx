import type { GameView } from "../../../shared/types.ts";
import { token, type Me } from "../api.ts";
import { coins, METRIC_LABEL } from "../format.ts";

const ALL_BADGES = [
  ["first_call", "🎯", "First Call"],
  ["underdog", "🐺", "Underdog Hunter"],
  ["hot_streak", "🔥", "On Fire"],
  ["oracle", "🔮", "Oracle"],
  ["whale", "🐋", "Whale"],
  ["both_worlds", "🌐", "Both Worlds"],
];

export function Profile({ me, games }: { me: Me; games: GameView[] }) {
  const markets = games.flatMap((g) => g.markets.map((m) => ({ g, m })));
  const winRate = me.wins + me.losses ? Math.round((100 * me.wins) / (me.wins + me.losses)) : 0;

  return (
    <div className="profile">
      <section className="panel player-card">
        <div className="avatar xl">{me.avatar}</div>
        <div>
          <h1>{me.name}</h1>
          <p>
            Level {me.level.level} · <b>{me.level.title}</b>
          </p>
          <i className="xpbar wide">
            <i style={{ width: `${(100 * me.level.xpIntoLevel) / me.level.xpForLevel}%` }} />
          </i>
          <small className="muted">
            {me.level.xpIntoLevel} / {me.level.xpForLevel} XP to next level
          </small>
        </div>
        <div className="stats">
          <div>
            <b>{coins(me.netWorth)}</b>
            <small>net worth</small>
          </div>
          <div>
            <b>
              {me.wins}–{me.losses}
            </b>
            <small>W–L ({winRate}%)</small>
          </div>
          <div>
            <b>{me.bestStreak}</b>
            <small>best streak</small>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>🏅 Badges</h2>
        <div className="badges">
          {ALL_BADGES.map(([id, emoji, name]) => {
            const got = me.badges.find((b) => b.id === id);
            return (
              <div key={id} className={`badge ${got ? "got" : ""}`} title={got?.description ?? "Locked"}>
                <span>{got ? emoji : "🔒"}</span>
                <small>{name}</small>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <h2>🎒 Open calls</h2>
        {!me.positions.length && <p className="muted">Nothing in play. Head to the lobby and make a call.</p>}
        <ul className="holdings">
          {me.positions.map((p) => {
            const hit = markets.find((x) => x.m.id === p.marketId);
            if (!hit) return null;
            const { g, m } = hit;
            const value = p.shares * m.prices[p.outcome];
            return (
              <li key={`${p.marketId}-${p.outcome}`}>
                <a href={`#/game/${g.id}`}>
                  <b>
                    {g.emoji} {g.title}
                  </b>
                  <small>
                    {METRIC_LABEL[m.metric]} · {m.outcomes[p.outcome].label} · {m.status}
                  </small>
                </a>
                <span className={value >= p.cost ? "up" : "down"}>
                  {coins(value)} / {coins(p.cost)}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <button
        className="btn ghost"
        onClick={() => {
          token.set(null);
          location.reload();
        }}
      >
        Sign out
      </button>
    </div>
  );
}

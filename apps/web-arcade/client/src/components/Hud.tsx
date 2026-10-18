import { useEffect, useState } from "react";
import { api, type Me } from "../api.ts";
import { coins, countdown } from "../format.ts";
import { usePopups } from "./Popups.tsx";

export function Hud({ me, onMe }: { me: Me; onMe: (m: Me) => void }) {
  const popups = usePopups();
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const ready = !me.crateReadyAt || Date.parse(me.crateReadyAt) <= Date.now();
  const { level } = me;

  async function openCrate() {
    try {
      const r = await api.crate();
      onMe(r.me);
      popups.splash({ icon: "🎁", title: `+${r.amount} coins`, body: "Daily crate opened" });
      popups.events(r.events.filter((e) => e.kind !== "coins"));
    } catch (e) {
      popups.toast({ icon: "⏳", title: (e as Error).message, tone: "error" });
    }
  }

  return (
    <header className="hud">
      <a className="logo" href="#/">
        GANDI<span>launch calls</span>
      </a>
      <nav>
        <a href="#/">Lobby</a>
        <a href="#/leaderboard">Ranks</a>
        <a href="#/me">Profile</a>
      </nav>
      <div className="hud-stats">
        <button className={`crate ${ready ? "ready" : ""}`} onClick={openCrate} disabled={!ready}>
          🎁 {ready ? "Open crate" : countdown(me.crateReadyAt!).text}
        </button>
        {me.streak > 0 && <span className="pill streak">🔥 {me.streak}</span>}
        <span className="pill coins">🪙 {coins(me.coins)}</span>
        <a className="player" href="#/me" title={`${level.xpIntoLevel}/${level.xpForLevel} XP`}>
          <span className="avatar">{me.avatar}</span>
          <span className="lvl">
            <b>LV {level.level}</b>
            <i className="xpbar">
              <i style={{ width: `${(100 * level.xpIntoLevel) / level.xpForLevel}%` }} />
            </i>
          </span>
        </a>
      </div>
    </header>
  );
}

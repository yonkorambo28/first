import { useEffect, useState } from "react";
import type { PublicUser } from "../../../shared/types.ts";
import { api } from "../api.ts";
import { coins } from "../format.ts";

const MEDALS = ["🥇", "🥈", "🥉"];

export function Leaderboard({ meId }: { meId: string }) {
  const [rows, setRows] = useState<PublicUser[]>([]);
  useEffect(() => {
    api.leaderboard().then(setRows);
    const t = setInterval(() => api.leaderboard().then(setRows), 10_000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="panel ranks">
      <h1>🏆 Leaderboard</h1>
      <p className="muted">Ranked by net worth: coins plus the live value of open calls.</p>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Level</th>
            <th>W–L</th>
            <th>Best 🔥</th>
            <th>Net worth</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u, i) => (
            <tr key={u.id} className={u.id === meId ? "me" : ""}>
              <td>{MEDALS[i] ?? i + 1}</td>
              <td>
                <span className="avatar sm">{u.avatar}</span> {u.name}{" "}
                {u.badges.map((b) => (
                  <span key={b.id} title={b.name}>
                    {b.emoji}
                  </span>
                ))}
              </td>
              <td>
                {u.level.level} <small className="muted">{u.level.title}</small>
              </td>
              <td>
                {u.wins}–{u.losses}
              </td>
              <td>{u.bestStreak}</td>
              <td>
                <b>{coins(u.netWorth)}</b> 🪙
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

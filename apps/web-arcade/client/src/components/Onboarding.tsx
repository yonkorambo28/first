import { useState } from "react";
import { api, token, type Me } from "../api.ts";

const AVATARS = ["🎮", "🦊", "🐸", "🤖", "👾", "🧙", "🐲", "🦄", "🐼", "🚀", "🍕", "💀"];

export function Onboarding({ onDone }: { onDone: (me: Me) => void }) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api.signUp(name, avatar);
      token.set(r.token);
      onDone(r.me);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="onboard">
      <div className="onboard-card">
        <h1 className="logo big">GANDI</h1>
        <p className="tag">Call the launch. Climb the ranks.</p>
        <ul className="how">
          <li>🎯 Predict wishlists, revenue, reviews and visits for upcoming Steam &amp; Roblox games</li>
          <li>📈 Odds move live as players lock in calls — buy early, buy cheap</li>
          <li>🏆 Correct calls pay out, earn XP, streaks and badges</li>
        </ul>
        <form onSubmit={start}>
          <div className="avatars">
            {AVATARS.map((a) => (
              <button
                type="button"
                key={a}
                className={a === avatar ? "on" : ""}
                onClick={() => setAvatar(a)}
                aria-label={`Avatar ${a}`}
              >
                {a}
              </button>
            ))}
          </div>
          <input
            autoFocus
            placeholder="Pick a player name"
            value={name}
            maxLength={20}
            onChange={(e) => setName(e.target.value)}
          />
          {error && <p className="err">{error}</p>}
          <button className="btn primary" disabled={busy || name.trim().length < 2}>
            PRESS START · get 1,000 🪙
          </button>
        </form>
        <small className="fine">Play money only. Coins can't be bought, sold or cashed out.</small>
      </div>
    </div>
  );
}

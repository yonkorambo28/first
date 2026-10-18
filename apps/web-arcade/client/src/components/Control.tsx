// Operator screen: list real games, check their live numbers, and settle markets by hand when needed.
import { useState } from "react";
import type { GameView, Snapshot } from "../../../shared/types.ts";
import { api } from "../api.ts";
import { compact, countdown, METRIC_LABEL } from "../format.ts";
import { usePopups } from "./Popups.tsx";

export function Control({ games, onAdded }: { games: GameView[]; onAdded: (g: GameView) => void }) {
  const popups = usePopups();
  const [key, setKey] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [readings, setReadings] = useState<Record<string, Snapshot>>({});
  const [platform, setPlatform] = useState<"steam" | "roblox">("steam");
  const [externalId, setExternalId] = useState("");
  const [launchAt, setLaunchAt] = useState("");
  const [busy, setBusy] = useState(false);

  const fail = (e: unknown) => popups.toast({ icon: "⚠️", title: (e as Error).message, tone: "error" });

  async function resolve(marketId: string) {
    try {
      const r = await api.resolve(key, marketId, Number(values[marketId]));
      popups.toast({ icon: "🏁", title: "Market settled", body: r.market.outcomes[r.market.resolution!.outcome].label, tone: "info" });
    } catch (e) {
      fail(e);
    }
  }

  async function addGame(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const id = Number(externalId);
      const g = await api.addGame(key, {
        platform,
        ...(platform === "steam" ? { steamAppId: id } : { robloxPlaceId: id }),
        launchAt: launchAt ? new Date(launchAt).toISOString() : undefined,
      });
      onAdded(g);
      setExternalId("");
      popups.toast({ icon: "🆕", title: `Listed ${g.title}`, body: `${g.markets.length} markets open`, tone: "info" });
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function read(gameId: string) {
    try {
      const snap = await api.readGame(key, gameId);
      setReadings((r) => ({ ...r, [gameId]: snap }));
    } catch (e) {
      fail(e);
    }
  }

  return (
    <section className="panel control">
      <h1>🛰 Launch control</h1>
      <p className="muted">
        Real games settle themselves: the server reads Steam reviews, Gamalytic estimates and Roblox stats every few
        hours and pays out once each market's measure time passes. Use the boxes below for anything that isn't public
        (Roblox revenue) or to override. Dev admin key: <code>dev-admin</code>.
      </p>
      <input
        id="admin-key"
        placeholder="Admin key"
        type="password"
        value={key}
        onChange={(e) => setKey(e.target.value)}
      />

      <h2>List a real game</h2>
      <form className="ctl-add" onSubmit={addGame}>
        <select id="add-platform" value={platform} onChange={(e) => setPlatform(e.target.value as "steam" | "roblox")}>
          <option value="steam">Steam</option>
          <option value="roblox">Roblox</option>
        </select>
        <input
          id="add-id"
          inputMode="numeric"
          placeholder={platform === "steam" ? "Steam app id (store URL /app/…)" : "Roblox place id (URL /games/…)"}
          value={externalId}
          onChange={(e) => setExternalId(e.target.value.replace(/\D/g, ""))}
        />
        <input
          id="add-launch"
          type="datetime-local"
          title={platform === "steam" ? "Optional if the store page has an exact date" : "Required: Roblox has no release dates"}
          value={launchAt}
          onChange={(e) => setLaunchAt(e.target.value)}
        />
        <button className="btn sm" disabled={!key || !externalId || busy}>
          {busy ? "Looking up…" : "List game"}
        </button>
      </form>

      {games.map((g) => {
        const snap = readings[g.id];
        const tracked = g.steamAppId || g.robloxUniverseId;
        return (
          <div key={g.id} className="ctl-game">
            <h3>
              {g.emoji} {g.title}{" "}
              <small className="muted">
                · launch {countdown(g.launchAt).live ? "passed" : "upcoming"} ·{" "}
                {g.steamAppId ? `Steam ${g.steamAppId}` : g.robloxUniverseId ? `universe ${g.robloxUniverseId}` : "demo"}
              </small>
            </h3>
            {tracked && (
              <button className="btn sm" disabled={!key} onClick={() => read(g.id)}>
                Read live numbers
              </button>
            )}
            {snap && <Reading snap={snap} />}
            {g.markets.map((m) => (
              <div key={m.id} className="ctl-row">
                <span>{METRIC_LABEL[m.metric]}</span>
                <small className="muted">{m.status}</small>
                {m.status === "resolved" ? (
                  <b title={m.resolution!.source}>
                    {compact(m.resolution!.value)} → {m.outcomes[m.resolution!.outcome].label}
                  </b>
                ) : (
                  <>
                    <input
                      id={`settle-${m.id}`}
                      type="number"
                      placeholder={m.unit}
                      value={values[m.id] ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [m.id]: e.target.value }))}
                    />
                    <button className="btn sm" disabled={!key || !values[m.id]} onClick={() => resolve(m.id)}>
                      Settle
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </section>
  );
}

function Reading({ snap }: { snap: Snapshot }) {
  const parts: string[] = [];
  if (snap.steam)
    parts.push(
      `Steam reviews ${compact(snap.steam.totalReviews)} (${snap.steam.totalReviews ? Math.round((100 * snap.steam.totalPositive) / snap.steam.totalReviews) : 0}% positive)`,
    );
  if (snap.gamalytic) {
    const g = snap.gamalytic;
    const f = (n: number | null) => (n == null ? "—" : compact(n));
    parts.push(`Gamalytic: revenue $${f(g.revenue)}, sold ${f(g.copiesSold)}, wishlists ${f(g.wishlists)}, followers ${f(g.followers)}`);
  }
  if (snap.roblox) {
    const r = snap.roblox;
    parts.push(`Roblox: ${compact(r.visits)} visits, ${compact(r.favorites)} favorites, ${r.playing} playing, 👍 ${r.upVotes} 👎 ${r.downVotes}`);
  }
  if (snap.errors) parts.push(`Errors: ${snap.errors.join("; ")}`);
  return <p className="readings">{parts.join(" · ") || "No data"}</p>;
}

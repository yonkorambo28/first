import { useCallback, useEffect, useState } from "react";
import type { GameView, MarketView, Trade } from "../../shared/types.ts";
import { api, subscribe, token, type Me } from "./api.ts";
import { Control } from "./components/Control.tsx";
import { GamePage } from "./components/GamePage.tsx";
import { Hud } from "./components/Hud.tsx";
import { Leaderboard } from "./components/Leaderboard.tsx";
import { Lobby } from "./components/Lobby.tsx";
import { Onboarding } from "./components/Onboarding.tsx";
import { PopupProvider, usePopups } from "./components/Popups.tsx";
import { Profile } from "./components/Profile.tsx";

function useRoute() {
  const [hash, setHash] = useState(() => location.hash.slice(1) || "/");
  useEffect(() => {
    const on = () => {
      setHash(location.hash.slice(1) || "/");
      window.scrollTo(0, 0);
    };
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  return hash.split("/").filter(Boolean);
}

export function App() {
  return (
    <PopupProvider>
      <Shell />
    </PopupProvider>
  );
}

function Shell() {
  const route = useRoute();
  const popups = usePopups();
  const [me, setMe] = useState<Me | null>(null);
  const [checked, setChecked] = useState(false);
  const [games, setGames] = useState<GameView[]>([]);
  const [feed, setFeed] = useState<Trade[]>([]);

  const refreshMe = useCallback(() => {
    if (!token.get()) return Promise.resolve(setChecked(true));
    return api
      .me()
      .then(setMe)
      .catch(() => token.set(null))
      .finally(() => setChecked(true));
  }, []);

  useEffect(() => {
    refreshMe();
    api.games().then(setGames);
    api.feed().then(setFeed);
  }, [refreshMe]);

  // Live prices and trades from everyone else.
  useEffect(
    () =>
      subscribe({
        market: (m: MarketView) =>
          setGames((gs) =>
            gs.map((g) =>
              g.id !== m.gameId
                ? g
                : {
                    ...g,
                    markets: g.markets.map((x) => (x.id === m.id ? m : x)),
                    hype: g.markets.reduce((s, x) => s + (x.id === m.id ? m.volume : x.volume), 0),
                  },
            ),
          ),
        games: () => api.games().then(setGames),
        trade: (t) => setFeed((f) => [t, ...f].slice(0, 30)),
        resolved: (r) => {
          const mine = r.results.find((x) => x.userId === me?.id);
          if (!mine) return;
          const label = r.market.outcomes[r.market.resolution!.outcome].label;
          if (mine.profit > 0)
            popups.splash({ icon: "🏆", title: "You called it!", body: `${label} — +${mine.payout} coins` });
          else popups.toast({ icon: "🎲", title: "Market settled", body: `It landed on ${label}`, tone: "info" });
          popups.events(mine.events);
          refreshMe();
        },
      }),
    [me?.id, popups, refreshMe],
  );

  if (!checked) return <div className="boot">LOADING…</div>;
  if (!me) return <Onboarding onDone={setMe} />;

  const [page, id] = route;
  const game = page === "game" ? games.find((g) => g.id === id) : undefined;

  return (
    <>
      <Hud me={me} onMe={setMe} />
      <main className="page">
        {page === "game" && game ? (
          <GamePage game={game} me={me} onMe={setMe} feed={feed.filter((t) => t.gameId === game.id)} />
        ) : page === "leaderboard" ? (
          <Leaderboard meId={me.id} />
        ) : page === "me" ? (
          <Profile me={me} games={games} />
        ) : page === "control" ? (
          <Control games={games} onAdded={(g) => setGames((gs) => [...gs.filter((x) => x.id !== g.id), g])} />
        ) : (
          <Lobby games={games} me={me} feed={feed} />
        )}
      </main>
      <footer className="foot">
        Play-money only · coins have no cash value · demo games are fictional · Steam estimates by{" "}
        <a href="https://gamalytic.com" target="_blank" rel="noreferrer">
          Gamalytic
        </a>{" "}
        ·{" "}
        <a href="#/control">launch control</a>
      </footer>
    </>
  );
}

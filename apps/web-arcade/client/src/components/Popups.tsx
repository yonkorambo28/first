// The "pop-up" layer: every reward, quest and level-up lands here as a toast,
// and big moments (level up, winning a call) take over the screen for a beat.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { GameEvent } from "../../../shared/types.ts";

interface Toast {
  id: number;
  icon: string;
  title: string;
  body?: string;
  tone: "xp" | "coins" | "quest" | "badge" | "error" | "info";
}

interface Splash {
  id: number;
  icon: string;
  title: string;
  body: string;
}

interface PopupApi {
  events: (events: GameEvent[]) => void;
  toast: (t: Omit<Toast, "id">) => void;
  splash: (s: Omit<Splash, "id">) => void;
}

const Ctx = createContext<PopupApi | null>(null);
export const usePopups = () => useContext(Ctx)!;

let nextId = 1;

export function PopupProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Big moments queue up and play one at a time.
  const [splashes, setSplashes] = useState<Splash[]>([]);
  const splash = splashes[0];

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = nextId++;
    setToasts((xs) => [...xs.slice(-4), { ...t, id }]);
    setTimeout(() => setToasts((xs) => xs.filter((x) => x.id !== id)), 3600);
  }, []);

  const showSplash = useCallback((s: Omit<Splash, "id">) => {
    const item = { ...s, id: nextId++ };
    setSplashes((xs) => [...xs, item]);
  }, []);

  const dismiss = useCallback(() => setSplashes((xs) => xs.slice(1)), []);

  useEffect(() => {
    if (!splash) return;
    const t = setTimeout(dismiss, 2600);
    return () => clearTimeout(t);
  }, [splash, dismiss]);

  const events = useCallback(
    (evs: GameEvent[]) => {
      evs.forEach((e, i) =>
        setTimeout(() => {
          switch (e.kind) {
            case "xp":
              return toast({ icon: "✨", title: `+${e.amount} XP`, body: e.reason, tone: "xp" });
            case "coins":
              return toast({ icon: "🪙", title: `+${e.amount} coins`, body: e.reason, tone: "coins" });
            case "quest_done":
              return toast({ icon: "📜", title: "Quest complete!", body: e.quest.title, tone: "quest" });
            case "badge":
              return showSplash({ icon: e.badge.emoji, title: e.badge.name, body: e.badge.description });
            case "level_up":
              return showSplash({ icon: "⬆️", title: `Level ${e.level}`, body: e.title });
            case "streak":
              return e.streak >= 2
                ? toast({ icon: "🔥", title: `${e.streak} in a row!`, body: "Win streak", tone: "info" })
                : undefined;
          }
        }, i * 180),
      );
    },
    [toast, showSplash],
  );

  const value = useMemo(() => ({ events, toast, splash: showSplash }), [events, toast, showSplash]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            <span className="toast-icon">{t.icon}</span>
            <div>
              <strong>{t.title}</strong>
              {t.body && <small>{t.body}</small>}
            </div>
          </div>
        ))}
      </div>
      {splash && (
        <div className="splash" onClick={dismiss} role="dialog" aria-label={splash.title}>
          <Confetti key={splash.id} />
          <div className="splash-card">
            <div className="splash-icon">{splash.icon}</div>
            <h2>{splash.title}</h2>
            <p>{splash.body}</p>
            <small>tap to continue</small>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function Confetti() {
  const pieces = Array.from({ length: 40 }, (_, i) => i);
  const colors = ["#ff4ecd", "#ffd23f", "#7ae582", "#5ad1ff", "#ff9f1c"];
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((i) => (
        <i
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 10) * 0.05}s`,
            animationDuration: `${1.4 + (i % 5) * 0.2}s`,
            transform: `rotate(${i * 29}deg)`,
          }}
        />
      ))}
    </div>
  );
}

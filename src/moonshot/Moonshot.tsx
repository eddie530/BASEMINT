import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  ChevronRight,
  Copy,
  Flame,
  Globe,
  HelpCircle,
  Lock,
  LogOut,
  Palette,
  Rocket,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  X,
  Sun,
  Moon,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { renderFrame } from "@/moonshot/game/draw";
import { createRuntime, launch, cash, restack, step, stepParticles, formatMult } from "@/moonshot/game/sim";
import { applySave, loadSave, persist } from "@/moonshot/game/save";
import { getAudio } from "@/moonshot/game/audio";
import { applyTheme, readTheme, setCosmetic } from "@/moonshot/game/theme";
import { bootMiniApp, saveMiniApp, type MiniSession } from "@/moonshot/miniapp";
import { api, loginWallet, loginFarcaster, sendPackPayment, verifyRound } from "@/moonshot/client";
import {
  DAILY_ROUNDS,
  LOOKS,
  PACK,
  RATE,
  type Boot,
  type RoundView,
  type Challenge,
  type BoardEntry,
  type Look,
} from "@/moonshot/shared";

type Mode = "practice" | "daily";
type Tab = "play" | "league" | "locker";
const emptyMini: MiniSession = {
  inApp: false,
  added: false,
  username: null,
  displayName: null,
  pfpUrl: null,
};
const number = (n: number) => n.toLocaleString("en-US");
function message(e: unknown) {
  const s = e instanceof Error ? e.message : "Something went wrong. Try again.";
  return /reject|denied|4001/i.test(s) ? "Cancelled in your wallet. Nothing changed." : s;
}
function Avatar({ name, src }: { name: string; src?: string | null }) {
  return src ? (
    <img
      className="avatar"
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  ) : (
    <span className="avatar">
      {name
        .replace(/^@|^0x/, "")
        .slice(0, 2)
        .toUpperCase()}
    </span>
  );
}
function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement;
    const prior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    box.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const els = box.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input,select,textarea,[tabindex="0"]',
        );
        if (!els?.length) return;
        const first = els[0]!,
          last = els[els.length - 1]!;
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === box.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = prior;
      document.removeEventListener("keydown", key);
      prev?.focus();
    };
  }, [close]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={box}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="section-heading">
          <h2>{title}</h2>
          <button className="icon-button" aria-label="Close dialog" onClick={close}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Moonshot() {
  const [initialRuntime] = useState(createRuntime);
  const runtime = useRef(initialRuntime);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [boot, setBoot] = useState<Boot | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [mini, setMini] = useState(emptyMini),
    [mode, setMode] = useState<Mode>("practice"),
    [tab, setTab] = useState<Tab>("play");
  const modeRef = useRef<Mode>("practice");
  const [round, setRound] = useState<RoundView | null>(null),
    roundRef = useRef<RoundView | null>(null);
  const clock = useRef({ at: 0, server: 0 });
  const [snap, setSnap] = useState({
    mult: 1,
    balance: 1000,
    phase: "idle",
    result: null as "cash" | "rug" | null,
    payout: 0,
    rounds: 0,
    history: [] as number[],
  });
  const [auto, setAuto] = useState<number | null>(null),
    [stake, setStake] = useState(25),
    [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [muted, setMuted] = useState(false),
    [light, setLight] = useState(false),
    [reduced, setReduced] = useState(false);
  const [dialog, setDialog] = useState<"login" | "rules" | "checkout" | null>(null);
  const closeDialog = useCallback(() => setDialog(null), []);
  const [challenge, setChallenge] = useState<Challenge | null>(null),
    [proof, setProof] = useState<"pending" | "verified" | "failed" | null>(null);
  const [look, setLook] = useState<Look>("base");
  const [preview, setPreview] = useState<Look>("acid");
  const [period, setPeriod] = useState<"day" | "week">("day"),
    [scope, setScope] = useState<"all" | "friends">("all"),
    [board, setBoard] = useState<BoardEntry[]>([]);
  const [friends, setFriends] = useState<{ id: string; name: string; avatar: string | null }[]>([]),
    [friendInput, setFriendInput] = useState("");
  const [order, setOrder] = useState<{
      id: string;
      payer: string;
      expiresAt: number;
      hash: string | null;
    } | null>(null),
    [paymentHash, setPaymentHash] = useState("");
  const [now, setNow] = useState(Date.now());
  const doneIds = useRef(new Set<string>());
  const showError = useCallback((e: unknown) => setError(message(e)), []);
  const receive = useCallback((r: RoundView) => {
    const old = roundRef.current;
    if (
      old?.id === r.id &&
      (old.serverNow > r.serverNow || (old.status !== "flying" && r.status === "flying"))
    )
      return;
    roundRef.current = r;
    setRound(r);
    clock.current = { at: performance.now(), server: r.serverNow };
    if (r.status !== "flying" && !doneIds.current.has(r.id)) {
      doneIds.current.add(r.id);
      try {
        r.status === "cash" ? getAudio().cash() : getAudio().rug(r.crash! <= 1.01);
      } catch {
        /* optional sound */
      }
    }
  }, []);
  const refresh = useCallback(async () => {
    const data = await api<Boot>("state");
    setBoot(data);
    if (data.daily.active) {
      modeRef.current = "daily";
      setMode("daily");
      receive(data.daily.active);
    } else if (roundRef.current && roundRef.current.day !== data.daily.day) {
      roundRef.current = null;
      setRound(null);
    }
    setLook(data.pilot?.equipped ?? "base");
    return data;
  }, [receive]);
  useEffect(() => {
    void refresh().catch(showError);
    void bootMiniApp().then(setMini);
    const params = new URLSearchParams(location.search);
    const id = params.get("challenge");
    if (id)
      void api<Challenge>(`challenge?id=${encodeURIComponent(id)}`)
        .then(setChallenge)
        .catch(showError);
  }, [refresh, showError]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!boot) return;
    const t = setTimeout(
      () => void refresh().catch(showError),
      Math.max(1000, boot.resetAt - Date.now() + 1000),
    );
    return () => clearTimeout(t);
  }, [boot?.resetAt, refresh, showError]);
  useEffect(() => {
    const saved = loadSave();
    if (saved) applySave(runtime.current, saved);
    const t = readTheme();
    applyTheme(t);
    setLight(t === "light");
    setMuted(runtime.current.muted);
    getAudio().setMuted(runtime.current.muted);
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => {
      runtime.current.reduced = mq.matches;
      setReduced(mq.matches);
    };
    change();
    mq.addEventListener("change", change);
    return () => mq.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    setCosmetic(look);
    const root = document.querySelector<HTMLElement>(".moonshot-root");
    if (root) root.dataset.look = look;
  }, [look]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    let cancelled = false;
    void api<BoardEntry[]>(`board?period=${period}&scope=${scope}`)
      .then((rows) => {
        if (!cancelled) setBoard(rows);
      })
      .catch(showError);
    return () => {
      cancelled = true;
    };
  }, [period, scope, boot?.daily.completed, boot?.pilot?.id, showError]);
  useEffect(() => {
    if (!boot?.pilot) {
      setFriends([]);
      return;
    }
    void api<typeof friends>("friends").then(setFriends).catch(showError);
  }, [boot?.pilot?.id, showError]);
  useEffect(() => {
    if (!round || round.status !== "flying") return;
    let disposed = false,
      running = false;
    const poll = async () => {
      if (running) return;
      running = true;
      try {
        const r = await api<RoundView>(`round?id=${round.id}`);
        if (disposed) return;
        receive(r);
        if (r.status !== "flying") {
          setError("");
          await refresh();
        }
      } catch (e) {
        if (!disposed) showError(e);
      } finally {
        running = false;
      }
    };
    const timer = setInterval(() => void poll(), 500);
    void poll();
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, [round?.id, round?.status, receive, refresh, showError]);
  useEffect(() => {
    if (!round?.seed || round.crash === null) {
      setProof(null);
      return;
    }
    let dead = false;
    setProof("pending");
    void verifyRound(round.id, round.seed, round.commitment, round.crash)
      .then((ok) => {
        if (!dead) setProof(ok ? "verified" : "failed");
      })
      .catch(() => {
        if (!dead) setProof("failed");
      });
    return () => {
      dead = true;
    };
  }, [round?.id, round?.seed]);
  useEffect(() => {
    let raf = 0,
      last = performance.now(),
      lastUi = 0;
    const rt = runtime.current;
    const tick = (time: number) => {
      const dt = Math.min(0.1, (time - last) / 1000);
      last = time;
      if (modeRef.current === "practice") {
        step(rt, dt);
        if (rt.pending) {
          rt.pending = null;
          persist(rt);
          try {
            rt.result === "cash" ? getAudio().cash() : getAudio().rug(rt.crashAt <= 1.01);
          } catch {
            /* optional sound */
          }
        }
      } else {
        const r = roundRef.current;
        rt.t += dt;
        stepParticles(rt, dt);
        rt.flash = Math.max(0, rt.flash - dt);
        rt.trauma = Math.max(0, rt.trauma - dt);
        if (r) {
          const server = clock.current.server + (time - clock.current.at);
          rt.auto = r.auto;
          if (r.status === "flying") {
            rt.phase = server < r.startMs ? "arming" : "flying";
            rt.result = null;
            rt.elapsed = Math.max(0, (server - r.startMs) / 1000);
            rt.mult = Math.min(1000, Math.exp(RATE * rt.elapsed));
            rt.crashAt = Infinity;
          } else {
            rt.phase = "result";
            rt.result = r.status;
            rt.mult = r.multiplier ?? 1;
            rt.crashAt = r.crash ?? 1;
            rt.cashedAt = r.status === "cash" ? (r.multiplier ?? 1) : 0;
            rt.elapsed = Math.log(rt.mult) / RATE;
            rt.payout = r.payout;
          }
          rt.balance = r.balance;
          rt.rounds = r.number;
          rt.viewM = Math.max(2.4, rt.mult * 1.35);
          rt.viewT = Math.max(4.5, rt.elapsed * 1.2 + 0.7);
        } else {
          rt.phase = "idle";
          rt.result = null;
          rt.mult = 1;
          rt.elapsed = 0;
          rt.viewM = 2.4;
          rt.viewT = 4.5;
          rt.auto = null;
        }
      }
      if (canvas.current) renderFrame(canvas.current, rt);
      if (time - lastUi > 45) {
        lastUi = time;
        setSnap((prev) =>
          prev.mult === rt.mult &&
          prev.balance === rt.balance &&
          prev.phase === rt.phase &&
          prev.result === rt.result &&
          prev.payout === rt.payout &&
          prev.rounds === rt.rounds
            ? prev
            : {
                mult: rt.mult,
                balance: rt.balance,
                phase: rt.phase,
                result: rt.result,
                payout: rt.payout,
                rounds: rt.rounds,
                history: rt.history.slice(),
              },
        );
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const flying = snap.phase === "flying" || snap.phase === "arming";
  const daily = boot?.daily;
  const finished = !!daily && daily.completed >= DAILY_ROUNDS;
  const progress = mode === "daily" ? (round?.number ?? daily?.used ?? 0) : snap.rounds;
  const balance =
    mode === "practice"
      ? snap.balance
      : round?.status === "flying"
        ? round.balance
        : (daily?.balance ?? 1000);
  const action = useCallback(async () => {
    if (busyRef.current) return;
    setError("");
    getAudio().unlock();
    if (modeRef.current === "practice") {
      const rt = runtime.current;
      if (rt.phase === "flying") {
        cash(rt, rt.mult);
        return;
      }
      if (rt.phase === "arming" || rt.phase === "impact") return;
      rt.auto = auto;
      rt.stake = stake;
      if (rt.balance < 10) {
        restack(rt);
        persist(rt);
        return;
      }
      launch(rt);
      persist(rt);
      try {
        getAudio().launch();
      } catch {}
      return;
    }
    if (!boot?.pilot) {
      setDialog("login");
      return;
    }
    busyRef.current = true;
    setBusy(true);
    try {
      const r = roundRef.current;
      if (r?.status === "flying") {
        receive(await api<RoundView>("cash", { id: r.id }));
        await refresh();
      } else if (!finished) {
        receive(await api<RoundView>("start", { auto, key: crypto.randomUUID() }));
        await refresh();
      }
    } catch (e) {
      showError(e);
      void refresh().catch(() => {});
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [auto, stake, boot?.pilot, finished, receive, refresh, showError]);
  const actionRef = useRef(action);
  actionRef.current = action;
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || dialog || tab !== "play") return;
      if ((e.target as HTMLElement)?.closest("button,input,select,textarea,a")) return;
      e.preventDefault();
      void actionRef.current();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [dialog, tab]);
  const changeMode = (next: Mode) => {
    if (flying || busy || next === mode) return;
    if (mode === "practice") persist(runtime.current);
    modeRef.current = next;
    setMode(next);
    setError("");
    if (next === "practice") {
      const saved = loadSave();
      const rt = createRuntime();
      if (saved) applySave(rt, saved);
      Object.assign(runtime.current, rt);
      runtime.current.reduced = reduced;
      runtime.current.muted = muted;
    } else {
      const rt = runtime.current;
      rt.phase = "idle";
      rt.result = null;
      rt.history = [];
      rt.balance = daily?.balance ?? 1000;
    }
  };
  const signIn = async (kind: "wallet" | "farcaster") => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await (kind === "wallet" ? loginWallet(mini.inApp) : loginFarcaster());
      await refresh();
      setDialog(null);
      setNotice("Pilot connected. Your flights are saved.");
    } catch (e) {
      showError(e);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const signOut = async () => {
    if (flying) return;
    try {
      await api("logout", {});
      roundRef.current = null;
      setRound(null);
      await refresh();
      changeMode("practice");
      setDialog(null);
      setNotice("Signed out.");
    } catch (e) {
      showError(e);
    }
  };
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Copied to clipboard.");
    } catch {
      setError(`Clipboard unavailable. Copy this: ${text}`);
    }
  };
  const share = async () => {
    if (!round || round.status !== "cash") return;
    try {
      const c = await api<Challenge>(`challenge?id=${round.id}`);
      const text = `I banked ${c.multiplier.toFixed(2)}× on MOONSHOT. Beat my flight. Play money.`;
      if (mini.inApp) {
        const { sdk } = await import("@farcaster/miniapp-sdk");
        await sdk.actions.composeCast({ text, embeds: [c.url] });
      } else if (navigator.share)
        await navigator.share({ title: "Beat my MOONSHOT flight", text, url: c.url });
      else await copy(c.url);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) showError(e);
    }
  };
  const equip = async (next: Look) => {
    if (!boot?.pilot) {
      setDialog("login");
      return;
    }
    try {
      await api("equip", { look: next });
      setLook(next);
      setBoot((b) => (b?.pilot ? { ...b, pilot: { ...b.pilot, equipped: next } } : b));
      setNotice(`${LOOKS.find((l) => l.id === next)?.name} equipped.`);
    } catch (e) {
      showError(e);
    }
  };
  const addFriend = async () => {
    if (!boot?.pilot) {
      setDialog("login");
      return;
    }
    try {
      await api("friend", { identifier: friendInput });
      setFriends(await api("friends"));
      setFriendInput("");
      setScope("friends");
      setBoard(await api(`board?period=${period}&scope=friends`));
      setNotice("Pilot added to your circle.");
    } catch (e) {
      showError(e);
    }
  };
  const openCheckout = async () => {
    if (!boot?.pilot?.wallet) {
      setDialog("login");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const o = await api<NonNullable<typeof order>>("order", {});
      setOrder(o);
      const stored = localStorage.getItem(`moonshot-payment:${o.id}`);
      setPaymentHash(o.hash ?? stored ?? "");
      setDialog("checkout");
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };
  const confirmPayment = async (hash: string, id: string) => {
    await api("payment", { id, hash });
    localStorage.removeItem(`moonshot-payment:${id}`);
    await refresh();
    setDialog(null);
    setNotice("After Hours unlocked. Choose your new look.");
  };
  const pay = async () => {
    if (!order || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      if (paymentHash) {
        await confirmPayment(paymentHash, order.id);
        return;
      }
      if (Date.now() > order.expiresAt)
        throw new Error("Checkout expired. Close this dialog and start again.");
      const h = await sendPackPayment(mini.inApp, order.payer);
      setPaymentHash(h);
      localStorage.setItem(`moonshot-payment:${order.id}`, h);
      setNotice("Payment sent. Check confirmation to unlock your pack.");
    } catch (e) {
      showError(e);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const resetLeft = boot ? Math.max(0, boot.resetAt - now) : 0;
  const reset = `${String(Math.floor(resetLeft / 3600000)).padStart(2, "0")}:${String(Math.floor(resetLeft / 60000) % 60).padStart(2, "0")}:${String(Math.floor(resetLeft / 1000) % 60).padStart(2, "0")}`;
  const result =
    mode === "daily"
      ? round?.status === "cash"
        ? "cash"
        : round?.status === "rug"
          ? "rug"
          : null
      : snap.result;
  const multiplier =
    mode === "daily" && round?.status !== "flying" ? (round?.multiplier ?? 1) : snap.mult;
  const label = busy
    ? "Working…"
    : mode === "daily" && !boot?.pilot
      ? "Connect & enter daily"
      : flying
        ? snap.phase === "arming"
          ? "Ignition…"
          : `Bank ${formatMult(multiplier)}`
        : mode === "daily" && finished
          ? "Daily flight complete"
          : mode === "practice" && balance < 10
            ? "Refill 1,000 credits"
            : mode === "daily"
              ? `Launch flight ${(daily?.used ?? 0) + 1} of 10`
              : "Launch a flight";
  const leagueContent = (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">THE FLIGHT BOARD</span>
          <h2>Climb together.</h2>
        </div>
        <Trophy size={21} />
      </div>
      <div className="board-filters">
        <div className="segmented compact">
          <button onClick={() => setPeriod("day")} aria-pressed={period === "day"}>
            Daily
          </button>
          <button onClick={() => setPeriod("week")} aria-pressed={period === "week"}>
            Weekly
          </button>
        </div>
        <button
          className={`subtle-button ${scope === "friends" ? "selected" : ""}`}
          onClick={() => setScope(scope === "all" ? "friends" : "all")}
        >
          <Users size={14} />
          {scope === "friends" ? "Friends" : "Everyone"}
        </button>
      </div>
      <p className="fine">
        {period === "day"
          ? "Final stack after all 10 flights."
          : "Sum of completed daily stacks. Resets Monday UTC."}
      </p>
      <div className="board-table">
        <div className="board-head">
          <span>PILOT</span>
          <span>STACK</span>
        </div>
        {board.length ? (
          board.map((row) => (
            <div className={`board-row ${row.you ? "you" : ""}`} key={row.id}>
              <span className="rank">{String(row.rank).padStart(2, "0")}</span>
              <Avatar name={row.name} src={row.avatar} />
              <span className="pilot-name">
                {row.name}
                {row.you && <small>YOU</small>}
                {period === "week" && (
                  <small>
                    {row.days} {row.days === 1 ? "day" : "days"}
                  </small>
                )}
              </span>
              <strong>{number(row.score)}</strong>
            </div>
          ))
        ) : (
          <div className="empty-board">
            <Globe size={26} />
            <strong>
              {scope === "friends" ? "Your circle starts here." : "The runway is open."}
            </strong>
            <p>
              {scope === "friends"
                ? "Add a pilot below. Completed daily runs will appear here."
                : "Finish ten daily flights to put the first score on the board."}
            </p>
          </div>
        )}
      </div>
      <div className="board-bottom">
        <ShieldCheck size={14} />
        <span>Server-scored · play money · no prize pool</span>
      </div>
    </>
  );
  return (
    <div className="moonshot-root" data-theme="dark">
    <main className="moonshot-app">
      <header className="app-header">
        <Link to="/arcade" className="back-to-arcade" aria-label="Back to Neon Arcade Hub">
          ← Arcade
        </Link>
        <a className="wordmark" href="/moonshot" aria-label="MOONSHOT home">
          moonshot<span className="brand-orbit">↗</span>
        </a>
        <span className="header-caption">THE DAILY FLIGHT CLUB</span>
        <div className="header-actions">
          <button
            className="icon-button"
            aria-label={light ? "Switch to dark theme" : "Switch to light theme"}
            onClick={() => {
              applyTheme(light ? "dark" : "light");
              setLight(!light);
            }}
          >
            {light ? <Moon size={17} /> : <Sun size={17} />}
          </button>
          <button
            className="icon-button"
            aria-label={muted ? "Unmute" : "Mute"}
            onClick={() => {
              const v = !muted;
              setMuted(v);
              runtime.current.muted = v;
              getAudio().setMuted(v);
              if (mode === "practice") persist(runtime.current);
            }}
          >
            {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
          {boot?.pilot ? (
            <>
              <button className="pilot-button" onClick={() => setDialog("login")}>
                <Avatar name={boot.pilot.name} src={boot.pilot.avatar} />
                <span>{boot.pilot.name}</span>
              </button>
              <button
                className="icon-button logout"
                aria-label="Sign out"
                disabled={flying}
                onClick={() => void signOut()}
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <button className="pilot-button" onClick={() => setDialog("login")}>
              Connect pilot
              <ArrowUpRight size={14} />
            </button>
          )}
        </div>
      </header>
      <div className="masthead">
        <div>
          <div className="eyebrow">
            <span className="live-dot" />
            FREE TO PLAY. HARD TO LET GO.
          </div>
          <h1>Trust your timing.</h1>
          <p>Ride the climb. Bank before the rug. See you on the board.</p>
        </div>
        <div className="reset-clock">
          <span className="eyebrow">NEXT DAILY RESET</span>
          <strong>{reset}</strong>
          <span>00:00 UTC · a fresh start for everyone</span>
        </div>
      </div>
      <nav className="mobile-tabs" aria-label="Main navigation">
        {(
          [
            { id: "play", name: "Play", icon: Rocket },
            { id: "league", name: "League", icon: Trophy },
            { id: "locker", name: "Locker", icon: Palette },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            aria-current={tab === t.id ? "page" : undefined}
            onClick={() => setTab(t.id)}
          >
            <t.icon size={16} />
            {t.name}
          </button>
        ))}
      </nav>
      {error && (
        <div className="feedback error" role="alert">
          <span>{error}</span>
          <button className="icon-button" aria-label="Dismiss error" onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {notice && (
        <div className="feedback success" role="status">
          <Check size={16} />
          {notice}
        </div>
      )}
      {challenge && (
        <div className="challenge-banner">
          <Avatar name={challenge.name} src={challenge.avatar} />
          <div>
            <strong>
              {challenge.name} challenges you to beat {formatMult(challenge.multiplier)}
            </strong>
            <p>
              {mode === "daily"
                ? "Bank a higher multiplier in a verified daily flight."
                : "Try it in practice, or enter Daily to record a verified result."}
              {result === "cash" && multiplier > challenge.multiplier
                ? " You beat the target!"
                : ""}
            </p>
          </div>
          <button
            className="icon-button"
            aria-label="Dismiss challenge"
            onClick={() => setChallenge(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <div className="main-grid">
        <section className={`play-column ${tab !== "play" ? "mobile-hidden" : ""}`}>
          <div className="game-toolbar">
            <div className="segmented">
              <button
                disabled={flying || busy}
                aria-pressed={mode === "practice"}
                onClick={() => changeMode("practice")}
              >
                Practice<span>∞</span>
              </button>
              <button
                disabled={flying || busy}
                aria-pressed={mode === "daily"}
                onClick={() => changeMode("daily")}
              >
                Daily flight
                <ShieldCheck size={13} />
              </button>
            </div>
            <button className="subtle-button" onClick={() => setDialog("rules")}>
              <HelpCircle size={15} />
              <span>How to play</span>
            </button>
          </div>
          <div className="game-card">
            <div className="stage-meta">
              <span>
                <span className={`live-dot ${flying ? "active" : ""}`} />
                {mode === "daily" ? "RANKED FLIGHT" : "PRACTICE FLIGHT"}
              </span>
              <span>
                {mode === "daily"
                  ? `${daily?.completed ?? 0} / 10 complete`
                  : "NO LIMITS. NO PRESSURE."}
              </span>
            </div>
            <div
              className="flight-stage"
              onPointerDown={(e) => {
                if (e.button === 0 && flying && snap.phase === "flying") void action();
              }}
            >
              <canvas ref={canvas} aria-hidden="true" />
              <div className={`multiplier ${result === "rug" ? "lost" : ""}`}>
                <span>{formatMult(multiplier)}</span>
                <p>
                  {flying
                    ? snap.phase === "arming"
                      ? "Ready for ignition…"
                      : "Climbing. Bank whenever you’re ready."
                    : result === "cash"
                      ? `Banked. +${number(mode === "daily" ? (round?.payout ?? 0) : snap.payout)} credits`
                      : result === "rug"
                        ? "Rugged. A new flight awaits."
                        : "How far will you go?"}
                </p>
              </div>
              <div className="stage-corner">
                <ArrowUpRight size={17} />
                <span>{LOOKS.find((l) => l.id === look)?.name}</span>
              </div>
            </div>
            <div className="stack-strip">
              <div>
                <span className="eyebrow">
                  {mode === "daily" ? "DAILY STACK" : "PRACTICE STACK"}
                </span>
                <strong>
                  {number(balance)}
                  <small> credits</small>
                </strong>
              </div>
              <div
                className="flight-dots"
                aria-label={
                  mode === "daily"
                    ? `${daily?.completed ?? 0} of 10 flights completed`
                    : `${progress} practice flights`
                }
              >
                {mode === "daily" ? (
                  Array.from({ length: 10 }, (_, i) => (
                    <span
                      key={i}
                      className={
                        i < (daily?.completed ?? 0)
                          ? "complete"
                          : i < (daily?.used ?? 0)
                            ? "in-flight"
                            : ""
                      }
                    />
                  ))
                ) : (
                  <span className="practice-mark">∞</span>
                )}
              </div>
            </div>
            <div className="flight-controls">
              <div className="control-line">
                <span>Flight size</span>
                {mode === "daily" ? (
                  <strong className="fixed-stake">
                    100 credits <Lock size={12} />
                  </strong>
                ) : (
                  <div className="chips">
                    {[10, 25, 50, 100].map((n) => (
                      <button
                        key={n}
                        disabled={flying}
                        aria-pressed={stake === n}
                        onClick={() => setStake(n)}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="control-line">
                <label htmlFor="auto">
                  Auto bank <span className="fine">optional</span>
                </label>
                <select
                  id="auto"
                  disabled={flying}
                  value={auto ?? "off"}
                  onChange={(e) =>
                    setAuto(e.target.value === "off" ? null : Number(e.target.value))
                  }
                >
                  <option value="off">Manual</option>
                  {[1.5, 2, 3, 5, 10].map((n) => (
                    <option value={n} key={n}>
                      {n.toFixed(2)}×
                    </option>
                  ))}
                </select>
              </div>
              <button
                className={`launch-button ${flying ? "bank-button" : ""}`}
                onClick={() => void action()}
                disabled={
                  busy || (mode === "daily" && finished && !flying) || snap.phase === "arming"
                }
              >
                <span>{label}</span>
                {flying ? <Check size={20} /> : <ArrowUpRight size={21} />}
              </button>
              <p className="control-caption">
                {mode === "daily"
                  ? "10 flights · fixed 100-credit stakes · one run per pilot each day"
                  : "Free refills. Practice scores never enter the leaderboard."}
              </p>
            </div>
          </div>
          {mode === "daily" && round && round.status !== "flying" && (
            <div className="result-card">
              <div>
                <span className="eyebrow">FLIGHT {round.number} COMPLETE</span>
                <h3>
                  {round.status === "cash"
                    ? "A little nerve. A clean landing."
                    : "Every pilot gets rugged."}
                </h3>
                <p>
                  {proof === "verified" ? (
                    <>
                      <ShieldCheck size={14} /> Commitment verified
                    </>
                  ) : proof === "failed" ? (
                    "Verification failed. Do not trust this result."
                  ) : (
                    "Checking round commitment…"
                  )}
                </p>
              </div>
              {round.status === "cash" && round.multiplier! > 1 && (
                <button className="secondary-button" onClick={() => void share()}>
                  Challenge a friend
                  <ArrowUpRight size={15} />
                </button>
              )}
              <details className="round-proof">
                <summary>Round verification</summary>
                <p>
                  The server committed to a secret before launch. Your browser checks the revealed
                  secret and crash value after settlement. This verifies the commitment, not
                  independent randomness.
                </p>
                <code>
                  Round: {round.id}
                  <br />
                  Commitment: {round.commitment}
                  <br />
                  Secret: {round.seed}
                  <br />
                  Crash: {round.crash?.toFixed(2)}×
                </code>
              </details>
            </div>
          )}
          {mode === "daily" && finished && (
            <div className="finished-card">
              <Trophy size={30} />
              <div>
                <h3>That’s your daily flight.</h3>
                <p>
                  Final stack: <strong>{number(daily!.balance)}</strong>. Your result is on the
                  board. New flights in {reset}.
                </p>
              </div>
              <button className="secondary-button" onClick={() => changeMode("practice")}>
                Keep practicing
                <ArrowRight size={15} />
              </button>
            </div>
          )}
          {mode === "practice" && snap.history.length > 0 && (
            <div className="history">
              <span>RECENT RUGS</span>
              {snap.history.slice(0, 8).map((n, i) => (
                <span className={n >= 2 ? "positive" : ""} key={i}>
                  {formatMult(n)}
                </span>
              ))}
            </div>
          )}
          <div className="below-game">
            <span>
              <ShieldCheck size={14} />
              Play money. No deposits to play.
            </span>
            <button
              className="text-button"
              onClick={() => {
                runtime.current.shake = !runtime.current.shake;
                setNotice(runtime.current.shake ? "Screen shake on." : "Screen shake off.");
              }}
            >
              Toggle screen shake
            </button>
          </div>
        </section>
        <aside className={`side-column ${tab === "play" ? "mobile-hidden" : ""}`}>
          <section className={`panel league-panel ${tab === "locker" ? "mobile-hidden" : ""}`}>
            {leagueContent}
          </section>
          <section className={`panel friends-panel ${tab === "locker" ? "mobile-hidden" : ""}`}>
            <div className="section-heading">
              <h3>Your flight circle</h3>
              <Users size={17} />
            </div>
            <p className="fine">Follow pilots by wallet, Farcaster ID, or pilot ID.</p>
            <form
              className="friend-form"
              onSubmit={(e) => {
                e.preventDefault();
                void addFriend();
              }}
            >
              <input
                aria-label="Friend wallet, FID or pilot ID"
                placeholder="Wallet / FID / pilot ID"
                value={friendInput}
                onChange={(e) => setFriendInput(e.target.value)}
                maxLength={100}
              />
              <button className="icon-button" type="submit" aria-label="Add friend">
                <ArrowRight size={18} />
              </button>
            </form>
            {friends.map((f) => (
              <div className="friend-row" key={f.id}>
                <Avatar name={f.name} src={f.avatar} />
                <span>{f.name}</span>
                <button
                  className="icon-button"
                  aria-label={`Remove ${f.name}`}
                  onClick={async () => {
                    try {
                      await api("friend", { identifier: f.id, remove: true });
                      setFriends(await api("friends"));
                      setBoard(await api(`board?period=${period}&scope=${scope}`));
                    } catch (e) {
                      showError(e);
                    }
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {boot?.pilot && (
              <button className="text-button" onClick={() => void copy(boot.pilot!.id)}>
                <Copy size={12} />
                Copy my pilot ID
              </button>
            )}
          </section>
          <section className={`panel locker-panel ${tab === "league" ? "mobile-hidden" : ""}`}>
            <div className="section-heading">
              <div>
                <span className="eyebrow">THE COSMETIC COLLECTION</span>
                <h2>After Hours.</h2>
              </div>
              <Sparkles size={20} />
            </div>
            <p className="panel-description">
              Same nerve. A different glow.
              <br />
              Three flight looks. Yours to keep.
            </p>
            <div
              className="look-preview"
              style={
                {
                  "--preview-color": LOOKS.find((l) => l.id === preview)?.color,
                } as React.CSSProperties
              }
            >
              <span>{LOOKS.find((l) => l.id === preview)?.name}</span>
              <svg viewBox="0 0 300 100" role="img" aria-label={`${preview} chart trail preview`}>
                <path
                  className="preview-grid"
                  d="M0 80H300M0 45H300M75 0V100M150 0V100M225 0V100"
                />
                <path className="preview-glow" d="M10 90Q190 95 282 12" />
                <path className="preview-line" d="M10 90Q190 95 282 12" />
                <circle cx="282" cy="12" r="4" />
              </svg>
              <span className="preview-label">COSMETIC PREVIEW</span>
            </div>
            <div className="look-swatches">
              {LOOKS.map((l) => (
                <button
                  key={l.id}
                  style={{ "--swatch": l.color } as React.CSSProperties}
                  aria-label={`Preview ${l.name}`}
                  aria-pressed={preview === l.id}
                  onClick={() => setPreview(l.id)}
                >
                  <span />
                  {preview === l.id && <Check size={12} />}
                </button>
              ))}
              <span>{LOOKS.find((l) => l.id === preview)?.name}</span>
            </div>
            {boot?.pilot?.owned || preview === "base" ? (
              <button
                className="secondary-button full"
                onClick={() => void equip(preview)}
                disabled={look === preview}
              >
                {look === preview
                  ? "Equipped"
                  : `Equip ${LOOKS.find((l) => l.id === preview)?.name}`}
                <Palette size={15} />
              </button>
            ) : (
              <button
                className="secondary-button full"
                disabled={busy || !boot?.checkoutEnabled}
                onClick={() => void openCheckout()}
              >
                <span>
                  {boot?.checkoutEnabled ? "Unlock pack · 5 USDC" : "5 USDC · available at launch"}
                </span>
                <ArrowUpRight size={16} />
              </button>
            )}
            <p className="fine centered">
              One-time purchase on Base. Cosmetic only.
              <br />
              No boosts, extra flights, tokens, or promised rewards.
            </p>
            {boot?.pendingOrder && (
              <button
                className="text-button"
                onClick={() => {
                  const id = boot.pendingOrder!.id;
                  setOrder({
                    id,
                    payer: boot.pilot?.wallet ?? "",
                    expiresAt: 0,
                    hash: boot.pendingOrder!.hash,
                  });
                  setPaymentHash(
                    boot.pendingOrder!.hash ?? localStorage.getItem(`moonshot-payment:${id}`) ?? "",
                  );
                  setDialog("checkout");
                }}
              >
                Restore a pending purchase
              </button>
            )}
          </section>
          {boot?.pilot && (
            <section className={`panel personal-panel ${tab === "league" ? "mobile-hidden" : ""}`}>
              <span className="eyebrow">YOUR FLIGHT LOG</span>
              <div className="personal-stats">
                <div>
                  <strong>{boot.pilot.completed}</strong>
                  <span>verified flights</span>
                </div>
                <div>
                  <strong>{formatMult(boot.pilot.best || 1)}</strong>
                  <span>best bank</span>
                </div>
              </div>
              <div className="badge-row">
                <span className={boot.pilot.completed >= 1 ? "earned" : ""}>
                  <Rocket size={14} />
                  First flight
                </span>
                <span className={boot.pilot.completed >= 10 ? "earned" : ""}>
                  <Trophy size={14} />
                  Daily regular
                </span>
                <span className={boot.pilot.best >= 5 ? "earned" : ""}>
                  <Flame size={14} />
                  5× club
                </span>
              </div>
            </section>
          )}
          {mini.inApp && !mini.added && (
            <button
              className="secondary-button full"
              onClick={() =>
                void saveMiniApp()
                  .then(() => {
                    setMini((m) => ({ ...m, added: true }));
                    setNotice("Saved to your apps.");
                  })
                  .catch(showError)
              }
            >
              Save MOONSHOT
              <ArrowUpRight size={16} />
            </button>
          )}
        </aside>
      </div>
      <footer className="app-footer">
        <span>
          MOONSHOT <span className="footer-dot">·</span> Make your exit count.
        </span>
        <button className="text-button" onClick={() => setDialog("rules")}>
          Rules & fairness
        </button>
      </footer>
      {dialog === "login" && (
        <Modal title={boot?.pilot ? "Your pilot" : "Meet you on the board."} close={closeDialog}>
          <p>
            Connect to save daily flights, challenge friends, and keep your cosmetics across
            devices. Practice is always open.
          </p>
          {boot?.pilot && (
            <div className="identity-card">
              <Avatar name={boot.pilot.name} src={boot.pilot.avatar} />
              <div>
                <strong>{boot.pilot.name}</strong>
                <p>{boot.pilot.wallet ?? "Farcaster pilot · no wallet linked"}</p>
              </div>
            </div>
          )}
          {mini.inApp && !boot?.pilot && (
            <button
              className="secondary-button full"
              disabled={busy}
              onClick={() => void signIn("farcaster")}
            >
              Continue with Farcaster
              <ArrowRight size={16} />
            </button>
          )}
          <button className="launch-button" disabled={busy} onClick={() => void signIn("wallet")}>
            <span>
              {busy
                ? "Check your wallet…"
                : boot?.pilot && !boot.pilot.wallet
                  ? "Link a Base wallet"
                  : "Continue with wallet"}
            </span>
            <ArrowUpRight size={18} />
          </button>
          {boot?.pilot && (
            <button className="secondary-button full" disabled={flying} onClick={() => void signOut()}>
              Sign out <LogOut size={16} />
            </button>
          )}
          <p className="fine">
            Sign-in asks for a message signature. It does not transfer funds or approve spending.
          </p>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
        </Modal>
      )}
      {dialog === "rules" && (
        <Modal title="A good flight starts here." close={closeDialog}>
          <ol className="rules-list">
            <li>
              <strong>Launch.</strong> The multiplier climbs from 1.00×.
            </li>
            <li>
              <strong>Bank.</strong> Exit before the random rug. Wait too long and the flight’s
              stake is lost.
            </li>
            <li>
              <strong>Come back.</strong> Daily mode gives every pilot ten 100-credit flights from a
              1,000-credit stack. Finish all ten to rank.
            </li>
          </ol>
          <h3>Fair flights</h3>
          <p>
            Ranked outcomes and balances are calculated on the server. Each flight reveals its
            committed secret after it ends. Auto bank is fixed before launch and settles on the
            server, even if you disconnect. A crash at exactly your auto target loses.
          </p>
          <p>
            Manual banks use the time your request reaches the server, so network delay matters. Use
            auto bank for a precise target. Reloading does not restore a ranked stake or reroll a
            flight.
          </p>
          <p>
            Daily reset: 00:00 UTC. Weekly board: Monday–Sunday UTC, summing completed daily stacks.
            Ties share a rank. One allowance per account; multiple-account abuse is not fully
            prevented.
          </p>
          <p>
            Credits have no cash value. There is no token drop, prize pool, or cash withdrawal.
            Cosmetics never change the odds. The crash distribution uses a 3% parameter; rounding
            and the 1,000× cap affect exact returns. Outcomes involve chance.
          </p>
          <p className="fine">
            Account identifiers, scores, and cosmetic ownership are stored to run the game.
            Leaderboard names and shared flights are public. No wallet private keys are collected.
          </p>
        </Modal>
      )}
      {dialog === "checkout" && order && (
        <Modal title="Your After Hours pack." close={closeDialog}>
          <p>
            Acid lime, Solar flare, and Ultraviolet. A permanent cosmetic unlock for this pilot.
          </p>
          <div className="checkout-details">
            <div>
              <span>Total</span>
              <strong>5 USDC</strong>
            </div>
            <div>
              <span>Network</span>
              <strong>Base mainnet</strong>
            </div>
            <div>
              <span>Gas</span>
              <span>Shown by your wallet</span>
            </div>
            <label>Receiving address</label>
            <code>{PACK.recipient}</code>
          </div>
          {paymentHash ? (
            <>
              <label className="field-label" htmlFor="payment-hash">
                Payment transaction
              </label>
              <input
                id="payment-hash"
                className="full-input"
                value={paymentHash}
                onChange={(e) => setPaymentHash(e.target.value)}
                spellCheck={false}
              />
              <p className="fine">
                We verify the token, payer, recipient, amount, checkout window and confirmations
                before unlocking. You will not be charged again.
              </p>
            </>
          ) : order.expiresAt === 0 ? (
            <>
              <label className="field-label" htmlFor="restore-hash">
                Paste your payment transaction hash
              </label>
              <input
                id="restore-hash"
                className="full-input"
                value={paymentHash}
                onChange={(e) => setPaymentHash(e.target.value)}
                placeholder="0x…"
              />
            </>
          ) : (
            <p className="fine">
              Your wallet will show the exact transaction and network fee before you approve it.
              This purchases cosmetics only.
            </p>
          )}
          <button
            className="launch-button"
            disabled={busy || (!paymentHash && order.expiresAt === 0)}
            onClick={() => void pay()}
          >
            <span>
              {busy ? "Checking…" : paymentHash ? "Check payment & unlock" : "Pay 5 USDC in wallet"}
            </span>
            <ArrowUpRight size={18} />
          </button>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
        </Modal>
      )}
    </main>
  );
}

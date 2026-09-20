"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Client, Room, Callbacks } from "@colyseus/sdk";
import {
    User,
    RefreshCw,
    LogOut,
    Trophy,
    Zap,
    Clock,
    ArrowRight,
    Plus,
    Hash,
    Copy,
    Check,
    Link2,
    Eye,
} from "lucide-react";
import TypingField from "../typing-field";
import { computeWpm } from "@/lib/typing";

// ─── Types ───────────────────────────────────────────────────────────────────

/** The decoded shape of a `Player` in the room's schema. */
type PlayerSchema = {
    name: string;
    progress: number;
    finished: boolean;
    finishTime: number;
    ready: boolean;
    wpm: number;
    spectating: boolean;
};

type PlayerInfo = {
    sessionId: string;
    name: string;
    progress: number;
    finished: boolean;
    finishTime: number;
    ready: boolean;
    wpm: number;
    spectating: boolean;
};

type RoomStatus = "waiting" | "countdown" | "racing" | "finished";

// ─── Room codes ──────────────────────────────────────────────────────────────

/** Matches the server's alphabet: no 0/O and no 1/I/L to mistype. */
const ROOM_CODE_LENGTH = 4;

function normalizeRoomCode(input: string) {
    return input.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, ROOM_CODE_LENGTH);
}

// ─── Names ───────────────────────────────────────────────────────────────────

const NAME_ADJECTIVES = ["Swift", "Quiet", "Golden", "Rapid", "Clever", "Bright", "Silent", "Nimble", "Lucky", "Brave"];
const NAME_NOUNS = ["Fox", "Crane", "Comet", "Maple", "Falcon", "Otter", "Pine", "Heron", "Ember", "Koi"];

function pick<T>(list: T[]) {
    return list[Math.floor(Math.random() * list.length)];
}

/** A ready-to-go name, so the guest gate is one click rather than a decision. */
function suggestName() {
    return `${pick(NAME_ADJECTIVES)}${pick(NAME_NOUNS)}${Math.floor(Math.random() * 90) + 10}`;
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

const AVATAR_GRADIENTS = [
    "from-sky-400 to-blue-600",
    "from-violet-400 to-purple-600",
    "from-emerald-400 to-green-600",
    "from-rose-400 to-pink-600",
    "from-amber-400 to-orange-600",
    "from-cyan-400 to-teal-600",
];

function avatarGradient(name: string) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function initials(name: string) {
    const parts = name.split(/[\s\-_]+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
    const sz = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-14 h-14 text-lg" : "w-10 h-10 text-sm";
    return (
        <div
            className={`${sz} rounded-full bg-gradient-to-br ${avatarGradient(name)} flex items-center justify-center font-bold text-white/95 shrink-0 ring-1 ring-white/20 shadow-[0_6px_18px_-6px_rgba(0,0,0,0.9)]`}
        >
            {initials(name)}
        </div>
    );
}

// ─── Room code banner ────────────────────────────────────────────────────────

function RoomCodeBanner({ code }: { code: string }) {
    const [copied, setCopied] = useState<"code" | "link" | null>(null);

    const copy = async (what: "code" | "link") => {
        const text = what === "code" ? code : `${window.location.origin}/race?code=${code}`;
        try {
            await navigator.clipboard.writeText(text);
            setCopied(what);
            setTimeout(() => setCopied(null), 1600);
        } catch {
            // Clipboard is blocked outside secure contexts; the code is on
            // screen and selectable, so there is nothing to recover from.
        }
    };

    return (
        <div className="panel panel-lit flex flex-col sm:flex-row items-center gap-5 px-6 py-4 rounded-2xl">
            <div className="text-center sm:text-left">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--ink-faint)] mb-1">
                    Room Code
                </div>
                <div className="font-mono text-4xl font-extrabold tracking-[0.35em] text-[var(--accent-warm)] select-all pl-[0.35em] drop-shadow-[0_0_18px_rgba(245,198,107,0.4)]">
                    {code}
                </div>
            </div>

            <div className="flex gap-2 sm:ml-2">
                <button onClick={() => copy("code")} className="btn btn-ghost text-xs px-3 py-2">
                    {copied === "code" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied === "code" ? "Copied" : "Copy code"}
                </button>
                <button onClick={() => copy("link")} className="btn btn-ghost text-xs px-3 py-2">
                    {copied === "link" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link2 className="w-3.5 h-3.5" />}
                    {copied === "link" ? "Copied" : "Copy invite link"}
                </button>
            </div>
        </div>
    );
}

// ─── Progress row ────────────────────────────────────────────────────────────

function ProgressRow({ player }: { player: PlayerInfo }) {
    return (
        <div className="flex items-center gap-3">
            <Avatar name={player.name} size="sm" />
            <div className="w-28 shrink-0">
                <span className="text-xs font-semibold text-[var(--ink-soft)] truncate block">{player.name}</span>
                {player.wpm > 0 && (
                    <span className="text-[10px] text-[var(--ink-faint)] tabular-nums">{player.wpm} wpm</span>
                )}
            </div>
            <div className="flex-1 h-2 bg-white/[0.07] rounded-full overflow-hidden ring-1 ring-inset ring-white/5">
                <div
                    className={`h-full rounded-full transition-all duration-200 ease-out ${
                        player.finished
                            ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]"
                            : "bg-gradient-to-r from-sky-500/70 to-sky-300"
                    }`}
                    style={{ width: `${player.progress}%` }}
                />
            </div>
            <span className="text-xs text-[var(--ink-faint)] w-9 text-right tabular-nums">{player.progress}%</span>
        </div>
    );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function RaceClient() {
    const [room, setRoom] = useState<Room | null>(null);
    const roomRef = useRef<Room | null>(null);

    const [players, setPlayers] = useState<Record<string, PlayerInfo>>({});
    const [paragraph, setParagraph] = useState("");
    const [connStatus, setConnStatus] = useState<"menu" | "connecting" | "connected" | "error">("menu");
    const [connError, setConnError] = useState("");
    const [roomStatus, setRoomStatus] = useState<RoomStatus>("waiting");
    const [serverCountdown, setServerCountdown] = useState<number>(-1);

    const [guestName, setGuestName] = useState("");
    const [nameInput, setNameInput] = useState("");
    const [roomCodeInput, setRoomCodeInput] = useState("");

    // Typing state
    const [typedText, setTypedText] = useState("");
    const [totalMistakes, setTotalMistakes] = useState(0);
    const [typedChars, setTypedChars] = useState(0);
    const [liveWpm, setLiveWpm] = useState(0);
    const lastValRef = useRef("");
    const startTimeRef = useRef<number | null>(null);
    const lastSentTime = useRef<number>(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const didInit = useRef(false);
    const playerName = useRef("");
    /** A code from an invite link, held until the guest has picked a name. */
    const [pendingCode, setPendingCode] = useState<string | null>(null);

    // Derived
    const sessionId = room?.sessionId ?? "";
    const matchId = room?.roomId ? String(room.roomId) : "----";

    // ── Connection ──────────────────────────────────────────────────────────

    const connect = useCallback(async (method: "joinOrCreate" | "create" | "joinById", target: string) => {
        setConnStatus("connecting");
        setConnError("");

        const client = new Client(process.env.NEXT_PUBLIC_COLYSEUS_URL);
        let activeRoom: Room;
        try {
            if (method === "joinOrCreate") {
                activeRoom = await client.joinOrCreate(target, { name: playerName.current });
            } else if (method === "create") {
                activeRoom = await client.create(target, { name: playerName.current, private: true });
            } else {
                activeRoom = await client.joinById(target, { name: playerName.current });
            }

            setRoom(activeRoom);
            roomRef.current = activeRoom;
            setPlayers({});

            const cb = Callbacks.get(activeRoom);

            // The room schema is not shared with the client, so the decoded
            // values arrive as `unknown` and are narrowed here.
            cb.onAdd("players", (value: unknown, key: unknown) => {
                const player = value as PlayerSchema;
                const id = String(key);
                const snapshot = (): PlayerInfo => ({
                    sessionId: id,
                    name: player.name,
                    progress: player.progress,
                    finished: player.finished,
                    finishTime: player.finishTime,
                    ready: player.ready,
                    wpm: player.wpm,
                    spectating: player.spectating,
                });

                setPlayers(prev => ({ ...prev, [id]: snapshot() }));

                // One subscription per player, re-snapshotting everything.
                // Listening field by field is how finishTime used to go stale
                // and scramble the final standings.
                cb.onChange(player, () => {
                    setPlayers(prev => ({ ...prev, [id]: snapshot() }));
                });
            });

            cb.onRemove("players", (_: unknown, key: unknown) => {
                setPlayers(prev => {
                    const next = { ...prev };
                    delete next[String(key)];
                    return next;
                });
            });

            cb.listen("paragraph", (v: string) => setParagraph(v ?? ""));
            cb.listen("status", (v: string) => setRoomStatus((v as RoomStatus) ?? "waiting"));
            cb.listen("countdown", (v: number) => setServerCountdown(v ?? -1));

            // Hydrate from whatever state is already in hand. Joining resolves
            // before the first state patch arrives, so these are often still
            // undefined; the listeners above fill them in a moment later.
            setRoomStatus((activeRoom.state?.status as RoomStatus) ?? "waiting");
            setParagraph(activeRoom.state?.paragraph ?? "");
            setServerCountdown(activeRoom.state?.countdown ?? -1);
            setConnStatus("connected");
        } catch (err) {
            console.error("Connection failed:", err);
            setConnError(
                method === "joinById"
                    ? `No room with code ${target}. Check the code, or ask for a fresh invite link.`
                    : "Could not reach the game server. Check your connection and try again."
            );
            setConnStatus("error");
        }
    }, []);

    // ── Init: stored name, plus any code carried in on an invite link ───────

    // Reading localStorage and the URL has to wait for the browser, so these
    // setState calls on mount are deliberate.
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (didInit.current) return;
        didInit.current = true;

        const stored = localStorage.getItem("guestName");
        if (stored) {
            setGuestName(stored);
            playerName.current = stored;
        } else {
            // Seeded here rather than in useState so the server-rendered
            // markup stays deterministic.
            setNameInput(suggestName());
        }

        const code = normalizeRoomCode(new URLSearchParams(window.location.search).get("code") ?? "");
        if (code) {
            setRoomCodeInput(code);
            if (stored) {
                void connect("joinById", code);
            } else {
                setPendingCode(code);
            }
        }
    }, [connect]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const clearInviteParam = () => {
        if (window.location.search) {
            window.history.replaceState(null, "", window.location.pathname);
        }
    };

    const handleSaveName = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = nameInput.trim();
        if (!trimmed) return;
        localStorage.setItem("guestName", trimmed);
        setGuestName(trimmed);
        playerName.current = trimmed;

        const code = pendingCode;
        if (code) {
            setPendingCode(null);
            void connect("joinById", code);
        }
    };

    // Focus the input as soon as the race is live.
    useEffect(() => {
        if (roomStatus === "racing") {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [roomStatus]);

    // Clear local typing state whenever the room returns to the lobby. The
    // server can send us back there on its own (someone leaving mid-countdown,
    // say), so this has to react to the status rather than to a click.
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (roomStatus === "waiting") {
            setTypedText("");
            setTotalMistakes(0);
            setTypedChars(0);
            setLiveWpm(0);
            lastValRef.current = "";
            startTimeRef.current = null;
        }
    }, [roomStatus]);
    /* eslint-enable react-hooks/set-state-in-effect */

    useEffect(() => {
        return () => {
            if (roomRef.current) {
                roomRef.current.leave();
                roomRef.current = null;
            }
        };
    }, []);

    // ── Handlers ────────────────────────────────────────────────────────────

    const handleReady = () => {
        const current = roomRef.current;
        if (!current) return;
        const me = players[current.sessionId];
        if (me) current.send("ready", { ready: !me.ready });
    };

    const handleLeave = () => {
        roomRef.current?.leave();
        roomRef.current = null;
        setRoom(null);
        setConnStatus("menu");
        setConnError("");
        setPlayers({});
        clearInviteParam();
    };

    const handleBackToMenu = () => {
        setConnStatus("menu");
        setConnError("");
        clearInviteParam();
    };

    const handleRestart = () => {
        setTypedText("");
        setTotalMistakes(0);
        setTypedChars(0);
        setLiveWpm(0);
        lastValRef.current = "";
        startTimeRef.current = null;
        roomRef.current?.send("restart");
    };

    const handleTyping = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (roomStatus !== "racing") return;
        const val = e.target.value;
        if (val.length > paragraph.length) return;

        // Count mistakes on newly added characters only, so backspacing over a
        // typo does not erase the fact that it happened.
        const prevVal = lastValRef.current;
        if (val.length > prevVal.length) {
            const addedChars = val.slice(prevVal.length);
            setTypedChars(prev => prev + addedChars.length);

            let newMistakes = 0;
            for (let i = 0; i < addedChars.length; i++) {
                if (addedChars[i] !== paragraph[prevVal.length + i]) newMistakes++;
            }
            if (newMistakes > 0) setTotalMistakes(prev => prev + newMistakes);
        }

        lastValRef.current = val;
        setTypedText(val);

        if (startTimeRef.current === null && val.length > 0) {
            startTimeRef.current = Date.now();
        }

        // Progress tracks how far through the passage you physically are, not
        // how many characters are correct. Scoring it on correct characters
        // means one uncorrected typo pins you below 100 forever: the input is
        // capped at the passage length, so you can never finish and the room
        // waits on you. Mistakes cost accuracy and WPM instead, which is where
        // they belong.
        const progress = Math.min(100, Math.floor((val.length / paragraph.length) * 100));

        const startedAt = startTimeRef.current;
        const wpm = startedAt !== null ? computeWpm(val, paragraph, Date.now() - startedAt) : 0;
        setLiveWpm(wpm);

        const now = Date.now();
        if (now - lastSentTime.current > 120 || progress === 100) {
            roomRef.current?.send("progress", { progress, wpm });
            lastSentTime.current = now;
        }
    }, [roomStatus, paragraph]);

    // ── Derived values ──────────────────────────────────────────────────────

    const allPlayers = Object.values(players);
    const myPlayer = players[sessionId] ?? null;
    const racers = allPlayers.filter(p => !p.spectating);
    const opponents = racers.filter(p => p.sessionId !== sessionId);
    const isReady = myPlayer?.ready ?? false;
    const amSpectating = myPlayer?.spectating ?? false;

    const sortedByFinish = racers.filter(p => p.finished).sort((a, b) => a.finishTime - b.finishTime);
    const allSortedForResults = [
        ...sortedByFinish,
        ...racers.filter(p => !p.finished).sort((a, b) => b.progress - a.progress),
    ];
    const myRank = sortedByFinish.findIndex(p => p.sessionId === sessionId) + 1;

    const myAccuracy = typedChars > 0
        ? Math.max(0, ((typedChars - totalMistakes) / typedChars) * 100)
        : 100;

    const myProgress = myPlayer?.progress ?? 0;

    // ═══════════════════════════════════════════════════════════════════════
    // SCREEN 0: GUEST NAME
    // ═══════════════════════════════════════════════════════════════════════

    if (connStatus === "menu" && !guestName) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center pt-6">
                <div className="panel panel-lit p-9 w-full max-w-md rounded-2xl">
                    <h2 className="text-glow text-3xl font-extrabold mb-2 text-center tracking-tight">Join Multiplayer</h2>
                    <p className="text-sm text-[var(--ink-soft)] text-center mb-7">
                        {pendingCode
                            ? `You were invited to room ${pendingCode}. Pick a name to join.`
                            : "Pick a name to race against everyone else."}
                    </p>
                    <form onSubmit={handleSaveName} className="flex flex-col gap-4">
                        <input
                            type="text"
                            placeholder="e.g. SwiftFox42"
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            className="field px-4 py-3 text-center font-semibold"
                            autoFocus
                            maxLength={20}
                        />
                        <button type="submit" disabled={!nameInput.trim()} className="btn btn-primary w-full py-3">
                            Continue <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setNameInput(suggestName())}
                            className="text-xs text-[var(--ink-faint)] hover:text-[var(--ink-soft)] transition-colors"
                        >
                            Suggest another name
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SCREEN 1: MENU
    // ═══════════════════════════════════════════════════════════════════════

    if (connStatus === "menu") {
        const codeReady = roomCodeInput.length === ROOM_CODE_LENGTH;
        return (
            <div className="flex-1 flex flex-col items-center justify-center pt-6">
                <div className="flex flex-col items-center mb-9">
                    <Avatar name={guestName} size="lg" />
                    <h2 className="text-2xl font-extrabold text-[var(--ink)] mt-3.5">Welcome, {guestName}</h2>
                    <button
                        onClick={() => {
                            setGuestName("");
                            localStorage.removeItem("guestName");
                            setNameInput(suggestName());
                        }}
                        className="text-xs text-[var(--ink-faint)] hover:text-[var(--ink-soft)] mt-1.5 transition-colors underline"
                    >
                        Change name
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-2xl">
                    <button
                        onClick={() => connect("joinOrCreate", "typing_room")}
                        className="panel panel-lit p-8 flex flex-col items-center justify-center rounded-2xl transition-transform hover:-translate-y-1 group"
                    >
                        <div className="w-14 h-14 rounded-full bg-sky-400/10 ring-1 ring-sky-300/25 flex items-center justify-center mb-4 transition-all group-hover:bg-sky-400/20 group-hover:shadow-[0_0_28px_rgba(108,197,255,0.4)]">
                            <Zap className="w-6 h-6 text-sky-300" />
                        </div>
                        <h3 className="text-xl font-extrabold text-[var(--ink)] mb-1.5">Quick Play</h3>
                        <p className="text-sm text-[var(--ink-soft)] text-center">Drop straight into a room with whoever is online.</p>
                    </button>

                    <div className="flex flex-col gap-4">
                        <button
                            onClick={() => connect("create", "typing_room")}
                            className="panel p-5 flex items-center gap-4 rounded-2xl transition-transform hover:-translate-y-0.5"
                        >
                            <div className="w-10 h-10 rounded-full bg-white/[0.06] ring-1 ring-white/10 flex items-center justify-center shrink-0">
                                <Plus className="w-5 h-5 text-[var(--ink-soft)]" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold text-[var(--ink)]">Create Room</h3>
                                <p className="text-xs text-[var(--ink-faint)]">Get a 4-letter code to share</p>
                            </div>
                        </button>

                        <div className="panel p-5 flex flex-col gap-3 rounded-2xl">
                            <div className="flex items-center gap-2 text-sm font-bold text-[var(--ink)]">
                                <Hash className="w-4 h-4 text-[var(--ink-faint)]" />
                                Join with Code
                            </div>
                            <form
                                className="flex gap-2"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (codeReady) connect("joinById", roomCodeInput);
                                }}
                            >
                                <input
                                    type="text"
                                    placeholder="ABCD"
                                    value={roomCodeInput}
                                    onChange={(e) => setRoomCodeInput(normalizeRoomCode(e.target.value))}
                                    maxLength={ROOM_CODE_LENGTH}
                                    autoComplete="off"
                                    spellCheck={false}
                                    className="field flex-1 px-3 py-2 font-mono text-lg font-bold tracking-[0.3em] text-center uppercase"
                                />
                                <button type="submit" disabled={!codeReady} className="btn btn-primary px-5 py-2 text-sm">
                                    Join
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Loading / error ─────────────────────────────────────────────────────

    if (connStatus === "connecting") {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 pt-20">
                <div className="w-8 h-8 border-2 border-sky-300 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(108,197,255,0.5)]" />
                <p className="text-sm text-[var(--ink-soft)]">Connecting to the game server...</p>
            </div>
        );
    }

    if (connStatus === "error") {
        return (
            <div className="flex-1 flex flex-col items-center justify-center pt-16">
                <div className="panel px-8 py-9 rounded-2xl flex flex-col items-center text-center max-w-md">
                    <div className="text-rose-400 text-lg font-extrabold mb-2">Could not join</div>
                    <p className="text-[var(--ink-soft)] text-sm">{connError}</p>
                    <button onClick={handleBackToMenu} className="btn btn-primary mt-6 px-6 py-2.5 text-sm">
                        Back to menu
                    </button>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SCREEN 2: LOBBY
    // ═══════════════════════════════════════════════════════════════════════

    if (roomStatus === "waiting") {
        const lobbySlots = Array(6).fill(null).map((_, i) => allPlayers[i] ?? null);
        const readyCount = allPlayers.filter(p => p.ready).length;

        return (
            <div className="flex flex-col items-center w-full pt-2">
                <RoomCodeBanner code={matchId} />

                <h2 className="text-glow text-3xl sm:text-4xl font-extrabold mt-8 mb-1.5 tracking-tight">
                    Multiplayer Lobby
                </h2>
                <p className="text-[var(--ink-faint)] text-sm mb-8">
                    {allPlayers.length}/6 connected · {readyCount} ready · starts automatically once 2 players are ready
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl mb-9">
                    {lobbySlots.map((p, idx) => (
                        <div
                            key={idx}
                            className={`h-[72px] rounded-xl flex items-center px-4 ${
                                p ? "panel" : "border border-dashed border-white/10 bg-white/[0.015]"
                            }`}
                        >
                            {p ? (
                                <>
                                    <Avatar name={p.name} />
                                    <div className="ml-3 flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="font-bold text-[var(--ink)] truncate">{p.name}</span>
                                            {p.sessionId === sessionId && (
                                                <span className="text-[10px] text-[var(--ink-faint)] shrink-0">(you)</span>
                                            )}
                                        </div>
                                        <div className="text-xs text-[var(--ink-faint)] mt-0.5">
                                            {p.ready ? "Ready to race" : "Getting settled"}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <div className={`w-1.5 h-1.5 rounded-full ${
                                            p.ready
                                                ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"
                                                : "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]"
                                        }`} />
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${p.ready ? "text-emerald-300" : "text-amber-300"}`}>
                                            {p.ready ? "Ready" : "Waiting"}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-[var(--ink-faint)]">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <span className="ml-3 text-sm text-[var(--ink-faint)] italic">Open slot</span>
                                </>
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex flex-col items-center gap-3">
                    {allPlayers.length < 2 && (
                        <p className="text-[var(--ink-faint)] text-xs mb-1">
                            Share the code above to bring someone in.
                        </p>
                    )}
                    <button
                        onClick={handleReady}
                        className={`btn w-64 py-4 text-lg ${isReady ? "btn-success" : "btn-primary"}`}
                    >
                        {isReady ? "Ready!" : "Ready Up"}
                    </button>
                    <button
                        onClick={handleLeave}
                        className="flex items-center gap-1.5 text-sm text-[var(--ink-faint)] hover:text-[var(--ink-soft)] transition-colors mt-1"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        Leave room
                    </button>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SCREEN 3: WAITING OUT A RACE THAT WAS ALREADY UNDERWAY
    // ═══════════════════════════════════════════════════════════════════════

    if (amSpectating) {
        return (
            <div className="flex flex-col items-center w-full pt-2">
                <RoomCodeBanner code={matchId} />

                <span className="pill px-3 py-1 text-[10px] font-bold tracking-widest uppercase text-[var(--ink-soft)] mt-8 mb-3">
                    <Eye className="w-3 h-3" />
                    Watching
                </span>
                <h2 className="text-glow text-3xl font-extrabold mb-1.5 tracking-tight">Race in progress</h2>
                <p className="text-[var(--ink-faint)] text-sm mb-8 text-center max-w-md">
                    You joined mid-race, so you are sitting this one out. You will be in the lobby for the next one.
                </p>

                {racers.length > 0 && (
                    <div className="panel panel-lit w-full max-w-xl p-6 rounded-2xl space-y-3.5">
                        {racers.map(p => (
                            <ProgressRow key={p.sessionId} player={p} />
                        ))}
                    </div>
                )}

                <button
                    onClick={handleLeave}
                    className="flex items-center gap-1.5 text-sm text-[var(--ink-faint)] hover:text-[var(--ink-soft)] transition-colors mt-8"
                >
                    <LogOut className="w-3.5 h-3.5" />
                    Leave room
                </button>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SCREEN 4: COUNTDOWN
    // ═══════════════════════════════════════════════════════════════════════

    if (roomStatus === "countdown") {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-5">
                <p className="text-[var(--ink-faint)] text-sm uppercase tracking-[0.3em] font-bold">Race starts in</p>
                <div className="text-[130px] font-extrabold leading-none tabular-nums animate-pulse text-[var(--accent-warm)] drop-shadow-[0_0_60px_rgba(245,198,107,0.6)]">
                    {serverCountdown > 0 ? serverCountdown : "GO"}
                </div>
                <div className="flex flex-wrap justify-center gap-4 mt-3">
                    {racers.map(p => (
                        <div key={p.sessionId} className="flex flex-col items-center gap-1.5">
                            <Avatar name={p.name} />
                            <span className="text-xs font-medium text-[var(--ink-soft)]">{p.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SCREEN 5: RACING
    // ═══════════════════════════════════════════════════════════════════════

    if (roomStatus === "racing" && !myPlayer?.finished) {
        return (
            <div className="w-full flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-6 gap-3">
                    <div className="flex items-center gap-3">
                        <span className="pill px-3 py-1 text-xs font-bold text-[var(--accent-warm)] font-mono tracking-[0.25em]">
                            {matchId}
                        </span>
                        {liveWpm > 0 && (
                            <span className="text-sm font-bold text-sky-300 tabular-nums">{liveWpm} WPM</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[var(--ink-faint)] text-sm">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="tabular-nums">Progress: {myProgress}%</span>
                    </div>
                </div>

                <div className="panel panel-lit relative w-full px-8 py-9 md:px-10 overflow-hidden rounded-2xl mb-8">
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-white/[0.06]">
                        <div
                            className="h-full bg-gradient-to-r from-sky-500 to-sky-300 transition-all duration-200 ease-out shadow-[0_0_14px_rgba(108,197,255,0.9)]"
                            style={{ width: `${myProgress}%` }}
                        />
                    </div>

                    <TypingField
                        passage={paragraph}
                        typed={typedText}
                        onChange={handleTyping}
                        inputRef={inputRef}
                        lines={3}
                    />
                </div>

                {opponents.length > 0 && (
                    <div className="panel w-full max-w-xl p-6 rounded-2xl space-y-3.5">
                        {opponents.map(p => (
                            <ProgressRow key={p.sessionId} player={p} />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SCREEN 6: RESULTS
    // ═══════════════════════════════════════════════════════════════════════

    if (myPlayer?.finished || roomStatus === "finished") {
        const isWinner = myRank === 1;
        const stillRacing = racers.some(p => !p.finished);

        return (
            <div className="w-full flex flex-col items-center pt-2">
                <span className="pill px-3 py-1 text-[10px] font-bold tracking-widest uppercase text-[var(--ink-soft)] mb-4">
                    <Trophy className="w-3 h-3" />
                    {stillRacing ? "You finished" : "Race complete"}
                </span>
                <h2 className="text-glow text-4xl sm:text-5xl font-extrabold mb-9 tracking-tight text-center">
                    {isWinner ? "Victory" : myRank === 2 ? "So Close" : "Race Finished"}
                </h2>

                <div className="flex flex-col sm:flex-row gap-5 mb-8 w-full max-w-2xl">
                    <div className="panel panel-lit flex-1 p-8 flex flex-col items-center rounded-2xl">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--ink-faint)] mb-3">Words Per Minute</span>
                        <span className="text-6xl font-extrabold text-sky-300 tabular-nums drop-shadow-[0_0_24px_rgba(108,197,255,0.45)]">
                            {myPlayer?.wpm ?? liveWpm}
                        </span>
                    </div>
                    <div className="panel panel-lit flex-1 p-8 flex flex-col items-center rounded-2xl">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--ink-faint)] mb-3">Accuracy</span>
                        <span className="text-6xl font-extrabold text-[var(--accent-warm)] tabular-nums drop-shadow-[0_0_24px_rgba(245,198,107,0.35)]">
                            {myAccuracy.toFixed(1)}<span className="text-2xl text-[var(--ink-faint)] ml-1">%</span>
                        </span>
                    </div>
                </div>

                <div className="panel w-full max-w-2xl overflow-hidden mb-8 rounded-2xl">
                    <div className="flex justify-between items-center px-6 py-4 border-b border-[var(--panel-line)]">
                        <span className="text-sm font-bold text-[var(--ink)]">Match Results</span>
                        <span className="text-xs text-[var(--ink-faint)]">{allSortedForResults.length} racers</span>
                    </div>
                    {allSortedForResults.map((p, idx) => {
                        const rank = idx + 1;
                        const isMe = p.sessionId === sessionId;
                        return (
                            <div
                                key={p.sessionId}
                                className={`flex items-center px-6 py-4 border-b border-white/[0.05] last:border-0 ${isMe ? "bg-sky-400/[0.07]" : ""}`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                                    rank === 1
                                        ? "bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 shadow-[0_0_18px_rgba(251,191,36,0.5)]"
                                        : rank === 2
                                            ? "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800"
                                            : "bg-white/[0.06] text-[var(--ink-faint)] ring-1 ring-white/10"
                                }`}>
                                    {rank}
                                </div>
                                <div className="ml-3">
                                    <Avatar name={p.name} size="sm" />
                                </div>
                                <div className="ml-3 flex-1 min-w-0">
                                    <div className="font-bold text-[var(--ink)] truncate">{p.name}</div>
                                    {isMe && <div className="text-[10px] font-bold text-sky-300 uppercase tracking-wider">You</div>}
                                </div>
                                <div className="text-right">
                                    {p.finished ? (
                                        <>
                                            <span className="text-xl font-bold tabular-nums text-[var(--ink)]">{p.wpm}</span>
                                            <span className="text-xs text-[var(--ink-faint)] ml-1">WPM</span>
                                        </>
                                    ) : (
                                        <span className="text-sm text-[var(--ink-faint)] tabular-nums">{p.progress}% done</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex flex-wrap justify-center gap-3">
                    <button onClick={handleRestart} className="btn btn-primary px-8 py-3.5">
                        <RefreshCw className="w-4 h-4" />
                        New Race
                    </button>
                    <button onClick={handleLeave} className="btn btn-ghost px-8 py-3.5">
                        Back to Menu
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex items-center justify-center text-[var(--ink-faint)] text-sm">
            Synchronizing room state...
        </div>
    );
}

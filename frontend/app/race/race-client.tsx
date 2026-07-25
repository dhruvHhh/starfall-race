"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Client, Room, Callbacks } from "@colyseus/sdk";
import { User, RefreshCw, LogOut, Trophy, Zap, Clock, ArrowRight, Plus, Hash } from "lucide-react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

type PlayerInfo = {
    sessionId: string;
    name: string;
    progress: number;
    finished: boolean;
    finishTime: number;
    ready: boolean;
    wpm: number;
};

type RoomStatus = "waiting" | "countdown" | "racing" | "finished";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AVATAR_GRADIENTS = [
    "from-blue-500 to-blue-700",
    "from-purple-500 to-purple-700",
    "from-green-500 to-green-700",
    "from-rose-500 to-rose-700",
    "from-amber-500 to-amber-700",
    "from-cyan-500 to-cyan-700",
];

function avatarGradient(name: string) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function initials(name: string) {
    const parts = name.split(/[\s-_]+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

// ─── Avatar Component ────────────────────────────────────────────────────────

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
    const sz = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-12 h-12 text-base" : "w-10 h-10 text-sm";
    return (
        <div className={`${sz} rounded-full bg-gradient-to-br ${avatarGradient(name)} flex items-center justify-center font-bold text-white shrink-0 shadow-lg`}>
            {initials(name)}
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function RaceClient() {
    const [room, setRoom] = useState<Room | null>(null);
    const roomRef = useRef<Room | null>(null);
    const lastValRef = useRef("");
    const [players, setPlayers] = useState<Record<string, PlayerInfo>>({});
    const [paragraph, setParagraph] = useState("");
    const [connStatus, setConnStatus] = useState<"menu" | "connecting" | "connected" | "error">("menu");
    const [roomStatus, setRoomStatus] = useState<RoomStatus>("waiting");
    const [serverCountdown, setServerCountdown] = useState<number>(-1);
    const [guestName, setGuestName] = useState("");
    const [nameInput, setNameInput] = useState("");
    const [roomCodeInput, setRoomCodeInput] = useState("");

    // Typing state
    const [typedText, setTypedText] = useState("");
    const [totalMistakes, setTotalMistakes] = useState(0);
    const [startTime, setStartTime] = useState<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const lastSentTime = useRef<number>(0);
    const totalTypedChars = useRef(0);
    
    // Auth & Init
    const didInit = useRef(false);
    const playerName = useRef(`Player-${Math.floor(Math.random() * 9000) + 1000}`);

    useEffect(() => {
        if (didInit.current) return;
        didInit.current = true;
        const stored = localStorage.getItem("guestName");
        if (stored) {
            setGuestName(stored);
            playerName.current = stored;
        }
    }, []);

    const handleSaveName = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = nameInput.trim();
        if (!trimmed) return;
        localStorage.setItem("guestName", trimmed);
        setGuestName(trimmed);
        playerName.current = trimmed;
    };

    // Derived
    const sessionId = room?.sessionId ?? "";
    const matchId = room?.roomId ? String(room.roomId) : "----";

    // ── Colyseus connection ─────────────────────────────────────────────────

    async function connect(method: "joinOrCreate" | "create" | "joinById", target: string) {
        setConnStatus("connecting");
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
            setConnStatus("connected");

            const cb = Callbacks.get(activeRoom);

            cb.onAdd("players", (player: any, key: any) => {
                const snap = () => ({
                    sessionId: String(key),
                    name: player.name,
                    progress: player.progress,
                    finished: player.finished,
                    finishTime: player.finishTime,
                    ready: player.ready,
                    wpm: player.wpm,
                });
                setPlayers(prev => ({ ...prev, [String(key)]: snap() }));
                cb.listen(player, "progress", (val: number) => {
                    setPlayers(prev => ({ ...prev, [String(key)]: { ...prev[String(key)], progress: val } }));
                });
                cb.listen(player, "wpm", (val: number) => {
                    setPlayers(prev => ({ ...prev, [String(key)]: { ...prev[String(key)], wpm: val } }));
                });
                cb.listen(player, "ready", (val: boolean) => {
                    setPlayers(prev => ({ ...prev, [String(key)]: { ...prev[String(key)], ready: val } }));
                });
                cb.listen(player, "finished", (val: boolean) => {
                    setPlayers(prev => ({ ...prev, [String(key)]: { ...prev[String(key)], finished: val } }));
                });
            });

            cb.onRemove("players", (_: any, key: any) => {
                setPlayers(prev => { const n = { ...prev }; delete n[String(key)]; return n; });
            });

            cb.listen("paragraph", (v: string) => setParagraph(v));
            cb.listen("status", (v: string) => setRoomStatus(v as RoomStatus));
            cb.listen("countdown", (v: number) => setServerCountdown(v));

            // Hydrate initial state
            setRoomStatus(activeRoom.state.status as RoomStatus);
            setParagraph(activeRoom.state.paragraph);
            setServerCountdown(activeRoom.state.countdown);
            setConnStatus("connected");
        } catch (err) {
            console.error("Connection failed:", err);
            setConnStatus("error");
        }
    }

    // Focus input when race starts
    useEffect(() => {
        if (roomStatus === "racing") {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [roomStatus]);

    // Reset local typing state when room restarts
    useEffect(() => {
        if (roomStatus === "waiting") {
            setTypedText("");
            lastValRef.current = "";
            setTotalMistakes(0);
            totalTypedChars.current = 0;
            setStartTime(null);
        }
    }, [roomStatus]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (roomRef.current) {
                roomRef.current.leave();
                roomRef.current = null;
            }
        };
    }, []);

    // ── Handlers ───────────────────────────────────────────────────────────

    const handleReady = () => {
        if (!roomRef.current) return;
        const me = players[roomRef.current.sessionId];
        if (me) roomRef.current.send("ready", { ready: !me.ready });
    };

    const handleLeave = () => {
        roomRef.current?.leave();
        roomRef.current = null;
        setRoom(null);
        setConnStatus("menu");
        setPlayers({});
    };

    const handleRestart = () => {
        setTypedText("");
        lastValRef.current = "";
        setTotalMistakes(0);
        totalTypedChars.current = 0;
        setStartTime(null);
        roomRef.current?.send("restart");
    };

    const handleTyping = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (roomStatus !== "racing") return;
        const val = e.target.value;
        if (val.length > paragraph.length) return;

        // Track mistakes on new characters added using a ref to prevent stale closures
        const prevVal = lastValRef.current;
        if (val.length > prevVal.length) {
            const addedChars = val.slice(prevVal.length);
            totalTypedChars.current += addedChars.length;
            
            let newMistakes = 0;
            for (let i = 0; i < addedChars.length; i++) {
                if (addedChars[i] !== paragraph[prevVal.length + i]) newMistakes++;
            }
            if (newMistakes > 0) {
                setTotalMistakes(prev => prev + newMistakes);
            }
        }
        
        lastValRef.current = val;
        setTypedText(val);

        if (!startTime && val.length > 0) setStartTime(Date.now());

        // Calculate progress & WPM
        let correctChars = 0;
        for (let i = 0; i < val.length; i++) {
            if (val[i] === paragraph[i]) correctChars++;
        }
        const progress = Math.min(100, Math.floor((correctChars / paragraph.length) * 100));
        let wpm = 0;
        if (startTime) {
            const elapsed = (Date.now() - startTime) / 60000;
            wpm = elapsed > 0 ? Math.round((correctChars / 5) / elapsed) : 0;
        }

        // Throttle sends
        const now = Date.now();
        if (now - lastSentTime.current > 120 || progress === 100) {
            roomRef.current?.send("progress", { progress, wpm });
            lastSentTime.current = now;
        }
    }, [roomStatus, paragraph, typedText, totalMistakes, startTime]);

    // ── Derived values ──────────────────────────────────────────────────────

    const allPlayers = Object.values(players);
    const myPlayer = players[sessionId] ?? null;
    const opponents = allPlayers.filter(p => p.sessionId !== sessionId);
    const isReady = myPlayer?.ready ?? false;

    const sortedByFinish = [...allPlayers]
        .filter(p => p.finished)
        .sort((a, b) => a.finishTime - b.finishTime);
    const allSortedForResults = [
        ...sortedByFinish,
        ...allPlayers.filter(p => !p.finished).sort((a, b) => b.progress - a.progress),
    ];

    const myRank = sortedByFinish.findIndex(p => p.sessionId === sessionId) + 1;

    const myWpm = (() => {
        if (!startTime || typedText.length === 0) return 0;
        const elapsed = (Date.now() - startTime) / 60000;
        let correct = 0;
        for (let i = 0; i < typedText.length; i++) {
            if (typedText[i] === paragraph[i]) correct++;
        }
        return elapsed > 0 ? Math.round((correct / 5) / elapsed) : 0;
    })();

    const myAccuracy = totalTypedChars.current > 0
        ? Math.max(0, ((totalTypedChars.current - totalMistakes) / totalTypedChars.current * 100))
        : 100;

    const myProgress = myPlayer?.progress ?? 0;

    // ── Paragraph render ────────────────────────────────────────────────────

    const renderParagraph = () => {
        return paragraph.split("").map((char, i) => {
            let cls = "text-gray-400";
            if (i < typedText.length) {
                cls = typedText[i] === char
                    ? "text-white font-medium"
                    : "text-red-400 border-b-2 border-red-500/60";
            }
            const isCursor = i === typedText.length && !myPlayer?.finished;
            return (
                <span key={i} className={`relative ${cls}`}>
                    {isCursor && (
                        <span className="absolute -left-px top-[8%] h-[84%] w-[2px] rounded bg-blue-500 animate-pulse" />
                    )}
                    {char}
                </span>
            );
        });
    };

    // ── Lobby slots ─────────────────────────────────────────────────────────

    const lobbySlots = Array(6).fill(null).map((_, i) => allPlayers[i] ?? null);

    // ═══════════════════════════════════════════════════════════════════════════
    // SCREEN 0: MENU & GUEST LOGIN
    // ═══════════════════════════════════════════════════════════════════════════
    if (connStatus === "menu") {
        if (!guestName) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center pt-10">
                    <div className="bg-[#11151d] border border-white/5 rounded-2xl p-10 w-full max-w-md shadow-2xl">
                        <h2 className="text-2xl font-bold text-white mb-2 text-center">Join Multiplayer</h2>
                        <p className="text-sm text-gray-400 text-center mb-8">Enter a guest name to race against others.</p>
                        <form onSubmit={handleSaveName} className="flex flex-col gap-4">
                            <input 
                                type="text"
                                placeholder="e.g. TypeNinja99"
                                value={nameInput}
                                onChange={(e) => setNameInput(e.target.value)}
                                className="w-full bg-[#0d1017] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                autoFocus
                                maxLength={20}
                            />
                            <button 
                                type="submit" 
                                disabled={!nameInput.trim()}
                                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                Continue <ArrowRight className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex-1 flex flex-col items-center justify-center pt-10">
                <div className="flex flex-col items-center mb-10">
                    <Avatar name={guestName} size="lg" />
                    <h2 className="text-2xl font-bold text-white mt-4 text-center">Welcome, {guestName}</h2>
                    <button 
                        onClick={() => { setGuestName(""); localStorage.removeItem("guestName"); }}
                        className="text-xs text-gray-500 hover:text-gray-300 mt-2 transition-colors underline"
                    >
                        Change Name
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                    <button 
                        onClick={() => connect("joinOrCreate", "typing_room")}
                        className="bg-[#11151d] border border-white/5 hover:border-blue-500/50 rounded-2xl p-8 flex flex-col items-center justify-center shadow-xl transition-all hover:-translate-y-1 group"
                    >
                        <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                            <Zap className="w-6 h-6 text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Play Global</h3>
                        <p className="text-sm text-gray-400 text-center">Matchmake with anyone online right now.</p>
                    </button>

                    <div className="flex flex-col gap-4">
                        <button 
                            onClick={() => connect("create", "typing_room")}
                            className="bg-[#11151d] border border-white/5 hover:border-white/20 rounded-xl p-5 flex items-center gap-4 transition-colors"
                        >
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                <Plus className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold text-white">Create Room</h3>
                                <p className="text-xs text-gray-400">Play privately with friends</p>
                            </div>
                        </button>

                        <div className="bg-[#11151d] border border-white/5 rounded-xl p-5 flex flex-col gap-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-white">
                                <Hash className="w-4 h-4 text-gray-400" />
                                Join with Code
                            </div>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Enter Code"
                                    value={roomCodeInput}
                                    onChange={(e) => setRoomCodeInput(e.target.value.trim())}
                                    className="flex-1 bg-[#0d1017] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                />
                                <button 
                                    onClick={() => { if(roomCodeInput.trim()) connect("joinById", roomCodeInput.trim()); }}
                                    disabled={!roomCodeInput.trim()}
                                    className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                                >
                                    Join
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Loading / error states ───────────────────────────────────────────────

    if (connStatus === "connecting") {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-500 pt-20">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm">Connecting to game server...</p>
            </div>
        );
    }

    if (connStatus === "error") {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center pt-20">
                <div className="text-red-400 text-lg font-semibold">Connection Failed</div>
                <p className="text-gray-500 text-sm max-w-sm">Could not reach the room. Check your connection or verify the room code is correct.</p>
                <button onClick={() => setConnStatus("menu")} className="mt-4 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors">
                    Back to Menu
                </button>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SCREEN 1: LOBBY
    // ═══════════════════════════════════════════════════════════════════════════

    if (roomStatus === "waiting") {
        return (
            <div className="flex flex-col items-center w-full pt-4 animate-in fade-in duration-300">
                <span className="px-3 py-1 text-[10px] font-bold tracking-widest bg-white/5 border border-white/10 rounded-full text-gray-400 mb-5 flex items-center gap-2">
                    Room Code: <span className="text-white select-all">{matchId}</span>
                </span>
                <h2 className="text-4xl font-extrabold text-white mb-1 tracking-tight">MULTIPLAYER LOBBY</h2>
                <p className="text-gray-500 text-sm mb-10">{allPlayers.length}/6 connected · Auto-starts when 2 players are ready</p>

                {/* Player grid */}
                <div className="grid grid-cols-2 gap-3 w-full max-w-2xl mb-10">
                    {lobbySlots.map((p, idx) => (
                        <div
                            key={idx}
                            className={`h-[72px] rounded-xl flex items-center px-4 transition-all border ${
                                p
                                    ? "bg-[#12161f] border-white/5 hover:border-white/10"
                                    : "bg-[#0d1017] border-white/[0.03]"
                            }`}
                        >
                            {p ? (
                                <>
                                    <Avatar name={p.name} />
                                    <div className="ml-3 flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="font-semibold text-white truncate">{p.name}</span>
                                            {p.sessionId === sessionId && (
                                                <span className="text-[10px] text-gray-500 shrink-0">(you)</span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-600 mt-0.5">
                                            {p.wpm > 0 ? `${p.wpm} WPM avg` : "Ready to race"}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <div className={`w-1.5 h-1.5 rounded-full ${p.ready ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" : "bg-amber-500"}`} />
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${p.ready ? "text-green-500" : "text-amber-400"}`}>
                                            {p.ready ? "Ready" : "Joining"}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center text-gray-700">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <span className="ml-3 text-sm text-gray-700 italic">Waiting for player...</span>
                                </>
                            )}
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex flex-col items-center gap-3">
                    {allPlayers.length < 2 && (
                        <p className="text-amber-400/70 text-xs mb-2">Waiting for at least 1 more player to join...</p>
                    )}
                    <button
                        onClick={handleReady}
                        className={`w-64 py-4 rounded-xl font-bold text-lg transition-all transform active:scale-95 shadow-lg ${
                            isReady
                                ? "bg-green-600 hover:bg-green-500 text-white shadow-green-500/20"
                                : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20"
                        }`}
                    >
                        {isReady ? "✓ Ready!" : "Ready Up"}
                    </button>
                    <button
                        onClick={handleLeave}
                        className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-400 transition-colors mt-1"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        Leave Room
                    </button>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SCREEN 2a: COUNTDOWN OVERLAY (full screen)
    // ═══════════════════════════════════════════════════════════════════════════

    if (roomStatus === "countdown") {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 animate-in fade-in duration-300">
                <p className="text-gray-400 text-sm uppercase tracking-widest font-semibold">Race starts in</p>
                <div className="text-[120px] font-extrabold text-blue-500 leading-none drop-shadow-[0_0_40px_rgba(59,130,246,0.5)] tabular-nums animate-pulse">
                    {serverCountdown > 0 ? serverCountdown : "GO!"}
                </div>
                <div className="flex gap-3 mt-4">
                    {allPlayers.map(p => (
                        <div key={p.sessionId} className="flex flex-col items-center gap-1.5">
                            <Avatar name={p.name} size="md" />
                            <span className="text-xs text-gray-500">{p.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SCREEN 2b: ACTIVE RACE
    // ═══════════════════════════════════════════════════════════════════════════

    if (roomStatus === "racing" && !myPlayer?.finished) {
        return (
            <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
                {/* Match ID pill + live WPM */}
                <div className="w-full flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <span className="px-3 py-1 text-xs font-bold bg-white/5 border border-white/10 rounded-full text-gray-400">
                            MATCH #{matchId}
                        </span>
                        {myWpm > 0 && (
                            <div className="flex items-center gap-1.5 text-blue-400">
                                <span className="text-sm font-bold tabular-nums">{myWpm} WPM</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Progress: {myProgress}%</span>
                    </div>
                </div>

                {/* Typing card */}
                <div
                    className="relative w-full bg-[#11151d] border border-white/5 rounded-2xl p-10 cursor-text shadow-2xl overflow-hidden mb-10"
                    onClick={() => inputRef.current?.focus()}
                >
                    {/* Progress bar baked into top edge */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-white/5">
                        <div
                            className="h-full bg-blue-500 transition-all duration-200 ease-out"
                            style={{ width: `${myProgress}%`, boxShadow: "0 0 12px rgba(59,130,246,0.7)" }}
                        />
                    </div>

                    <input
                        ref={inputRef}
                        type="text"
                        value={typedText}
                        onChange={handleTyping}
                        className="absolute w-0 h-0 opacity-0 pointer-events-none"
                        autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                    />

                    <div className="text-2xl md:text-3xl leading-relaxed tracking-wide font-mono select-none">
                        {renderParagraph()}
                    </div>
                </div>

                {/* Opponents */}
                {opponents.length > 0 && (
                    <div className="w-full max-w-xl space-y-3">
                        {opponents.map(p => (
                            <div key={p.sessionId} className="flex items-center gap-3">
                                <Avatar name={p.name} size="sm" />
                                <div className="w-28 shrink-0">
                                    <span className="text-xs font-semibold text-gray-400 truncate block">{p.name}</span>
                                    {p.wpm > 0 && (
                                        <span className="text-[10px] text-gray-600 tabular-nums">{p.wpm} wpm</span>
                                    )}
                                </div>
                                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gray-600 rounded-full transition-all duration-200 ease-out"
                                        style={{ width: `${p.progress}%` }}
                                    />
                                </div>
                                <span className="text-xs text-gray-600 w-8 text-right tabular-nums">{p.progress}%</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SCREEN 3: RESULTS (my player finished OR room finished)
    // ═══════════════════════════════════════════════════════════════════════════

    if (myPlayer?.finished || roomStatus === "finished") {
        const isWinner = myRank === 1;

        return (
            <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-6 duration-500 pt-4">
                <span className="px-3 py-1 text-[10px] font-bold tracking-widest uppercase bg-white/5 border border-white/10 rounded-full text-gray-400 mb-5 flex items-center gap-1.5">
                    <Trophy className="w-3 h-3" />
                    Race Complete
                </span>
                <h2 className="text-4xl font-extrabold text-white mb-12 tracking-tight">
                    {isWinner ? "Victory Achieved 🏆" : myRank === 2 ? "So Close! 🥈" : "Race Finished 🏁"}
                </h2>

                {/* Stat cards */}
                <div className="flex gap-5 mb-10 w-full max-w-2xl">
                    <div className="flex-1 bg-[#11151d] border border-white/5 rounded-2xl p-8 flex flex-col items-center shadow-xl">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mb-3">Words Per Minute</span>
                        <span className="text-6xl font-extrabold text-blue-400 tabular-nums">{myPlayer?.wpm ?? myWpm}</span>
                    </div>
                    <div className="flex-1 bg-[#11151d] border border-white/5 rounded-2xl p-8 flex flex-col items-center shadow-xl">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mb-3">Accuracy</span>
                        <span className="text-6xl font-extrabold text-white tabular-nums">
                            {myAccuracy.toFixed(1)}<span className="text-2xl text-gray-500 ml-1">%</span>
                        </span>
                    </div>
                </div>

                {/* Match results table */}
                <div className="w-full max-w-2xl bg-[#11151d] border border-white/5 rounded-2xl overflow-hidden shadow-xl mb-10">
                    <div className="flex justify-between items-center px-6 py-4 border-b border-white/5 bg-white/[0.02]">
                        <span className="text-sm font-bold text-white">Match Results</span>
                        <span className="text-xs text-gray-500">{allSortedForResults.length} players</span>
                    </div>
                    {allSortedForResults.map((p, idx) => {
                        const rank = idx + 1;
                        const isMe = p.sessionId === sessionId;
                        return (
                            <div
                                key={p.sessionId}
                                className={`flex items-center px-6 py-4 border-b border-white/[0.04] last:border-0 transition-colors ${isMe ? "bg-blue-500/[0.06]" : ""}`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                                    rank === 1 ? "bg-amber-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                                    : rank === 2 ? "bg-gray-400 text-gray-900"
                                    : "bg-[#1c2130] text-gray-500"
                                }`}>
                                    {rank}
                                </div>
                                <Avatar name={p.name} size="sm" />
                                <div className="ml-3 flex-1 min-w-0">
                                    <div className="font-semibold text-white">{p.name}</div>
                                    {isMe && <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">You</div>}
                                </div>
                                <div className="text-right">
                                    {p.finished ? (
                                        <>
                                            <span className="text-xl font-bold tabular-nums text-gray-200">{p.wpm}</span>
                                            <span className="text-xs text-gray-500 ml-1">WPM</span>
                                        </>
                                    ) : (
                                        <span className="text-sm text-gray-600">{p.progress}% done</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={handleRestart}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                    >
                        <RefreshCw className="w-4 h-4" />
                        New Race
                    </button>
                    <button
                        onClick={handleLeave}
                        className="flex items-center gap-2 border border-white/10 hover:bg-white/5 text-gray-300 px-8 py-3.5 rounded-xl font-bold transition-all active:scale-95"
                    >
                        Back to Menu
                    </button>
                </div>
            </div>
        );
    }

    // Fallback — should rarely be seen
    return (
        <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
            Synchronizing room state...
        </div>
    );
}

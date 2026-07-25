"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { RotateCcw, Zap, Users, Settings, Bell } from "lucide-react";

const PRACTICE_PARAGRAPHS = [
    "The quick brown fox jumps over the lazy dog while the sun sets slowly in the west.",
    "Racing against friends is more fun than racing against the clock alone in your room.",
    "A journey of a thousand miles begins with a single step taken with courage and faith.",
    "The art of programming is the art of organizing complexity into something manageable.",
    "Speed and accuracy are both essential skills for any competitive typist to master well.",
    "Practice makes perfect, but only if you practice with intention and focus every single day.",
    "The best way to predict the future is to invent it yourself through hard work and dedication.",
    "In the middle of every difficulty lies opportunity waiting to be discovered by those who seek.",
    "Code is like humor. When you have to explain it, it is probably not that good after all.",
    "Keyboards are the instruments through which programmers compose their beautiful digital art.",
    "The difference between a good typist and a great one is measured in milliseconds of pure focus.",
    "Every character you type brings you one step closer to mastering the art of the keyboard.",
    "Persistence and patience are the twin pillars upon which all lasting success is firmly built.",
    "To type fast is good, but to type accurately is the foundation of all true typing skill.",
    "The greatest glory in living lies not in never falling, but in rising every time we fall.",
];

type TimerMode = 15 | 30 | 60;
type GameState = "idle" | "typing" | "finished";

function getRandomParagraph() {
    return PRACTICE_PARAGRAPHS[Math.floor(Math.random() * PRACTICE_PARAGRAPHS.length)];
}


export default function Home() {
    const [timerMode, setTimerMode] = useState<TimerMode>(30);
    const [paragraph, setParagraph] = useState("");
    const paragraphRef = useRef(paragraph);
    useEffect(() => {
        paragraphRef.current = paragraph;
    }, [paragraph]);
    const [typedText, setTypedText] = useState("");
    const [gameState, setGameState] = useState<GameState>("idle");
    const [timeLeft, setTimeLeft] = useState<number>(30);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [totalMistakes, setTotalMistakes] = useState(0);
    const totalMistakesRef = useRef(0);
    const [finalWpm, setFinalWpm] = useState(0);
    const [finalAccuracy, setFinalAccuracy] = useState(0);

    const totalTypedChars = useRef(0);
    const lastValRef = useRef("");
    const inputRef = useRef<HTMLInputElement>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Set paragraph only on client to avoid SSR/client hydration mismatch
    useEffect(() => {
        setParagraph(getRandomParagraph());
        inputRef.current?.focus();
    }, []);
    const reset = useCallback((mode?: TimerMode) => {
        const m = mode ?? timerMode;
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setTypedText("");
        setGameState("idle");
        setTimeLeft(m);
        setStartTime(null);
        setTotalMistakes(0);
        totalMistakesRef.current = 0;
        totalTypedChars.current = 0;
        lastValRef.current = "";
        setParagraph(getRandomParagraph());
        setTimeout(() => inputRef.current?.focus(), 50);
    }, [timerMode]);

    const handleTimerModeChange = (mode: TimerMode) => {
        setTimerMode(mode);
        reset(mode);
    };

    const finishGame = useCallback((typed: string, para: string, mistakes: number, elapsed: number) => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;

        const elapsedMinutes = elapsed / 60000;
        let correctChars = 0;
        for (let i = 0; i < typed.length; i++) {
            if (typed[i] === para[i]) correctChars++;
        }
        const wpm = elapsedMinutes > 0 ? Math.round((correctChars / 5) / elapsedMinutes) : 0;
        const accuracy = totalTypedChars.current > 0 ? Math.max(0, ((totalTypedChars.current - mistakes) / totalTypedChars.current) * 100) : 0;
        setFinalWpm(wpm);
        setFinalAccuracy(accuracy);
        setGameState("finished");
    }, []);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (gameState === "finished") return;
        if (val.length > paragraph.length) return;

        // Start timer on first keystroke
        if (gameState === "idle" && val.length > 0) {
            const now = Date.now();
            setStartTime(now);
            setGameState("typing");
            const end = now + timerMode * 1000;

            timerRef.current = setInterval(() => {
                const remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000));
                setTimeLeft(remaining);
                if (remaining <= 0) {
                    finishGame(lastValRef.current, paragraphRef.current, totalMistakesRef.current, Date.now() - now);
                }
            }, 100);
        }

        // Check if paragraph needs appending
        if (val.length >= paragraph.length - 20) {
            setParagraph(p => p + " " + getRandomParagraph());
        }

        // Track mistakes on new characters added using a ref
        const prevVal = lastValRef.current;
        if (val.length > prevVal.length) {
            const addedChars = val.slice(prevVal.length);
            totalTypedChars.current += addedChars.length;
            
            let newMistakes = 0;
            for (let i = 0; i < addedChars.length; i++) {
                if (addedChars[i] !== paragraph[prevVal.length + i]) newMistakes++;
            }
            if (newMistakes > 0) {
                totalMistakesRef.current += newMistakes;
                setTotalMistakes(totalMistakesRef.current);
            }
        }
        
        lastValRef.current = val;
        setTypedText(val);
    };

    const handleClickArea = () => {
        if (gameState !== "finished") inputRef.current?.focus();
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Render paragraph with character-level highlighting
    const renderParagraph = () => {
        return paragraph.split("").map((char, index) => {
            let cls = "text-gray-400";
            if (index < typedText.length) {
                cls = typedText[index] === char ? "text-white" : "text-red-400 border-b-2 border-red-500/60";
            }
            const isCursor = index === typedText.length && gameState !== "finished";
            return (
                <span key={index} className={`relative ${cls}`}>
                    {isCursor && (
                        <span className="absolute -left-px top-[8%] h-[84%] w-[2px] rounded bg-blue-500 animate-pulse" />
                    )}
                    {char}
                </span>
            );
        });
    };

    const currentWpm = (() => {
        if (!startTime || typedText.length === 0) return 0;
        const elapsed = (Date.now() - startTime) / 60000;
        let correct = 0;
        for (let i = 0; i < typedText.length; i++) {
            if (typedText[i] === paragraph[i]) correct++;
        }
        return elapsed > 0 ? Math.round((correct / 5) / elapsed) : 0;
    })();

    const currentAccuracy = totalTypedChars.current > 0
        ? Math.max(0, Math.round(((totalTypedChars.current - totalMistakes) / totalTypedChars.current) * 100))
        : 100;

    return (
        <div className="flex-1 flex flex-col bg-transparent">
            {/* Nav */}
            <header className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0">
                <div className="flex items-center gap-10">
                    <Link href="/" className="flex items-center gap-3">
                        <img src="/logo.png" alt="Type Brawl" className="w-8 h-8 rounded-lg" />
                        <span className="text-lg font-bold text-white tracking-tight">Type Brawl</span>
                    </Link>
                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                        <Link href="/" className="text-white border-b-2 border-blue-500 pb-0.5">Practice</Link>
                        <Link href="/race" className="text-gray-400 hover:text-gray-200 transition-colors">Multiplayer</Link>
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <Link
                        href="/race"
                        className="hidden sm:flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-lg shadow-blue-500/20"
                    >
                        <Users className="w-4 h-4" />
                        Race Online
                    </Link>
                    <button className="text-gray-500 hover:text-gray-300 transition-colors p-1"><Settings className="w-5 h-5" /></button>
                    <button className="text-gray-500 hover:text-gray-300 transition-colors p-1"><Bell className="w-5 h-5" /></button>
                </div>
            </header>

            {/* Main */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
                {gameState !== "finished" ? (
                    <>
                        {/* Timer mode + stats bar */}
                        <div className="flex items-center justify-between w-full max-w-3xl mb-8">
                            <div className="flex items-center gap-1 bg-[#12161f] rounded-xl p-1 border border-white/5">
                                {([15, 30, 60] as TimerMode[]).map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => handleTimerModeChange(mode)}
                                        className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                                            timerMode === mode
                                                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                                                : "text-gray-400 hover:text-gray-200"
                                        }`}
                                    >
                                        {mode}s
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-6 text-sm font-mono">
                                {gameState === "typing" && (
                                    <>
                                        <div className="flex flex-col items-center">
                                            <span className="text-gray-500 text-[10px] uppercase tracking-widest mb-0.5">WPM</span>
                                            <span className="text-blue-400 font-bold text-xl">{currentWpm}</span>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-gray-500 text-[10px] uppercase tracking-widest mb-0.5">ACC</span>
                                            <span className="text-green-400 font-bold text-xl">{currentAccuracy}%</span>
                                        </div>
                                    </>
                                )}
                                <div className="flex flex-col items-center">
                                    <span className="text-gray-500 text-[10px] uppercase tracking-widest mb-0.5">TIME</span>
                                    <span className={`font-bold text-xl ${timeLeft <= 5 && gameState === "typing" ? "text-red-400 animate-pulse" : "text-gray-300"}`}>
                                        {gameState === "idle" ? timerMode : timeLeft}s
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Typing area */}
                        <div
                            className="relative w-full max-w-3xl bg-[#11151d] border border-white/5 rounded-2xl p-10 cursor-text shadow-2xl group transition-all hover:border-white/10"
                            onClick={handleClickArea}
                        >
                            <input
                                ref={inputRef}
                                type="text"
                                className="absolute opacity-0 w-0 h-0 pointer-events-none"
                                value={typedText}
                                onChange={handleInput}
                                disabled={false}
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck={false}
                            />
                            <div className="text-xl md:text-2xl leading-relaxed tracking-wide font-mono select-none">
                                {renderParagraph()}
                                {typedText.length === paragraph.length && (
                                    <span className="animate-pulse text-blue-500">|</span>
                                )}
                            </div>
                            {/* Removed overlay */}
                        </div>

                        {/* Reset button */}
                        <button
                            onClick={() => reset()}
                            className="mt-8 flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors text-sm"
                        >
                            <RotateCcw className="w-4 h-4" />
                            New text
                        </button>
                    </>
                ) : (
                    /* Results screen */
                    <div className="w-full max-w-2xl flex flex-col items-center animate-in fade-in slide-in-from-bottom-6 duration-500">
                        <span className="px-3 py-1 text-[10px] font-bold tracking-widest uppercase bg-white/5 border border-white/10 rounded-full text-gray-400 mb-6">
                            Test Complete
                        </span>
                        <h2 className="text-4xl font-bold text-white mb-12">
                            {finalWpm >= 80 ? "Blazing Fast! 🔥" : finalWpm >= 50 ? "Great Job! 🎉" : "Keep Practicing 💪"}
                        </h2>

                        <div className="flex gap-6 w-full mb-10">
                            <div className="flex-1 bg-[#11151d] border border-white/5 rounded-2xl p-8 flex flex-col items-center shadow-xl">
                                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mb-3">Words Per Minute</span>
                                <span className="text-7xl font-bold text-blue-400 tabular-nums">{finalWpm}</span>
                            </div>
                            <div className="flex-1 bg-[#11151d] border border-white/5 rounded-2xl p-8 flex flex-col items-center shadow-xl">
                                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mb-3">Accuracy</span>
                                <span className="text-7xl font-bold text-white tabular-nums">
                                    {finalAccuracy.toFixed(1)}<span className="text-3xl text-gray-500 ml-1">%</span>
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => reset()}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/25 active:scale-95"
                            >
                                <RotateCcw className="w-5 h-5" />
                                Try Again
                            </button>
                            <Link
                                href="/race"
                                className="flex items-center gap-2 border border-white/10 hover:bg-white/5 text-gray-300 px-8 py-3.5 rounded-xl font-bold transition-all active:scale-95"
                            >
                                <Users className="w-5 h-5" />
                                Race Online
                            </Link>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer Removed */}
        </div>
    );
}

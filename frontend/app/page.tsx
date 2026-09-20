"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { RotateCcw, Users } from "lucide-react";
import SiteHeader from "./site-header";
import TypingField from "./typing-field";
import { randomSentence } from "@/lib/passages";
import { computeWpm } from "@/lib/typing";

type TimerMode = 15 | 30 | 60;
type GameState = "idle" | "typing" | "finished";

/** Append another sentence once the typist gets this close to the end. */
const APPEND_THRESHOLD = 40;

export default function Home() {
    const [timerMode, setTimerMode] = useState<TimerMode>(30);
    const [paragraph, setParagraph] = useState("");
    const [typedText, setTypedText] = useState("");
    const [gameState, setGameState] = useState<GameState>("idle");
    const [timeLeft, setTimeLeft] = useState<number>(30);
    const [liveWpm, setLiveWpm] = useState(0);
    const [totalMistakes, setTotalMistakes] = useState(0);
    const [typedChars, setTypedChars] = useState(0);
    const [finalWpm, setFinalWpm] = useState(0);
    const [finalAccuracy, setFinalAccuracy] = useState(0);

    // The timer callback closes over the values from the keystroke that
    // started the run, so everything it needs live is mirrored into a ref.
    const paragraphRef = useRef(paragraph);
    const lastValRef = useRef("");
    const totalMistakesRef = useRef(0);
    const typedCharsRef = useRef(0);
    const lastSentenceRef = useRef<string | undefined>(undefined);
    const inputRef = useRef<HTMLInputElement>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        paragraphRef.current = paragraph;
    }, [paragraph]);

    const nextSentence = useCallback(() => {
        const sentence = randomSentence(lastSentenceRef.current);
        lastSentenceRef.current = sentence;
        return sentence;
    }, []);

    // Seed the text on the client only. Picking it during render would make
    // the server and client markup disagree, so this setState is deliberate.
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        setParagraph(`${nextSentence()} ${nextSentence()} ${nextSentence()}`);
        inputRef.current?.focus();
    }, [nextSentence]);
    /* eslint-enable react-hooks/set-state-in-effect */

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const reset = useCallback((mode?: TimerMode) => {
        const m = mode ?? timerMode;
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setTypedText("");
        setGameState("idle");
        setTimeLeft(m);
        setLiveWpm(0);
        setTotalMistakes(0);
        setTypedChars(0);
        totalMistakesRef.current = 0;
        typedCharsRef.current = 0;
        lastValRef.current = "";
        setParagraph(`${nextSentence()} ${nextSentence()} ${nextSentence()}`);
        setTimeout(() => inputRef.current?.focus(), 50);
    }, [timerMode, nextSentence]);

    const handleTimerModeChange = (mode: TimerMode) => {
        setTimerMode(mode);
        reset(mode);
    };

    const finishGame = useCallback((typed: string, para: string, mistakes: number, elapsed: number) => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;

        const typedTotal = typedCharsRef.current;
        setFinalWpm(computeWpm(typed, para, elapsed));
        setFinalAccuracy(typedTotal > 0 ? Math.max(0, ((typedTotal - mistakes) / typedTotal) * 100) : 0);
        setGameState("finished");
    }, []);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (gameState === "finished") return;
        if (val.length > paragraph.length) return;

        // Start the clock on the first keystroke.
        if (gameState === "idle" && val.length > 0) {
            const now = Date.now();
            setGameState("typing");
            const end = now + timerMode * 1000;

            timerRef.current = setInterval(() => {
                const elapsed = Date.now() - now;
                const remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000));
                setTimeLeft(remaining);
                setLiveWpm(computeWpm(lastValRef.current, paragraphRef.current, elapsed));
                if (remaining <= 0) {
                    finishGame(lastValRef.current, paragraphRef.current, totalMistakesRef.current, elapsed);
                }
            }, 100);
        }

        // Keep the passage endless.
        if (val.length >= paragraph.length - APPEND_THRESHOLD) {
            const sentence = nextSentence();
            setParagraph(p => p + " " + sentence);
        }

        // Count mistakes only on newly added characters, so backspacing over a
        // typo does not erase the fact that it happened.
        const prevVal = lastValRef.current;
        if (val.length > prevVal.length) {
            const addedChars = val.slice(prevVal.length);
            typedCharsRef.current += addedChars.length;
            setTypedChars(typedCharsRef.current);

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

    const currentAccuracy = typedChars > 0
        ? Math.max(0, Math.round(((typedChars - totalMistakes) / typedChars) * 100))
        : 100;

    return (
        <div className="flex-1 flex flex-col">
            <SiteHeader active="practice" />

            <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
                {gameState !== "finished" ? (
                    <>
                        {/* Timer mode + live stats */}
                        <div className="flex items-center justify-between w-full max-w-3xl mb-6 gap-4">
                            <div className="panel flex items-center gap-1 p-1 rounded-xl">
                                {([15, 30, 60] as TimerMode[]).map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => handleTimerModeChange(mode)}
                                        className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                                            timerMode === mode
                                                ? "bg-sky-400/20 text-sky-200 shadow-[inset_0_0_0_1px_rgba(108,197,255,0.35)]"
                                                : "text-[var(--ink-faint)] hover:text-[var(--ink-soft)]"
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
                                            <span className="text-[var(--ink-faint)] text-[10px] uppercase tracking-widest mb-0.5">WPM</span>
                                            <span className="text-sky-300 font-bold text-xl tabular-nums">{liveWpm}</span>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-[var(--ink-faint)] text-[10px] uppercase tracking-widest mb-0.5">ACC</span>
                                            <span className="text-emerald-300 font-bold text-xl tabular-nums">{currentAccuracy}%</span>
                                        </div>
                                    </>
                                )}
                                <div className="flex flex-col items-center">
                                    <span className="text-[var(--ink-faint)] text-[10px] uppercase tracking-widest mb-0.5">TIME</span>
                                    <span className={`font-bold text-xl tabular-nums ${
                                        timeLeft <= 5 && gameState === "typing" ? "text-rose-400 animate-pulse" : "text-[var(--accent-warm)]"
                                    }`}>
                                        {gameState === "idle" ? timerMode : timeLeft}s
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Typing area */}
                        <div className="panel panel-lit w-full max-w-3xl px-8 py-9 md:px-10 rounded-2xl">
                            <TypingField
                                passage={paragraph}
                                typed={typedText}
                                onChange={handleInput}
                                inputRef={inputRef}
                                lines={3}
                            />
                        </div>

                        <button
                            onClick={() => reset()}
                            className="mt-7 flex items-center gap-2 text-sm font-medium text-[var(--ink-faint)] hover:text-[var(--ink)] transition-colors"
                        >
                            <RotateCcw className="w-4 h-4" />
                            New text
                        </button>
                    </>
                ) : (
                    /* Results */
                    <div className="w-full max-w-2xl flex flex-col items-center">
                        <span className="pill px-3 py-1 text-[10px] font-bold tracking-widest uppercase text-[var(--ink-soft)] mb-5">
                            Test Complete
                        </span>
                        <h2 className="text-glow text-4xl sm:text-5xl font-extrabold tracking-tight mb-10 text-center">
                            {finalWpm >= 80 ? "Blazing Fast" : finalWpm >= 50 ? "Great Job" : "Keep Practicing"}
                        </h2>

                        <div className="flex flex-col sm:flex-row gap-5 w-full mb-9">
                            <div className="panel panel-lit flex-1 p-8 flex flex-col items-center rounded-2xl">
                                <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--ink-faint)] mb-3">Words Per Minute</span>
                                <span className="text-7xl font-extrabold text-sky-300 tabular-nums drop-shadow-[0_0_24px_rgba(108,197,255,0.45)]">{finalWpm}</span>
                            </div>
                            <div className="panel panel-lit flex-1 p-8 flex flex-col items-center rounded-2xl">
                                <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--ink-faint)] mb-3">Accuracy</span>
                                <span className="text-7xl font-extrabold text-[var(--accent-warm)] tabular-nums drop-shadow-[0_0_24px_rgba(245,198,107,0.35)]">
                                    {finalAccuracy.toFixed(1)}<span className="text-3xl text-[var(--ink-faint)] ml-1">%</span>
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-center gap-3">
                            <button onClick={() => reset()} className="btn btn-primary px-8 py-3.5">
                                <RotateCcw className="w-5 h-5" />
                                Try Again
                            </button>
                            <Link href="/race" className="btn btn-ghost px-8 py-3.5">
                                <Users className="w-5 h-5" />
                                Race Online
                            </Link>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

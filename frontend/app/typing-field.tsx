"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { MousePointerClick } from "lucide-react";

/**
 * The typing surface, built the way monkeytype builds one.
 *
 * Three things make it feel smooth, and all three are why this is a component
 * rather than a `passage.split("")` loop in the page:
 *
 *  1. One element per *word*, memoized. Rendering a span per character meant
 *     rebuilding and diffing well over a thousand nodes on every keystroke.
 *     Here only the word under the caret has changed props, so React touches
 *     a handful of nodes and the rest are skipped outright.
 *  2. A single caret that slides. It is positioned from measured layout and
 *     moved with a transform, so it glides between characters instead of being
 *     re-created inside whichever span happens to be current.
 *  3. Lines scroll. The passage is clipped to a few lines and slid upward to
 *     keep the active line in view, so the block never grows down the page.
 */

type Word = { text: string; start: number };

function splitWords(passage: string): Word[] {
    const words: Word[] = [];
    let start = 0;
    for (const text of passage.split(" ")) {
        words.push({ text, start });
        start += text.length + 1;
    }
    return words;
}

/** Index of the word containing a global character offset. */
function wordIndexAt(words: Word[], index: number) {
    let lo = 0;
    let hi = words.length - 1;
    let best = 0;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (words[mid].start <= index) {
            best = mid;
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }
    return best;
}

const WordSpan = memo(function WordSpan({
    text,
    typed,
    badSpace,
}: {
    text: string;
    typed: string;
    badSpace: boolean;
}) {
    return (
        <span className={badSpace ? "tf-word is-badspace" : "tf-word"}>
            {text.split("").map((ch, i) => {
                const t: string | undefined = typed[i];
                const cls = t === undefined ? "tf-ch" : t === ch ? "tf-ch is-ok" : "tf-ch is-bad";
                return (
                    <span key={i} className={cls}>
                        {ch}
                    </span>
                );
            })}
        </span>
    );
});

type TypingFieldProps = {
    passage: string;
    typed: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
    /** How many lines of the passage stay on screen. */
    lines?: number;
    /** Freezes the caret, e.g. once a race is over. */
    frozen?: boolean;
};

export default function TypingField({
    passage,
    typed,
    onChange,
    inputRef,
    lines = 3,
    frozen = false,
}: TypingFieldProps) {
    const [focused, setFocused] = useState(false);
    const wordsRef = useRef<HTMLDivElement>(null);
    const caretRef = useRef<HTMLSpanElement>(null);
    /** Which visual line the caret was on last, to detect line changes. */
    const prevLineRef = useRef(-1);

    const words = useMemo(() => splitWords(passage), [passage]);

    const reposition = useCallback(() => {
        const wordsEl = wordsRef.current;
        const caretEl = caretRef.current;
        if (!wordsEl || !caretEl || words.length === 0) return;

        const index = Math.min(typed.length, passage.length);
        const wi = wordIndexAt(words, index);
        const wordEl = wordsEl.children[wi] as HTMLElement | undefined;
        if (!wordEl) return;

        const lineHeight = wordEl.offsetHeight;
        if (lineHeight === 0) return; // not laid out yet

        const charIndex = index - words[wi].start;
        const charEl = wordEl.children[charIndex] as HTMLElement | undefined;

        let x: number;
        let y: number;
        if (charEl) {
            x = wordEl.offsetLeft + charEl.offsetLeft;
            y = wordEl.offsetTop + charEl.offsetTop;
        } else {
            // Sitting on the space that follows the word.
            x = wordEl.offsetLeft + wordEl.offsetWidth;
            y = wordEl.offsetTop;
        }

        const line = Math.round(y / lineHeight);

        // Wrapping to a new line, or resetting to the start, should snap the
        // caret rather than let it slide the full width of the block while the
        // lines scroll underneath it. Suppressing the transition for this one
        // frame is what keeps a line break from looking like a long swipe.
        if (prevLineRef.current !== line || index === 0) {
            caretEl.style.transition = "none";
            requestAnimationFrame(() => {
                caretEl.style.transition = "";
            });
        }
        prevLineRef.current = line;

        const caretHeight = lineHeight * 0.72;
        caretEl.style.height = `${caretHeight}px`;
        caretEl.style.transform = `translate(${x}px, ${y + (lineHeight - caretHeight) / 2}px)`;

        // Hold the active line in the second visible row so there is always a
        // line of context ahead of the caret.
        const firstVisible = Math.max(0, line - 1);
        wordsEl.style.transform = `translateY(${-firstVisible * lineHeight}px)`;
    }, [typed, passage, words]);

    useLayoutEffect(reposition, [reposition]);

    // Word wrapping changes with the viewport, and webfonts land after first
    // paint, so re-measure on both.
    useEffect(() => {
        window.addEventListener("resize", reposition);
        let cancelled = false;
        document.fonts?.ready.then(() => {
            if (!cancelled) reposition();
        });
        return () => {
            cancelled = true;
            window.removeEventListener("resize", reposition);
        };
    }, [reposition]);

    // Stop the blink while keys are actually going in; a caret that blinks
    // mid-word reads as lag. `focused` and `frozen` are dependencies because a
    // re-render rewrites className and would drop the class added here.
    useEffect(() => {
        const caretEl = caretRef.current;
        if (!caretEl) return;
        caretEl.classList.remove("tf-caret--blink");
        const timer = setTimeout(() => caretEl.classList.add("tf-caret--blink"), 700);
        return () => clearTimeout(timer);
    }, [typed, focused, frozen]);

    const focus = useCallback(() => inputRef.current?.focus(), [inputRef]);

    // Typing anywhere on the page drops you straight into the passage.
    useEffect(() => {
        if (focused || frozen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            const target = e.target as HTMLElement | null;
            const tag = target?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
            focus();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [focused, frozen, focus]);

    const caretClass = [
        "tf-caret",
        !focused || frozen ? "tf-caret--hidden" : "",
    ]
        .filter(Boolean)
        .join(" ");

    const blurred = !focused && !frozen;

    return (
        <div className="tf" style={{ ["--tf-lines" as string]: lines }} onClick={focus}>
            <input
                ref={inputRef}
                type="text"
                value={typed}
                onChange={onChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                className="absolute w-0 h-0 opacity-0 p-0 border-0 pointer-events-none"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-label="Typing input"
            />

            <div className="tf-viewport">
                <div ref={wordsRef} className={blurred ? "tf-words is-blurred" : "tf-words"}>
                    {words.map((word, i) => (
                        <WordSpan
                            key={i}
                            text={word.text}
                            typed={typed.slice(word.start, word.start + word.text.length)}
                            badSpace={i > 0 && typed.length > word.start - 1 && typed[word.start - 1] !== " "}
                        />
                    ))}
                    <span ref={caretRef} className={caretClass} />
                </div>

                {blurred && (
                    <div className="tf-focusnote">
                        <MousePointerClick className="w-4 h-4" />
                        Click here or press any key to focus
                    </div>
                )}
            </div>
        </div>
    );
}

/** Typing math shared by practice mode and the multiplayer race. */

/** Characters typed so far that match the passage at the same position. */
export function countCorrectChars(typed: string, passage: string) {
    let correct = 0;
    for (let i = 0; i < typed.length; i++) {
        if (typed[i] === passage[i]) correct++;
    }
    return correct;
}

/** Words per minute, on the usual five-characters-per-word convention. */
export function computeWpm(typed: string, passage: string, elapsedMs: number) {
    if (elapsedMs <= 0) return 0;
    return Math.round(countCorrectChars(typed, passage) / 5 / (elapsedMs / 60000));
}

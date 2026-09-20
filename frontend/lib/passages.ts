/**
 * Practice sentences.
 *
 * Lowercase letters and single spaces only — no commas, periods, capitals or
 * apostrophes. Punctuation and shift keys are what break a typist's rhythm, so
 * leaving them out is what makes the text feel fast under the fingers.
 *
 * Short and self-contained, because practice mode strings these together into
 * an endless passage. Each one has to read naturally after any other, so none
 * of them open with a pronoun that needs a previous line to make sense.
 */
export const PRACTICE_SENTENCES = [
    "the morning light comes through the window and lands on the floor in one bright stripe",
    "a good sentence should feel like it was easy to write even when it absolutely was not",
    "rain on a tin roof is the oldest and most reliable sound in the entire world",
    "start slowly and stay accurate and let the speed turn up whenever it is ready",
    "the cat has claimed the warmest square of carpet and will not be negotiating today",
    "somewhere down the hill a train is pulling out of a very small station",
    "clear writing is mostly the result of deleting things you liked at the time",
    "he packed a bag and missed the bus on purpose and walked the whole way instead",
    "the clouds today look heavy enough to lean on which is probably a bad idea",
    "every skill worth having goes through a long stretch of feeling clumsy first",
    "she found the old letters in a shoebox and read all of them in one sitting",
    "wind moves through the tall grass in slow waves that look almost like water",
    "the best time to fix a small problem is while it is still a small problem",
    "a quiet street at midnight runs on a completely different set of rules",
    "keep your eyes a few words ahead and trust your fingers to catch up",
    "the festival lanterns went up early this year and nobody has complained yet",
    "coffee and a window seat and two free hours make a fairly perfect afternoon",
    "most good ideas arrive looking a little bit ridiculous at the beginning",
    "the river is low enough now that you can count every stone on the bottom",
    "nobody remembers the draft only the version you were brave enough to finish",
    "he learned the song badly first and then slowly and eventually rather well",
    "there is a particular blue the sky only manages for ten minutes after sunset",
    "ask the question early before it grows teeth and quietly costs you a day",
    "the bakery opens at six and the good bread is gone by half past seven",
    "a map stays useful right up until the road vanishes underneath your feet",
    "snow makes a whole neighborhood sound like somebody turned the volume down",
    "practice is the unglamorous part that quietly does all of the actual work",
    "she took the long way home because the short way had nothing worth seeing",
    "the screen door bangs twice every time somebody forgets to catch it",
    "write it down now because tomorrow you will not remember why it mattered",
    "cherry trees bloom for about a week which is exactly why anyone looks up",
    "the old radio still works if you hold the antenna at one specific angle",
    "good habits are boring by design and that is the entire reason they hold",
    "fog rolled in off the water and swallowed the far end of the wooden pier",
    "he reads the last page first which is unforgivable and does it anyway",
    "the hardest part of a project begins right after it stops being fun",
    "sunlight through leaves makes a pattern nobody has ever managed to copy",
    "take the break before you need it and not after you have fallen apart",
    "the lighthouse blinks twice and pauses and then blinks twice again",
    "a shared problem is a strange sort of gift especially between strangers",
    "nothing sharpens attention quite like a deadline you actually believe in",
    "the bus driver knows every curve on the coast road entirely by heart",
    "small daily effort beats a heroic weekend almost every single time",
    "somebody left a bicycle leaning against the fence and never came back for it",
];

/**
 * Picks a sentence, never handing back the one just used, so the endless
 * practice passage does not stutter on a repeat.
 */
export function randomSentence(previous?: string): string {
    const pool = previous
        ? PRACTICE_SENTENCES.filter((s) => s !== previous)
        : PRACTICE_SENTENCES;
    return pool[Math.floor(Math.random() * pool.length)];
}

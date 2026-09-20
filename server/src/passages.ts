/**
 * Race passages.
 *
 * Lowercase letters and single spaces only — no commas, periods, capitals or
 * apostrophes. Punctuation and shift keys are what break a typist's rhythm, so
 * leaving them out is what makes a passage feel fast to type rather than
 * merely nice to read. Clauses are joined with plain conjunctions so the text
 * still flows without the punctuation that would normally carry it.
 *
 * Each one runs roughly 35 to 50 words, which is a 30 to 45 second race at an
 * average pace.
 */
export const RACE_PASSAGES = [
    "the morning train pulls away from a quiet station while the sky turns from soft grey to pale gold and somewhere past the rice fields a bell rings once and the whole valley seems to wake up at the very same moment",

    "rain starts without warning and taps on the roof of the old bookshop where a single lamp is still burning while the owner looks up and smiles at nobody in particular and goes back to a story he has read a hundred times",

    "there is a hill outside town where the grass grows tall enough to hide in and if you climb it in late summer you can watch the clouds move across the whole valley one slow shadow at a time until the sun finally sinks",

    "good code reads like a letter to whoever maintains it next year so choose names that explain themselves and keep each function small enough to hold in your head and leave every file a little cleaner than you found it",

    "speed is easy to measure and accuracy is easy to ignore which is exactly why most people stop improving so slow down until your fingers stop guessing and the speed will arrive on its own without you ever chasing it",

    "the festival lanterns go up on the first warm evening of the year and children run ahead with paper masks pushed onto their foreheads while the smell of grilled corn drifts down a street far too narrow for this many people",

    "every keyboard has a rhythm hidden inside it and you only find yours after a few thousand honest attempts so listen for the moment the clicking turns into something steadier almost like rain and then simply keep going",

    "snow falls on the shrine steps all night and nobody sweeps it until morning and by then the footprints of a single fox lead up to the gate and stop there as if the animal had looked around once and decided to turn back",

    "the best projects start as a bad idea that somebody refused to abandon so you build the ugly version first and show it to one honest friend and then spend a long unglamorous month making it worth showing to anybody else",

    "a small boat leaves the harbor before dawn with its lights still on and the water is flat and black and the engine is the only sound for a mile while the fisherman aboard is thinking about nothing at all which is the point",

    "practice is never the part anybody posts about because it is the quiet hour before the house wakes up and the same drill repeated until it stops feeling clever and the slow discovery that progress mostly means showing up",

    "the library keeps a window open in spring because the head librarian believes books should smell like the season so students complain about the draft and then fall asleep in the sunlight anyway with their faces on their notes",

    "typing quickly is a conversation between your eyes and your hands and the eyes should stay a few words ahead so read forward and trust the fingers behind you and stop glancing down to check whether they are keeping up",

    "somewhere between the last train and the first a city becomes almost gentle and vending machines hum on empty corners while a cat crosses the road without hurrying and the traffic lights keep changing for nobody at all",

    "ask for help earlier than feels comfortable because the hour you spend stuck and silent is rarely the hour you learn something and the person you are afraid to bother has almost certainly been stuck on the very same thing",

    "the cherry trees along the river bloom for about a week which is precisely why anyone bothers to look up and half the town brings a blanket and sits beneath them until dark eating badly and talking loudly and staying late",

    "write the thing down before you forget why it mattered because memory is a generous liar and the detail you are absolutely certain you will remember tomorrow is usually the first one to quietly disappear overnight",

    "a summer storm arrives over the mountains like it has somewhere better to be and the light turns green and the cicadas stop all at once and for about ten seconds the whole world holds still before the first heavy drop lands",

    "the difference between a draft and a finished piece is almost never talent but the willingness to return to something you already think is fine and cut the parts you were most proud of writing in the first place",

    "wind moves through the barley in long slow waves and from the top of the road it looks exactly like water and if you stand there long enough you start to believe the field is breathing which is a hard thing to unsee",

    "multiplayer games are strange and wonderful because they hand strangers a shared problem and ask them to care and somebody you will never meet is trying just as hard as you are on the far side of a very thin wire",

    "keep a notebook you are allowed to ruin and fill it with half thoughts and bad diagrams and lists you never finish and then read it once a year to find out what you actually believed before you learned to sound confident",

    "the last bus climbs the coast road with three passengers and a driver who knows every curve by heart while outside the window the sea has gone the color of slate and the lighthouse blinks twice as if it were counting",

    "rest is part of the work and not a reward for finishing it because your hands need the pause more than your pride does so close the laptop and walk somewhere with a sky in it and let the problem solve itself while you are gone",
];

/**
 * Picks a passage, never handing back the one that is currently on screen.
 */
export function randomPassage(previous?: string): string {
    const pool = previous
        ? RACE_PASSAGES.filter((p) => p !== previous)
        : RACE_PASSAGES;
    return pool[Math.floor(Math.random() * pool.length)];
}

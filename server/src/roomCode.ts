import type { Presence } from "colyseus";

/**
 * Short, human-friendly room codes.
 *
 * Colyseus hands out a random 9-character roomId, which is miserable to read
 * out loud or type into a phone. A room may replace `this.roomId` during
 * `onCreate()`, so we swap in a 4-character code instead and `joinById(code)`
 * keeps working untouched.
 *
 * The alphabet drops every glyph that gets misread out loud or on screen:
 * 0/O, 1/I/L. That leaves 31 symbols and roughly 920,000 combinations, which
 * is far more than enough for the number of rooms alive at any one time.
 */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 4;

/** Presence key holding the codes currently in use across all processes. */
const CODE_REGISTRY = "$starfall:roomcodes";

function randomCode() {
    let code = "";
    for (let i = 0; i < CODE_LENGTH; i++) {
        code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    return code;
}

export async function reserveRoomCode(presence: Presence): Promise<string> {
    const taken = new Set(await presence.smembers(CODE_REGISTRY));

    let code = randomCode();
    // Collisions are vanishingly rare, but a bounded retry keeps this honest.
    for (let attempt = 0; taken.has(code) && attempt < 50; attempt++) {
        code = randomCode();
    }

    await presence.sadd(CODE_REGISTRY, code);
    return code;
}

export async function releaseRoomCode(presence: Presence, code: string) {
    await presence.srem(CODE_REGISTRY, code);
}

/** Normalizes whatever a player typed into the code's canonical form. */
export function normalizeRoomCode(input: string) {
    return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

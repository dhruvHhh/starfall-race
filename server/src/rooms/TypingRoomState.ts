import { Schema, type, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
    @type("string") name: string = "";
    @type("number") progress: number = 0; // 0 to 100
    @type("boolean") finished: boolean = false;
    @type("number") finishTime: number = 0;
    @type("boolean") ready: boolean = false;
    @type("number") wpm: number = 0;
    /** Joined after the race began, so they sit out until the next one. */
    @type("boolean") spectating: boolean = false;
}

export class TypingRoomState extends Schema {
    @type("string") paragraph: string = "";
    @type("string") status: string = "waiting"; // waiting | countdown | racing | finished
    @type("number") countdown: number = -1;      // -1 = not counting, 3/2/1/0 = counting
    @type({ map: Player }) players = new MapSchema<Player>();
}

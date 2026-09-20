import { Room, Client } from "colyseus";
import { TypingRoomState, Player } from "./TypingRoomState";
import { randomPassage } from "../passages";
import { reserveRoomCode, releaseRoomCode } from "../roomCode";

const MAX_NAME_LENGTH = 20;
const COUNTDOWN_FROM = 3;

function sanitizeName(raw: string | undefined, fallback: string) {
    const name = (raw ?? "").trim().slice(0, MAX_NAME_LENGTH);
    return name || fallback;
}

export class TypingRoom extends Room {
    maxClients = 6;
    state = new TypingRoomState();
    private countdownInterval: any = null;

    async onCreate(options: any) {
        // Swap the generated 9-character id for a code people can actually
        // read out to a friend. Allowed only while the room is being created.
        this.roomId = await reserveRoomCode(this.presence);

        if (options?.private) {
            this.setPrivate(true);
        }
        this.state.paragraph = randomPassage();

        this.onMessage("progress", (client, message: { progress: number; wpm?: number }) => {
            const player = this.state.players.get(client.sessionId);
            if (!player || player.finished || player.spectating) return;
            if (this.state.status !== "racing") return;

            player.progress = Math.max(0, Math.min(100, message.progress));
            if (message.wpm !== undefined) player.wpm = Math.max(0, message.wpm);

            if (player.progress >= 100) {
                player.finished = true;
                player.finishTime = Date.now();
                this.checkAllFinished();
            }
        });

        this.onMessage("ready", (client, message: { ready: boolean }) => {
            const player = this.state.players.get(client.sessionId);
            if (!player) return;
            // Only allow toggling ready in the waiting state
            if (this.state.status !== "waiting") return;
            player.ready = message.ready;
            this.checkAutoStart();
        });

        this.onMessage("restart", () => {
            this.resetRoom();
        });
    }

    onJoin(client: Client, options: { name?: string } = {}) {
        const player = new Player();
        player.name = sanitizeName(options?.name, `Racer ${this.clients.length}`);
        // Anyone arriving mid-race waits it out rather than starting hopelessly behind.
        player.spectating = this.state.status !== "waiting";
        this.state.players.set(client.sessionId, player);
        console.log(`${client.sessionId} joined ${this.roomId} as "${player.name}"`);
    }

    onLeave(client: Client) {
        this.state.players.delete(client.sessionId);

        if (this.state.status === "countdown") {
            // The line-up changed mid-countdown; send everyone back to the lobby.
            this.resetRoom();
        } else if (this.state.status === "racing") {
            // The leaver may have been the last one anybody was waiting on.
            this.checkAllFinished();
        }
    }

    async onDispose() {
        this.cancelCountdown();
        await releaseRoomCode(this.presence, this.roomId);
    }

    /** Everyone taking part in the current race (spectators sit these out). */
    private racers() {
        return Array.from(this.state.players.values()).filter(p => !p.spectating);
    }

    private checkAutoStart() {
        if (this.state.status !== "waiting") return;
        const players = this.racers();
        if (players.length >= 2 && players.every(p => p.ready)) {
            this.startCountdown();
        }
    }

    private startCountdown() {
        this.state.status = "countdown";
        this.state.countdown = COUNTDOWN_FROM;

        this.countdownInterval = this.clock.setInterval(() => {
            this.state.countdown -= 1;
            if (this.state.countdown <= 0) {
                this.cancelCountdown();
                this.state.status = "racing";
                this.state.countdown = -1;
            }
        }, 1000);
    }

    private cancelCountdown() {
        if (this.countdownInterval) {
            this.countdownInterval.clear();
            this.countdownInterval = null;
        }
    }

    private checkAllFinished() {
        if (this.state.status !== "racing") return;
        const players = this.racers();
        if (players.length > 0 && players.every(p => p.finished)) {
            this.state.status = "finished";
        }
    }

    private resetRoom() {
        this.cancelCountdown();
        this.state.status = "waiting";
        this.state.countdown = -1;
        this.state.paragraph = randomPassage(this.state.paragraph);
        this.state.players.forEach(player => {
            player.ready = false;
            player.progress = 0;
            player.finished = false;
            player.finishTime = 0;
            player.wpm = 0;
            player.spectating = false;
        });
    }
}

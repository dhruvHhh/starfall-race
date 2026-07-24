import { Room, Client } from "colyseus";
import { TypingRoomState, Player } from "./TypingRoomState";

const PARAGRAPHS = [
    "The quick brown fox jumps over the lazy dog while the sun sets slowly in the west.",
    "Racing against friends is more fun than racing against the clock alone in your room.",
    "Colyseus makes real time multiplayer games surprisingly approachable for developers.",
    "A journey of a thousand miles begins with a single step taken with courage and faith.",
    "The art of programming is the art of organizing complexity into something manageable.",
    "Speed and accuracy are both essential skills for any competitive typist to master well.",
    "Practice makes perfect, but only if you practice with intention and focus every day.",
    "The best way to predict the future is to invent it yourself through hard work and skill.",
    "In the middle of every difficulty lies opportunity waiting to be discovered by the bold.",
    "Code is like humor. When you have to explain it, it is probably not that good after all.",
    "Keyboards are the instruments through which programmers compose their digital symphonies.",
    "The difference between a good typist and a great one is measured in milliseconds of focus.",
    "Every character you type brings you one step closer to becoming a master of the keyboard.",
    "Multiplayer games connect strangers across the world through the language of competition.",
];

function randomParagraph() {
    return PARAGRAPHS[Math.floor(Math.random() * PARAGRAPHS.length)];
}

export class TypingRoom extends Room {
    maxClients = 6;
    state = new TypingRoomState();
    private countdownInterval: any = null;

    onCreate(options: any) {
        if (options.private) {
            this.setPrivate(true);
        }
        this.state.paragraph = randomParagraph();

        this.onMessage("progress", (client, message: { progress: number; wpm?: number }) => {
            const player = this.state.players.get(client.sessionId);
            if (!player || player.finished) return;

            player.progress = message.progress;
            if (message.wpm !== undefined) player.wpm = message.wpm;

            if (message.progress >= 100 && !player.finished) {
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
        player.name = options?.name || `Player ${this.clients.length}`;
        this.state.players.set(client.sessionId, player);
        console.log(client.sessionId, "joined");
    }

    onLeave(client: Client) {
        this.state.players.delete(client.sessionId);
        // If someone leaves during countdown, cancel and go back to waiting
        if (this.state.status === "countdown") {
            this.cancelCountdown();
            this.resetRoom();
        }
    }

    private checkAutoStart() {
        if (this.state.status !== "waiting") return;
        const players = Array.from(this.state.players.values());
        if (players.length >= 2 && players.every(p => p.ready)) {
            this.startCountdown();
        }
    }

    private startCountdown() {
        this.state.status = "countdown";
        this.state.countdown = 3;

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
        const players = Array.from(this.state.players.values());
        if (players.length > 0 && players.every(p => p.finished)) {
            this.state.status = "finished";
        }
    }

    private resetRoom() {
        this.cancelCountdown();
        this.state.status = "waiting";
        this.state.countdown = -1;
        this.state.paragraph = randomParagraph();
        this.state.players.forEach(player => {
            player.ready = false;
            player.progress = 0;
            player.finished = false;
            player.finishTime = 0;
            player.wpm = 0;
        });
    }
}

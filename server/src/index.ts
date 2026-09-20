import { defineServer, defineRoom } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { TypingRoom } from "./rooms/TypingRoom";

const app = express();

// `credentials` is only meaningful against a concrete origin; pairing it with
// "*" is rejected by every browser, and we send no cookies anyway.
const clientOrigin = process.env.CLIENT_ORIGIN;
app.use(
    cors(
        clientOrigin
            ? { origin: clientOrigin, credentials: true }
            : { origin: "*" }
    )
);

app.get("/health", (_req, res) => {
    res.json({ ok: true });
});

const httpServer = createServer(app);

const server = defineServer({
    transport: new WebSocketTransport({ server: httpServer }),
    rooms: {
        typing_room: defineRoom(TypingRoom),
    },
});

const port = Number(process.env.PORT) || 2567;
server.listen(port);
console.log(`Colyseus server listening on port ${port}`);

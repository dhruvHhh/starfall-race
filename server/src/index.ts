import { defineServer, defineRoom } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { TypingRoom } from "./rooms/TypingRoom";

const app = express();
app.use(
    cors({
        origin: process.env.CLIENT_ORIGIN || "*",
        credentials: true,
    })
);

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

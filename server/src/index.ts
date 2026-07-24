import { defineServer, defineRoom } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { TypingRoom } from "./rooms/TypingRoom";

const app = express();
app.use(
    cors({
        origin: "http://localhost:3000",
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

server.listen(2567);
console.log("Colyseus server listening on ws://localhost:2567");

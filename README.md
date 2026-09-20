# ⌨️ starfall

A little multiplayer typing race game I built to learn how real-time / multiplayer stuff actually works. You join a room with your friends (or randoms), everyone types out the same paragraph, and whoever finishes fastest wins. Think typing-test websites, but live against other people instead of just a timer.

This was a learning project for me, so please don't expect production-quality code 😅 — I mainly built it to actually *understand* how a multiplayer game server talks to a frontend in real time, instead of just reading about it.

## What it does

- Create or join a "room" to race against other players
- Everyone sees a live progress bar for each player as they type
- A short 3-2-1 countdown starts the race once everyone hits "ready"
- Live WPM (words per minute) shown while racing
- Shows who finished first, second, etc. at the end
- You can hit restart and go again with a new random paragraph

## What I used it to learn

- **Next.js / React / TypeScript** — this was my first time putting together a full app with Next.js
- **Colyseus** — a framework for building real-time multiplayer game servers over WebSockets. This was the main thing I wanted to learn — how a server can keep multiple clients in sync (player progress, countdowns, room state, etc.) without me having to hand-roll raw WebSocket message handling
- **Tailwind CSS** for styling
- Basic client-server architecture: a Node/Express + Colyseus server for the game logic, and a separate Next.js frontend that just renders things and talks to the server

## Tech stack

**Frontend** (`frontend/`)
- Next.js 16 + React 19 + TypeScript
- Tailwind CSS
- `@colyseus/sdk` to connect to the game server

**Server** (`server/`)
- Node.js + Express
- Colyseus (`colyseus`, `@colyseus/schema`, `@colyseus/ws-transport`) for the real-time multiplayer room logic
- TypeScript

## Project structure

```
type-brawl/
├── frontend/                  # Next.js app (the UI)
│   └── app/
│       ├── page.tsx               # home page - enter your name, join a race
│       └── race/
│           ├── page.tsx
│           └── race-client.tsx    # the actual race screen + Colyseus connection logic
└── server/                    # Colyseus game server
    └── src/
        ├── index.ts                     # starts the server, registers the "typing_room"
        └── rooms/
            ├── TypingRoom.ts             # room logic (ready-up, countdown, progress, finish)
            └── TypingRoomState.ts        # the shared state schema (players, progress, status...)
```

## Running it locally

You need two things running at once: the game server, and the frontend.

### 1. Start the server

```bash
cd server
npm install
npm run dev
```

This starts the Colyseus server on `http://localhost:2567` by default (you'll see a log line confirming it's listening).

### 2. Start the frontend

In a separate terminal:

```bash
cd frontend
npm install
```

Create a `.env.local` file inside `frontend/` so the app knows where to find the server:

```env
NEXT_PUBLIC_COLYSEUS_URL=ws://localhost:2567
```

Then run:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Open it in a couple of tabs (or send it to a friend) to actually test the multiplayer part — you need at least 2 players ready to start a race.

## Things I'd probably do better next time

Since this was mostly for learning, there's a bunch of stuff that could be improved — like adding proper error handling if the server disconnects, letting players choose room codes to play privately with friends more easily, and probably writing some actual tests. Might come back and improve on these later!

## Why I made this

I wanted a small, fun project to actually get hands-on with real-time multiplayer concepts (rooms, shared state, syncing many clients) instead of just building another CRUD app. Typing races felt like a fun, simple enough idea to build end-to-end without getting overwhelmed, while still forcing me to deal with real concurrency/sync problems.

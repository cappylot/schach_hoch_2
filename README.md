# Schach Hoch 2 — Capture-Duel Chess

Web-based multiplayer chess variant that launches a side blitz duel whenever a capture is attempted. Built with a React + Vite frontend and an Express + Socket.IO backend, using `chess.js` for rules and clock management.

## Features

- Real-time multiplayer lobby: share a URL to invite a second player (extra clients join as spectators).
- Main game clocks with 15 minutes + 2 second increment per move.
- Automatic side duel when a capture is attempted: 5 minutes for the attacker, 1 minute for the defender, no increment.
- Capture resolution logic:
  - Defender wins → attempt to invert the capture (defender captures instead).
  - If inversion is illegal (e.g. self-check), fallback to the attacker’s capture.
  - Draws or attacker victories leave the original capture in place.
- Complete rule coverage, including en passant, promotions, and draw detection.
- Resign and draw offer workflow, reconnect support, and full state sync on refresh.

## Tech Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Socket.IO client.
- **Backend:** Node.js, Express, Socket.IO, chess.js, TypeScript.
- **Workspace:** Managed with pnpm workspaces.

## Getting Started

### Prerequisites

- Node.js 18+ with Corepack (bundled with recent Node versions).
- pnpm (`corepack enable` will make it available if not already).

### Installation

```bash
# From the project root
corepack pnpm install
```

> If Corepack is unavailable, install pnpm globally (`npm install -g pnpm`) instead.

### Environment

- Backend: copy `server/.env.example` to `server/.env` to override the default port (defaults to `4000`).
- Frontend: copy `client/.env.example` to `client/.env` and point `VITE_SERVER_URL` at the backend host.

### Running the project

```bash
# Terminal 1 — API & Socket server
corepack pnpm --filter schach-hoch-2-server dev

# Terminal 2 — Frontend
corepack pnpm --filter schach-hoch-2-client dev
```

The backend listens at `http://localhost:4000` by default, while Vite serves the client at `http://localhost:5173`.

### Useful Scripts

- `corepack pnpm --filter schach-hoch-2-server build` – compile backend TypeScript to `server/dist`.
- `corepack pnpm --filter schach-hoch-2-client build` – create production frontend build in `client/dist`.
- `corepack pnpm --filter schach-hoch-2-client preview` – preview the built frontend locally.

## Project Structure

```
.
├── client/                 # Vite + React application
│   ├── src/
│   │   ├── components/     # Board, clocks, side duel modal
│   │   ├── lib/            # Socket wrapper, chess helpers, shared types
│   │   ├── routes/         # Lobby and Game routes
│   │   └── styles/         # Tailwind entrypoint
├── server/                 # Express + Socket.IO backend
│   ├── src/
│   │   ├── clock.ts        # Incremental countdown clock implementation
│   │   ├── gameManager.ts  # Core game logic and capture resolution
│   │   ├── sockets.ts      # Socket.IO bindings
│   │   ├── rules.ts        # Chess helpers (side duel setup)
│   │   ├── types.ts        # Shared enums/helpers for colors
│   │   └── index.ts        # Server bootstrap
├── pnpm-workspace.yaml
└── README.md
```

## Gameplay Notes

1. Open two browser tabs to the same game URL (generated in the lobby) to play head-to-head.
2. Clocks start running after the first move; increments are applied when a move completes.
3. During a capture attempt, the main board pauses and a modal appears with the side duel board.
4. The defender only overturns the capture if they *win* the side duel **and** the inverted capture is legal.
5. All draw conditions (stalemate, repetition, 50-move rule) are automatically detected in both game contexts.

## Development Tips

- The frontend computes clock countdowns client-side using `lastUpdated` timestamps and keeps them synced via frequent state broadcasts from the backend.
- Game state is authoritative on the server; clients send intent (`moveMain`, `moveSide`, `offerDraw`, etc.) and receive complete snapshots.
- Spectators receive the same `stateSync` stream but never gain move privileges.

## Future Improvements

- Spectator chat and emotes.
- PGN export annotating side duels.
- Configurable time controls and duel odds.
- Persistence layer for long-running games and matchmaking services.

---

Built for the “Schach Hoch 2” variant — have fun dueling for every capture!

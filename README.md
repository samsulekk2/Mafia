# Mafia Online

Hostless, server-authoritative online Mafia game. No human host — the backend runs all game logic, timers, and win conditions.

## Players

Shindy (admin), Ali, Sair, Faizan, Faris, Ahmed, Barry

## Stack

- **Server:** Node.js, Express, Socket.IO, TypeScript, Zod
- **Client:** React, TypeScript, Tailwind CSS, Zustand, Framer Motion, PWA

## Quick start

```bash
npm install
cp server/.env.example server/.env
cp client/.env.example client/.env
npm run dev
```

- **Client:** http://localhost:5173/?room=main
- **Server:** http://localhost:3001

Sign in with your whitelisted username and password (see `server/.env.example` for dev defaults).

## How to play

1. Sign in with username + password (whitelist only).
2. **Shindy** (admin) configures roles and toggles voice chat in the lobby.
3. All players tap **Ready up** (minimum 4 players).
4. Admin clicks **Start game** — roles are assigned privately.
5. **Night (60s):** Mafia / Doctor / Detective submit actions.
6. **Day (240s):** Outcomes are revealed; discuss.
7. **Voting (240s):** Vote to eliminate someone.
8. Repeat until mafia or civilians win.

Spectators can join without credentials (watch only).

## Full setup & deployment

See **[SETUP.md](./SETUP.md)** for the complete step-by-step guide (local test, Render, Vercel, GitHub Actions).

See [DEPLOYMENT.md](./DEPLOYMENT.md) for platform-specific reference.

## Project structure

```
Mafia/
├── SETUP.md           # Step-by-step setup & deploy guide
├── SPEC.json          # AI-ready game specification
├── shared/types.ts    # Shared TypeScript types
├── server/            # Game engine + Socket.IO
└── client/            # React PWA frontend
```

## Socket events

See `server/src/index.ts` for the full event list matching the spec.

## Room invites

Share a link like `http://localhost:5173/?room=main` — the lobby shows a QR code and copy button.

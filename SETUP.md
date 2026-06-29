# Mafia Online — Setup Guide

Follow these steps in order. **Step 4 (GitHub) is for you** — everything else is ready in the repo.

---

## Step 1 — Install & configure environment

```bash
npm install
cp server/.env.example server/.env
cp client/.env.example client/.env
```

### Server (`server/.env`)

| Variable | Purpose |
|----------|---------|
| `PORT` | API port (default `3001`) |
| `CLIENT_ORIGIN` | Frontend URL for CORS (local: `http://localhost:5173`) |
| `DEFAULT_ROOM_ID` | Default room when no `?room=` in URL |
| `USER_CREDENTIALS` | JSON map of username → password for all 7 players |

**Default dev passwords** (change before production):

| User | Password |
|------|----------|
| Shindy | `shindy1` |
| Ali | `ali1` |
| Sair | `sair1` |
| Faizan | `faizan1` |
| Faris | `faris1` |
| Ahmed | `ahmed1` |
| Barry | `barry1` |

Example:

```env
USER_CREDENTIALS={"Shindy":"shindy1","Ali":"ali1","Sair":"sair1","Faizan":"faizan1","Faris":"faris1","Ahmed":"ahmed1","Barry":"barry1"}
```

### Client (`client/.env`)

| Variable | Purpose |
|----------|---------|
| `VITE_SERVER_URL` | Backend URL (local: `http://localhost:3001`) |
| `VITE_TURN_*` | TURN server for voice chat behind NAT (pre-configured with Metered Open Relay) |

---

## Step 2 — Run locally

```bash
npm run dev
```

- **Client:** http://localhost:5173/?room=main  
- **Server:** http://localhost:3001/health → `{"ok":true}`

Sign in with any whitelisted username + password from Step 1.

---

## Step 3 — Verify login (automated)

With the server running in another terminal:

```bash
npm run test:login
```

Expected: **8/8 checks passed** (7 users + wrong-password rejection).

### Manual game smoke test

1. Open 4+ browser tabs (or incognito windows).
2. Sign in as different players (Shindy, Ali, Sair, Faizan…).
3. **Shindy** (admin): configure roles → enable voice → **Start game**.
4. Play through night → day → voting until someone wins.
5. Test **Log out** in the header — returns to sign-in screen.
6. Test duplicate login: sign in as Ali in two tabs — first tab gets kicked with “Logged in from another device”.

---

## Step 4 — Push to GitHub *(you do this)*

```bash
git remote add origin https://github.com/YOUR_USER/mafia-online.git
git add -A
git commit -m "feat: credential login, logout, duplicate-session handling"
git push -u origin main
```

---

## Step 5 — Deploy backend (Render)

### Option A — Blueprint (recommended)

1. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
2. Connect your GitHub repo
3. Render reads `render.yaml` and creates `mafia-api`
4. Set environment variables in the Render dashboard:

| Key | Value |
|-----|-------|
| `CLIENT_ORIGIN` | Your Vercel URL from Step 6 (e.g. `https://mafia-online.vercel.app`) |
| `USER_CREDENTIALS` | Same JSON as production passwords (use **strong** passwords) |

5. Deploy → note the service URL (e.g. `https://mafia-api.onrender.com`)
6. Verify: `https://mafia-api.onrender.com/health` → `{"ok":true}`

### Option B — Manual web service

| Setting | Value |
|---------|-------|
| Build Command | `npm install && npm run build -w server` |
| Start Command | `npm run start -w server` |
| Health Check | `/health` |

Same env vars as above.

---

## Step 6 — Deploy frontend (Vercel)

1. [Vercel Dashboard](https://vercel.com) → **Add New Project** → import GitHub repo
2. **Root Directory:** `client`
3. Framework: **Vite** (uses `client/vercel.json`)
4. Environment variables:

| Key | Value |
|-----|-------|
| `VITE_SERVER_URL` | Render URL from Step 5 (e.g. `https://mafia-api.onrender.com`) |
| `VITE_TURN_URL` | `turn:openrelay.metered.ca:443` |
| `VITE_TURN_USERNAME` | `openrelayproject` |
| `VITE_TURN_CREDENTIAL` | `openrelayproject` |

5. Deploy → note the Vercel URL (e.g. `https://mafia-online.vercel.app`)

### Cross-link origins

Go back to **Render** and set `CLIENT_ORIGIN` to your exact Vercel URL (`https://…`, no trailing slash). Redeploy if needed.

Open: `https://YOUR-VERCEL-URL.vercel.app/?room=main`

---

## Step 7 — GitHub Actions auto-deploy

Add these secrets in **GitHub → repo → Settings → Secrets and variables → Actions**:

| Secret | Where to get it |
|--------|-----------------|
| `RENDER_DEPLOY_HOOK` | Render → mafia-api → Settings → Deploy Hook → copy URL |
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Vercel project → Settings → General |
| `VERCEL_PROJECT_ID` | Vercel project → Settings → General |
| `VITE_SERVER_URL` | Your Render API URL |

After secrets are set, every push to `main` triggers:
- Render redeploy (via deploy hook)
- Vercel production build + deploy

---

## Step 8 — Post-deploy checklist

- [ ] `https://YOUR-API.onrender.com/health` returns `{"ok":true}`
- [ ] Sign-in works with production passwords
- [ ] Shindy can start a game with 4+ players
- [ ] Detective gets private night investigation result
- [ ] Room link + QR works on mobile
- [ ] Voice chat works in lobby (mic permission)
- [ ] Log out returns to sign-in screen
- [ ] Duplicate login kicks the old session

---

## Features included

| Feature | Status |
|---------|--------|
| Username + password login | Done |
| Log out button | Done |
| Duplicate-session kick | Done |
| TURN server for voice (Metered Open Relay) | Pre-configured |
| Session reconnect | Done |
| PWA install | Done |
| CI build on push | Done |
| Auto-deploy workflow | Ready (needs secrets from Step 7) |

---

## Troubleshooting

**Server won't start — `USER_CREDENTIALS` error**  
Ensure all 7 usernames are in the JSON and the value is valid JSON (double quotes).

**Login fails in production**  
Check `USER_CREDENTIALS` on Render matches what you're typing. Passwords are case-sensitive.

**WebSocket errors**  
Ensure `VITE_SERVER_URL` on Vercel points to Render (not localhost) and `CLIENT_ORIGIN` on Render matches Vercel exactly.

**Voice chat silent behind NAT**  
TURN vars must be set on Vercel. Defaults use Metered Open Relay (free tier limits apply).

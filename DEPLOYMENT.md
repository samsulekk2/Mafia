# Deployment Guide

## Architecture

```
Vercel (client)  ──WebSocket/HTTP──►  Render (server)
     │                                      │
  React PWA                           GameEngine + Socket.IO
```

---

## Environment variables

### Render (backend)

| Key | Example | Required |
|-----|---------|----------|
| `CLIENT_ORIGIN` | `https://mafia-online.vercel.app` | Yes |
| `USER_CREDENTIALS` | `{"Shindy":"…","Ali":"…",…}` | Yes |
| `DEFAULT_ROOM_ID` | `main` | No (default: main) |
| `PORT` | *(auto-set by Render)* | Auto |

### Vercel (frontend)

| Key | Example | Required |
|-----|---------|----------|
| `VITE_SERVER_URL` | `https://mafia-api.onrender.com` | Yes |
| `VITE_TURN_URL` | `turn:openrelay.metered.ca:443` | Recommended |
| `VITE_TURN_USERNAME` | `openrelayproject` | With TURN |
| `VITE_TURN_CREDENTIAL` | `openrelayproject` | With TURN |

---

## Backend — Render

### Option 1: Blueprint (`render.yaml`)

1. Upload your code to Render.
2. Render → **New** → **Blueprint** → connect your repository.
3. Set `CLIENT_ORIGIN` and `USER_CREDENTIALS`.
4. Deploy. Note the service URL.

### Option 2: Manual web service

1. Render → **New** → **Web Service**
2. Connect your repository
3. Configure settings:

| Setting | Value |
|---------|-------|
| Build Command | `npm install && npm run build -w server` |
| Start Command | `npm run start -w server` |
| Health Check | `/health` |

4. Set environment variables in Render dashboard
5. Deploy

### Docker

```bash
docker build -f server/Dockerfile -t mafia-server .
docker run -p 3001:3001 \
  -e CLIENT_ORIGIN=http://localhost:5173 \
  -e USER_CREDENTIALS='{"Shindy":"pass",...}' \
  mafia-server
```

---

## Frontend — Vercel

1. Vercel → **Add New** → **Project**
2. Import your repository
3. **Root Directory:** `client`
4. Framework: **Vite**
5. Set env vars (see table above).
6. Deploy.

### Alternative: Netlify

1. Netlify → **Add new site** → **Import an existing project**
2. Connect your repository
3. Configure settings:

| Setting | Value |
|---------|-------|
| Base directory | `client` |
| Build command | `npm run build` |
| Publish directory | `client/dist` |

4. Set env vars in Netlify dashboard
5. Deploy

---

## Room invite links

```
https://your-app.vercel.app/?room=main
https://your-app.vercel.app/?room=friday-night
```

---

## Post-deploy checklist

- [ ] `CLIENT_ORIGIN` matches exact Vercel URL (https, no trailing slash)
- [ ] `VITE_SERVER_URL` points to Render backend
- [ ] `USER_CREDENTIALS` set on Render with strong production passwords
- [ ] `/health` returns `{"ok":true}`
- [ ] Credential login works for all whitelisted users
- [ ] Shindy can start a game
- [ ] Detective gets private night investigation result
- [ ] Room link + QR copy works on mobile
- [ ] Log out and duplicate-session kick work

---

## Local production test

```bash
# Terminal 1 — server
cd server && npm run build && CLIENT_ORIGIN=http://localhost:4173 npm start

# Terminal 2 — client
cd client && npm run build && npm run preview
```

Open http://localhost:4173/?room=main

---

## Voice chat in production

WebRTC uses STUN + TURN. TURN is pre-configured via Metered Open Relay in `client/.env.example`.

For higher reliability at scale, consider:
- [Metered TURN](https://www.metered.ca/tools/openrelay/) (paid tier)
- Twilio TURN
- Self-hosted coturn

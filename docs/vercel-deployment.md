# Deploying JSDR Share on Vercel

JSDR Share supports two deployment models on Vercel:

---

## Model 1: All-In-One Vercel Deployment (Default & Zero Setup)

In this model, Vercel hosts both the **Vite/React frontend** and the **Serverless API functions** (`api/index.ts`).

### How It Works:
- `vercel.json` automatically routes `/api/*` requests to the Serverless Function in `api/index.ts`.
- Non-API routes serve the optimized Vite single-page application (`dist/index.html`).
- File uploads are securely handled in the `/tmp` directory (`os.tmpdir()`), and sessions are persisted to disk to survive container reuse.
- Real-time synchronization uses an automatic **Dual-Layer Engine**: WebSockets when available + periodic HTTP REST fallback (`POST /api/transfer/:sessionId/action` and `GET /api/transfer/:identifier/info`).

### Setup Steps:
1. Import this repository into Vercel.
2. Leave all settings at defaults (Framework: Vite, Build Command: `npm run build`, Output Directory: `dist`).
3. Deploy! No environment variables required for basic zero-setup transfers.

---

## Model 2: Split Frontend on Vercel + Dedicated WebSocket Backend (High Volume)

If you plan to handle high-frequency concurrent file transfers with long-lived WebSocket connections, you can deploy the backend (`server/server.ts`) to a persistent Node.js host (Render, Railway, Fly.io, or VPS) and point Vercel to it.

### Required Environment Variable on Vercel:
Set this variable in your Vercel Project Settings (Production, Preview, Development):

```text
VITE_API_URL=https://your-public-backend.example.com
```

- Use the backend's public HTTPS origin without a trailing slash.
- The frontend will automatically use this origin for `/api/transfer` REST endpoints and real-time Socket.IO connections.

---

## Vercel Configuration Summary (`vercel.json`)

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/index.ts"
    },
    {
      "source": "/((?!api/).*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```
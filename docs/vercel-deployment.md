# Deploying JSDR Share on Vercel

## Deployment model

Vercel hosts the Vite/React frontend for this project. The Express and Socket.IO
backend must run on a public, long-running Node.js host because the current
transfer service keeps active sessions in memory and writes uploaded chunks to
local disk.

Do not move the current `server/` implementation into a Vercel Function unless
the session and upload storage are first migrated to durable shared services.
Function instances are independent and their local filesystem is temporary.

## Vercel project settings

The repository includes `vercel.json` with these production settings:

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- SPA fallback: all browser routes serve `index.html`
- Immutable caching for Vite's hashed `/assets/` files

## Required environment variable

Set this Vercel environment variable for Production, Preview, and Development:

```text
VITE_API_URL=https://your-public-backend.example.com
```

Use the public HTTPS origin of the deployed Express/Socket.IO backend. Do not
use `localhost` or a private development URL. The value should not end with a
slash.

The frontend uses this origin for both:

- REST requests under `/api/transfer`
- Socket.IO connections

The backend must allow the Vercel project origin through its CORS policy and
must expose Socket.IO at its default `/socket.io` path.

## Deploy

1. Import the repository into Vercel.
2. Keep the repository root as the project root.
3. Add `VITE_API_URL` in the Vercel project environment settings.
4. Deploy with the repository's default build settings.
5. Test creating a transfer, uploading a file, joining with the PIN or QR
   code, and downloading the file from a second device.

The frontend-only Vercel deployment and the backend deployment are separate
services. The Vercel build is expected to succeed without bundling the
Express/Socket.IO process into a serverless function.
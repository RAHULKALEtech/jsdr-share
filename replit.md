# JSDR Share on Replit

## Running the app

The Replit preview uses the `Start application` workflow. It builds the Vite
frontend and then starts the existing Express/Socket.IO server on port 5000:

```bash
npm run build && npx tsx server/server.ts
```

The Express server serves the generated `dist/` frontend and handles the
`/api` and Socket.IO routes from the same origin.

For local development, install dependencies with `npm install`, run the
backend with `npm run server`, and use `npm run dev` for the Vite development
server on port 3000.
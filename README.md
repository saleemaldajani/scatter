# Scatter

A tiny click-to-chase ball game. Click anywhere and nearby balls bolt away — they also drift clear of your cursor if you get too close.

## Play locally

From this directory:

```bash
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

Or with Node:

```bash
npm install
npm start
```

## Deploy on Railway

This repo is ready to deploy as-is.

1. Create a new project on [Railway](https://railway.app)
2. Deploy from GitHub and select `saleemaldajani/scatter`
3. Railway builds the `Dockerfile` (Caddy serves the static files on `$PORT`)

Health check path: `/health`

If you prefer Nixpacks instead of Docker, Railway can run `npm start` via `package.json` (uses `serve`).

## Controls

| Action | Effect |
|--------|--------|
| Click / tap | Balls near the pointer scatter |
| Move cursor | Nearby balls gently flee |
| Reset | Respawn balls and clear the flee counter |

## Stack

Static HTML/CSS/Canvas JS. Served with [Caddy](https://caddyserver.com/) on Railway.

## License

[MIT](LICENSE)

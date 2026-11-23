# Tartaros Online

## Features
- Three.js open-world RPG with Android Capacitor build.
- Realtime WebSocket presence through `server.mjs`.
- Nearby online players are rendered as full 3D characters with username, level and HP bar.
- Normal attacks and class skills do not damage other players outside a duel.
- Nearby players can send duel requests.
- Duel request can be accepted or rejected.
- A rejected requester is blocked from requesting the same player again for 1 hour.
- Accepted duels move both players to the Colosseum arena at `(0, 380)`.
- Active duel players receive a red aura and are server-locked to the arena.
- Duel attacks and skills are calculated by the server and damage only the duel opponent.
- The loser dies and loses 1% of their gold; the winner receives that exact 1% transfer.
- After the duel, both players are returned to Astarot city center.
- Enemy difficulty tiers:
  - Normal: 50% requested tier chance, multiplier 1x.
  - Hard: 35%, multiplier 2.5x to stats and XP/gold rewards.
  - Nightmare: 7%, multiplier 5x to stats and XP/gold rewards.
  - Hell: 1%, multiplier 8x to stats and XP/gold rewards.
  - The supplied percentages total 93%; the remaining 7% is kept at the normal 1x tier so the fixed world spawn count is not reduced.
- Item drop chance is intentionally not multiplied by difficulty.
- Wolf and ice-wolf packs spawn in groups of 3-5.

## Render
Set `VITE_GAME_SERVER_URL` in GitHub Actions secrets to the Render service URL, for example:
`https://tartaros-online.onrender.com`

Render provides `DATABASE_URL` automatically through `render.yaml` for the PostgreSQL service.

## Android
The GitHub workflow builds the web game, creates Capacitor Android, applies the Tartaros launcher icon, forces landscape orientation and immersive fullscreen, then uploads the debug APK as `Tartaros-APK`.

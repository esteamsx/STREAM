# Whot integration plan

Add Whot as a focused fourth game in the existing ES Teams game architecture. The implementation preserves the current transparent aurora/glass visual language and uses the existing Chess-owned SSE presence stream, with a Whot-specific authoritative room hub modeled after Ludo's 2–4 player tables.

## Scope

- Computer mode with a complete Whot deck, legal matching, special cards, draw/turn effects, Whot suit selection, and win state.
- Online rooms for 2–4 authenticated players, room creation/joining, host start, server-authoritative hidden hands, turn broadcasts, reconnect state, online status, and room code display.
- Reuse existing secure-origin/auth/rate-limit conventions and voice/ICE endpoints; keep the voice control capability-compatible rather than changing shared voice infrastructure.
- Responsive mobile/desktop layout using existing game tokens and transparent cards.

## Project structure

- `services/whot-mp.js`: Whot deck/rules/authoritative room state.
- `routes/whot.js`: authenticated API and SSE integration.
- `views/whot.js`: page shell and scoped styling.
- `public/whot/whot-page.js`: computer mode, online UI, reconnect rendering.
- `server.js`: route/view registration only.

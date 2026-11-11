# Emmy API integration

Provider docs: https://apis.emmyhenztech.name.ng/docs (endpoint list: /api/list).
Contract: `GET /api/<name>?param=value` returns `{ status, creator, took, result }`; errors carry `error` and a real HTTP status; premium endpoints take an `X-Api-Key` header.

## Configuration (environment variables, all optional)
| Variable | Purpose |
|---|---|
| `EMMY_API_KEY` | Sent as the `X-Api-Key` header when set. Not needed for the free endpoints used here. |
| `EMMY_API_BASE_URL` | Override the base URL (default `https://apis.emmyhenztech.name.ng`). |

No key or secret is stored in the code.

## Existing integrations (same routes, same response shapes)
| Feature | Emmy providers, in order | Last-resort fallback (your existing code) |
|---|---|---|
| MP3 (`/api/v1/dev/mp3`, `/api/free/song/*`) | savetube, ytshortdown, clipto | direct ytdl-core |
| MP4 (`/api/v1/dev/mp4`, `/api/free/youtube/video`) | savetube, ytshortdown, clipto, ssvid, ytdl-rapidapi | direct ytdl-core |
| TikTok download | savetik, vibetik-tiktokdl, tiktokdl-rapidapi, aio-rapidapi | tikwm |
| TikTok profile | tiktok-inspector | tikwm |
| Instagram download | snapsave, igexport, aio-rapidapi | page scrape |
| Facebook download | fbdown | page scrape |

## New Developer API endpoints (16)
ytdl, spotify, soundcloud, pinterest (downloaders); websearch, imagesearch, ytsearch, tiktoksearch,
pinterestsearch, githubsearch, ytchannel, livescore, forecast, pastquestions (lookup); tts (tools); ytsummary (AI).
They use the existing API-key auth, plan limits, promo handling and the signed `/api/v1/dev/dl/:token` proxy,
and appear automatically on the Developer API page (cards, docs, Try it).

## Verify on your server
    node --test                         # unit/integration tests (mock Emmy server)
    node scripts/emmy-live-check.mjs    # calls every provider live and reports what works

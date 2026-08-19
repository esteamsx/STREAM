# ES TEAMS command bridge

`command-bridge.js` is not part of this repository's own runtime, and it is not installed by
hand into the bot template either. `bot-service/bots.js` copies it into every deployment's
working directory as `esteams-command-bridge.cjs` and launches that file instead of `index.js`.

## Why it exists

The bot service already talks to each running bot, but only in one direction: it reads
`proc.stdout` and parses log lines. Nothing writes to `proc.stdin`, so the site can deploy,
stop, restart and delete a bot but cannot ask a running bot to do anything.

The bridge adds the missing inbound direction without changing `paskito002/ES_TEAMS-V1`.

## How it attaches

`ES_TEAMS-V1` is CommonJS and its `index.js` starts the socket with:

```js
const { default: makeWASocket, ... } = require("@whiskeysockets/baileys");
```

Because that is a plain CommonJS require, the bridge can require the same module first, replace
`default` and `makeWASocket` with a wrapper, and then require `index.js`. Node serves the cached
module object, so the bot builds its socket through the wrapper and the bridge keeps a reference
to the live socket. The bot's own code is untouched and never knows.

If Baileys cannot be patched, the bridge logs a warning and the bot still boots normally.

## What it can do

One command, `chreact`. Given a channel post link it resolves the channel through
`sock.newsletterMetadata("invite", code)` and reacts with `sock.newsletterReactMessage`. Both
calls already exist in the bot, which uses them to react to channel posts automatically. The
bridge does not send messages and has no other commands.

## Protocol

Service to bot, one JSON object per line on stdin:

```json
{"esteams":"cmd","id":"K3nQ...","cmd":"chreact","link":"https://whatsapp.com/channel/XXXX/5745","emoji":null}
```

Bot to service, one line on stdout:

```
ES_TEAMS_CMD_RESULT {"id":"K3nQ...","ok":true,"emoji":"🙏"}
ES_TEAMS_CMD_RESULT {"id":"K3nQ...","ok":false,"error":"..."}
```

Lines that are not valid JSON, or that lack `esteams: "cmd"`, are ignored. Result lines are
consumed by the bot service and never appear in the deployment logs.

## Rollout

Existing deployments keep running their old working directory until they are restarted. The
bridge is written in at materialize time, so a bot picks it up on its next restart or redeploy.

import test from "node:test";
import assert from "node:assert/strict";
import { buildCodingPayload, createCoarenaRequest, readCoarenaStream } from "../services/coarena-coding.js";
import { renderCoding } from "../views/coding.js";

test("COD/NG builds an Anthropic-compatible Coarena payload without exposing credentials", () => {
  const image = Buffer.from("image-bytes").toString("base64");
  const payload = buildCodingPayload({
    messages: [{ role: "user", content: "Review this image and file." }],
    attachments: [{ name: "screen.png", mime: "image/png", data: image }],
  });
  assert.equal(payload.model, "claude-fable-5-2");
  assert.equal(payload.stream, true);
  assert.equal(payload.messages[0].content[0].type, "text");
  assert.equal(payload.messages[0].content[1].type, "image");
  assert.equal(JSON.stringify(payload).includes("COARENA_API_KEY"), false);
});

test("COD/NG uses the configured Anthropic base URL and server-side token", async () => {
  const oldBase = process.env.ANTHROPIC_BASE_URL;
  const oldToken = process.env.COARENA_API_KEY;
  const oldFetch = global.fetch;
  let request;
  try {
    process.env.ANTHROPIC_BASE_URL = "https://coarena.test/api";
    process.env.COARENA_API_KEY = "test-secret";
    global.fetch = async (url, options) => {
      request = { url, options };
      return new Response("data: {\"type\":\"message_stop\"}\n\ndata: [DONE]\n\n", { status: 200, headers: { "content-type": "text/event-stream" } });
    };
    await createCoarenaRequest(buildCodingPayload({ messages: [{ role: "user", content: "hello" }] }));
    assert.equal(request.url, "https://coarena.test/api/v1/messages");
    assert.equal(request.options.headers["x-api-key"], "test-secret");
    assert.equal(request.options.headers.authorization, "Bearer test-secret");
    assert.equal(request.options.body.includes("test-secret"), false);
  } finally {
    global.fetch = oldFetch;
    if (oldBase == null) delete process.env.ANTHROPIC_BASE_URL; else process.env.ANTHROPIC_BASE_URL = oldBase;
    if (oldToken == null) delete process.env.COARENA_API_KEY; else process.env.COARENA_API_KEY = oldToken;
  }
});

test("COD/NG view is premium-branded and keeps secrets out of frontend HTML", () => {
  const html = renderCoding({ devToolsBlock: "", protectionCSS: "" });
  assert.match(html, /COD\/NG/);
  assert.match(html, /\/api\/coding\/chat/);
  assert.match(html, /SpeechRecognition|webkitSpeechRecognition/);
  assert.match(html, /Download/);
  assert.doesNotMatch(html, /COARENA_API_KEY|ANTHROPIC_AUTH_TOKEN|test-secret/);
});

test("COD/NG reads streamed Anthropic text deltas correctly", async () => {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('data: {"type":"content_block_delta","delta":{"text":"Hello "}}\n\ndata: {"type":"content_block_delta","delta":{"text":"world"}}\n\ndata: {"type":"message_stop"}\n\n'));
      controller.close();
    },
  });
  const events = [];
  for await (const event of readCoarenaStream(new Response(body))) events.push(event);
  assert.deepEqual(events, [{ type: "text", text: "Hello " }, { type: "text", text: "world" }, { type: "done" }]);
});

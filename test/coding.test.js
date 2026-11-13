import test from "node:test";
import assert from "node:assert/strict";
import { buildCodingPayload, createCoarenaRequest, readCoarenaStream } from "../services/coarena-coding.js";
import { renderCoding } from "../views/coding.js";

test("COD/NG builds an Anthropic-compatible Coarena payload without exposing credentials", () => {
  const image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  const previousScanner = process.env.CODING_CLAMSCAN_BIN;
  process.env.CODING_CLAMSCAN_BIN = "/bin/true";
  try {
    const payload = buildCodingPayload({
      messages: [{ role: "user", content: "Review this image and file." }],
      attachments: [{ name: "screen.png", mime: "image/png", data: image }],
    });
    assert.equal(payload.model, "claude-fable-5-2");
    assert.equal(payload.stream, true);
    assert.equal(payload.messages[0].content[0].type, "text");
    assert.equal(payload.messages[0].content[1].type, "image");
    assert.equal(JSON.stringify(payload).includes("COARENA_API_KEY"), false);
  } finally {
    if (previousScanner == null) delete process.env.CODING_CLAMSCAN_BIN; else process.env.CODING_CLAMSCAN_BIN = previousScanner;
  }
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

test("COD/NG rejects archives and executable signatures before forwarding", () => {
  const zip = Buffer.from("PK\x03\x04fake archive").toString("base64");
  assert.throws(() => buildCodingPayload({ messages: [{ role: "user", content: "inspect" }], attachments: [{ name: "payload.zip", mime: "application/zip", data: zip }] }), /Archives and executable files|Archive or executable/);
  const exe = Buffer.concat([Buffer.from("MZ"), Buffer.alloc(32)]).toString("base64");
  assert.throws(() => buildCodingPayload({ messages: [{ role: "user", content: "inspect" }], attachments: [{ name: "payload.txt", mime: "text/plain", data: exe }] }), /Archive or executable/);
});

test("COD/NG rejects more than 30 MB of attachments", () => {
  const chunk = Buffer.alloc(10 * 1024 * 1024, 65).toString("base64");
  assert.throws(() => buildCodingPayload({ messages: [{ role: "user", content: "inspect" }], attachments: [
    { name: "one.txt", mime: "text/plain", data: chunk },
    { name: "two.txt", mime: "text/plain", data: chunk },
    { name: "three.txt", mime: "text/plain", data: chunk },
    { name: "four.txt", mime: "text/plain", data: chunk },
  ] }), /under 30 MB/);
});

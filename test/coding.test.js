import test from "node:test";
import assert from "node:assert/strict";
import { deflateRawSync } from "node:zlib";
import { buildCodingPayload, createCoarenaRequest, readCoarenaStream } from "../services/coarena-coding.js";
import { renderCoding } from "../views/coding.js";

function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function makeZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, source] of Object.entries(entries)) {
    const nameBytes = Buffer.from(name, "utf8");
    const data = Buffer.from(source);
    const packed = deflateRawSync(data);
    const checksum = crc32(data);
    const local = Buffer.alloc(30 + nameBytes.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    nameBytes.copy(local, 30);
    locals.push(local, packed);

    const central = Buffer.alloc(46 + nameBytes.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(packed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    nameBytes.copy(central, 46);
    centrals.push(central);
    offset += local.length + packed.length;
  }
  const centralDirectory = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(Object.keys(entries).length, 8);
  eocd.writeUInt16LE(Object.keys(entries).length, 10);
  eocd.writeUInt32LE(centralDirectory.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralDirectory, eocd]);
}

function payloadWith(name, mime, bytes) {
  return buildCodingPayload({
    messages: [{ role: "user", content: "Review my code." }],
    attachments: [{ name, mime, data: Buffer.from(bytes).toString("base64") }],
  });
}

test("COD\\NG builds an Anthropic-compatible Coarena payload without exposing credentials", () => {
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
    assert.match(payload.system, /complete contents \(not a diff\)/);
    assert.match(payload.system, /```js filename=src\/app\.js/);
    assert.match(payload.system, /```text filename=image-prompt\.txt/);
    assert.equal(JSON.stringify(payload).includes("COARENA_API_KEY"), false);
  } finally {
    if (previousScanner == null) delete process.env.CODING_CLAMSCAN_BIN; else process.env.CODING_CLAMSCAN_BIN = previousScanner;
  }
});

test("COD\\NG uses the configured Anthropic base URL and server-side token", async () => {
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

test("COD\\NG view has the history drawer, scrollable conversation, and no frontend secrets", () => {
  const html = renderCoding({ devToolsBlock: "", protectionCSS: "" });
  assert.match(html, /COD\\\\NG/);
  assert.match(html, /codingHistoryToggle/);
  assert.match(html, /codingHistoryList/);
  assert.match(html, /codingRenameOverlay/);
  assert.match(html, /codingDeleteOverlay/);
  assert.match(html, /Rename chat/);
  assert.match(html, /Delete conversation/);
  assert.match(html, /historyAction\('Rename chat'/);
  assert.match(html, /historyAction\('Delete conversation'/);
  assert.doesNotMatch(html, /window\.prompt/);
  assert.match(html, /rememberChatState/);
  assert.match(html, /filesByChat/);
  assert.match(html, /draft:String\(chat\.draft\|\|''\)/);
  assert.match(html, /aria-pressed="false"/);
  assert.match(html, /speaking=false/);
  assert.match(html, /codingSpeakSlash/);
  assert.match(html, /class="coding-speak-slash" d="M4 4L20 20"/);
  assert.match(html, /\.coding-speak-muted \.coding-speak-slash\{display:block\}/);
  assert.match(html, /thinking-word/);
  assert.match(html, /thinkingShimmer/);
  assert.match(html, /window\.scrollTo/);
  assert.doesNotMatch(html, /scrollIntoView/);
  assert.match(html, /\/api\/coding\/chat/);
  assert.match(html, /SpeechRecognition|webkitSpeechRecognition/);
  assert.match(html, /Download/);
  assert.match(html, /thinking-indicator/);
  assert.match(html, /thinkingPulse/);
  assert.match(html, /a\.download=safeName/);
  assert.match(html, /overflow-y:auto/);
  assert.doesNotMatch(html, /COARENA_API_KEY|ANTHROPIC_AUTH_TOKEN|test-secret/);
});

test("COD\\NG reads streamed Anthropic text deltas correctly", async () => {
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

test("COD\\NG accepts a source-code ZIP and sends readable files to the coding model", () => {
  const previousScanner = process.env.CODING_CLAMSCAN_BIN;
  process.env.CODING_CLAMSCAN_BIN = "/bin/true";
  try {
    const zip = makeZip({ "src/app.js": "export const answer = 42;", "styles/site.css": "body { color: teal; }", "index.html": "<main>Hello</main>", Dockerfile: "FROM node:22" });
    const payload = payloadWith("project.zip", "application/zip", zip);
    const content = payload.messages[0].content;
    assert.equal(content[1].type, "text");
    assert.match(content[1].text, /src\/app\.js/);
    assert.match(content[1].text, /export const answer = 42/);
    assert.match(content[1].text, /styles\/site\.css/);
    assert.match(content[1].text, /index\.html/);
    assert.match(content[1].text, /Dockerfile/);
  } finally {
    if (previousScanner == null) delete process.env.CODING_CLAMSCAN_BIN; else process.env.CODING_CLAMSCAN_BIN = previousScanner;
  }
});

test("COD\\NG accepts common standalone source files and rejects executable extensions/signatures", () => {
  const previousScanner = process.env.CODING_CLAMSCAN_BIN;
  process.env.CODING_CLAMSCAN_BIN = "/bin/true";
  try {
    for (const [name, mime, source] of [
      ["app.js", "application/javascript", "console.log('ok')"],
      ["site.css", "text/css", "body { color: blue }"],
      ["index.html", "text/html", "<main>Hi</main>"],
    ]) {
      const payload = payloadWith(name, mime, source);
      assert.match(payload.messages[0].content[1].text, new RegExp(name.replace(".", "\\.")));
    }
    assert.throws(() => payloadWith("payload.exe", "application/octet-stream", Buffer.from("MZ")), /Executable|executable/);
    assert.throws(() => payloadWith("payload.txt", "text/plain", Buffer.concat([Buffer.from("MZ"), Buffer.alloc(32)])), /Executable|executable/);
    assert.throws(() => payloadWith("script.vbe", "text/plain", "malicious"), /Executable|executable/);
    assert.throws(() => payloadWith("spoofed.png", "image/png", "this is plain text"), /type does not match/);
    assert.throws(() => payloadWith("opaque.txt", "text/plain", Buffer.from([0xff, 0xfe, 0xfd, 0xfc])), /readable source|UTF-8/i);
    const badZip = makeZip({ "payload.exe": "not really a binary" });
    assert.throws(() => payloadWith("project.zip", "application/zip", badZip), /executable or blocked file type/);
    const badScriptZip = makeZip({ "payload.vbe": "not really a binary", "src/app.js": "export const ok = true;" });
    assert.throws(() => payloadWith("project.zip", "application/zip", badScriptZip), /executable or blocked file type/);
  } finally {
    if (previousScanner == null) delete process.env.CODING_CLAMSCAN_BIN; else process.env.CODING_CLAMSCAN_BIN = previousScanner;
  }
});

test("COD\\NG rejects ZIP path traversal and malformed archives", () => {
  const previousScanner = process.env.CODING_CLAMSCAN_BIN;
  process.env.CODING_CLAMSCAN_BIN = "/bin/true";
  try {
    assert.throws(() => payloadWith("project.zip", "application/zip", makeZip({ "../outside.js": "alert(1)" })), /unsafe file path/);
    assert.throws(() => payloadWith("project.zip", "application/zip", Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("fake archive")])), /invalid|unsupported|directory/i);
    const inconsistent = makeZip({ "src/app.js": "export const ok = true;" });
    inconsistent.writeUInt16LE(0, 8);
    assert.throws(() => payloadWith("project.zip", "application/zip", inconsistent), /entry headers do not match/);
    const corruptChecksum = makeZip({ "src/app.js": "export const ok = true;" });
    const eocd = corruptChecksum.length - 22;
    const centralOffset = corruptChecksum.readUInt32LE(eocd + 16);
    corruptChecksum.writeUInt32LE(123, 14);
    corruptChecksum.writeUInt32LE(123, centralOffset + 16);
    assert.throws(() => payloadWith("project.zip", "application/zip", corruptChecksum), /checksum/);
  } finally {
    if (previousScanner == null) delete process.env.CODING_CLAMSCAN_BIN; else process.env.CODING_CLAMSCAN_BIN = previousScanner;
  }
});

test("COD\\NG rejects more than 30 MB of attachments", () => {
  const chunk = Buffer.alloc(10 * 1024 * 1024, 65).toString("base64");
  assert.throws(() => buildCodingPayload({ messages: [{ role: "user", content: "inspect" }], attachments: [
    { name: "one.txt", mime: "text/plain", data: chunk },
    { name: "two.txt", mime: "text/plain", data: chunk },
    { name: "three.txt", mime: "text/plain", data: chunk },
    { name: "four.txt", mime: "text/plain", data: chunk },
  ] }), /under 30 MB/);
});

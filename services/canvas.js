import sharp from "sharp";

function escapeXml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
}

function wrapText(text, maxCharsPerLine) {
  const words = String(text || "").split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    if ((line + " " + word).trim().length > maxCharsPerLine && line) {
      lines.push(line.trim());
      line = word;
    } else {
      line = (line + " " + word).trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function fetchImageBuffer(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw Object.assign(new Error(`Could not download that image (source responded ${res.status}).`), { status: 400 });
  return Buffer.from(await res.arrayBuffer());
}


export async function makeFakeWhatsAppCard({ name, number, status }) {
  const w = 720, h = 300;
  const initial = escapeXml((String(name || "Unknown")[0] || "?").toUpperCase());
  const svg = `
    <svg width="${w}" height="${h}">
      <rect x="0" y="0" width="${w}" height="${h}" fill="#0b141a"/>
      <rect x="0" y="0" width="${w}" height="70" fill="#1f2c34"/>
      <text x="24" y="45" font-size="24" font-family="Helvetica, Arial, sans-serif" fill="#e9edef" font-weight="bold">WhatsApp</text>
      <circle cx="90" cy="170" r="60" fill="#00a884"/>
      <text x="90" y="185" font-size="48" font-family="Helvetica, Arial, sans-serif" fill="white" text-anchor="middle" font-weight="bold">${initial}</text>
      <text x="180" y="150" font-size="30" font-family="Helvetica, Arial, sans-serif" fill="#e9edef" font-weight="bold">${escapeXml(name || "Unknown")}</text>
      <text x="180" y="185" font-size="20" font-family="Helvetica, Arial, sans-serif" fill="#8696a0">${escapeXml(number || "")}</text>
      ${status ? `<text x="180" y="220" font-size="18" font-family="Helvetica, Arial, sans-serif" fill="#8696a0" font-style="italic">${escapeXml(status)}</text>` : ""}
    </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function makeCaptionMeme(imageUrl, text) {
  const imgBuffer = await fetchImageBuffer(imageUrl);
  const base = sharp(imgBuffer).resize(720, null, { withoutEnlargement: true });
  const meta = await base.metadata();
  const w = meta.width || 720;
  const barHeight = 90;
  const lines = wrapText(text, 30).slice(0, 2);
  const svg = `
    <svg width="${w}" height="${barHeight}">
      <rect x="0" y="0" width="${w}" height="${barHeight}" fill="black"/>
      ${lines.map((line, i) => `<text x="${w / 2}" y="${40 + i * 32}" font-size="28" font-family="Impact, Arial, sans-serif" fill="white" text-anchor="middle" font-weight="bold">${escapeXml(line.toUpperCase())}</text>`).join("")}
    </svg>`;
  const barBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return base.composite([{ input: barBuffer, gravity: "south" }]).png().toBuffer();
}

export async function makeBookPage(text) {
  const w = 800, h = 1000;
  const lines = wrapText(text, 55).slice(0, 40);
  const svg = `
    <svg width="${w}" height="${h}">
      <rect x="0" y="0" width="${w}" height="${h}" fill="#f5ecd7"/>
      <rect x="30" y="30" width="${w - 60}" height="${h - 60}" fill="none" stroke="#c9b98a" stroke-width="2"/>
      ${lines.map((line, i) => `<text x="60" y="${90 + i * 28}" font-size="20" font-family="Georgia, serif" fill="#2b2214">${escapeXml(line)}</text>`).join("")}
    </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

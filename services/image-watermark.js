import sharp from "sharp";

export async function watermarkImageBuffer(inputBuffer, text) {
  const image = sharp(inputBuffer);
  const metadata = await image.metadata();
  const width = metadata.width || 800;
  const height = metadata.height || 600;
  const fontSize = Math.max(14, Math.round(width * 0.035));
  const label = String(text || "ES TEAMS TV")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <style>
      .wmShadow { fill: rgba(0,0,0,0.55); font-size: ${fontSize}px; font-family: sans-serif; font-weight: 700; }
      .wmText { fill: rgba(255,255,255,0.88); font-size: ${fontSize}px; font-family: sans-serif; font-weight: 700; }
    </style>
    <text x="51%" y="${height - Math.round(fontSize * 0.8)}" text-anchor="middle" class="wmShadow">${label}</text>
    <text x="50%" y="${height - Math.round(fontSize * 0.8) - 2}" text-anchor="middle" class="wmText">${label}</text>
  </svg>`;
  const composited = image.composite([{ input: Buffer.from(svg), gravity: "south" }]);
  const format = metadata.format === "png" || metadata.format === "webp" ? metadata.format : "jpeg";
  if (format === "jpeg") return composited.jpeg({ quality: 88 }).toBuffer();
  if (format === "png") return composited.png().toBuffer();
  return composited.webp({ quality: 88 }).toBuffer();
}

import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { MOVIE_WATERMARK } from "../config/movie-watermark.js";

ffmpeg.setFfmpegPath(ffmpegPath);

const AUDIO_WATERMARK_ASSET = path.join(process.cwd(), "assets", "audio-watermark.mp3");
const MAX_WATERMARK_BYTES = 60 * 1024 * 1024;

function tempFile(ext) {
  return path.join(os.tmpdir(), `estv-wm-${crypto.randomBytes(8).toString("hex")}.${ext}`);
}

async function cleanup(...paths) {
  for (const p of paths) {
    fs.promises.unlink(p).catch(() => {});
  }
}

export function canWatermarkSize(byteLength) {
  return byteLength > 0 && byteLength <= MAX_WATERMARK_BYTES;
}

function ffmpegText(value) {
  return String(value).replace(/[^A-Za-z0-9 .:/_-]/g, "");
}

function escapeXml(value) {
  return String(value).replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char]));
}

export async function watermarkMovieFile(inputPath, outputPath) {
  const tempPath = `${outputPath}.tmp-${crypto.randomBytes(6).toString("hex")}.mp4`;
  const imagePath = tempFile("png");
  const stat = await fs.promises.stat(inputPath);
  if (!canWatermarkSize(stat.size)) throw new Error("Movie is outside the watermark processing size limit.");
  const name = escapeXml(ffmpegText(MOVIE_WATERMARK.name));
  const link = escapeXml(ffmpegText(MOVIE_WATERMARK.link.replace(/^https?:\/\//i, "")));
  const watermarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="82" viewBox="0 0 700 82"><g opacity="${MOVIE_WATERMARK.opacity}" fill="none" stroke="white" stroke-width="3"><path d="M21 7 5 14v10c0 19 7 32 16 36 9-4 16-17 16-36V14Z"/><path d="m14 27 5 5 9-11" stroke-width="3.5"/></g><text x="50" y="33" fill="white" font-family="monospace" font-size="25" font-weight="600" letter-spacing="2">${name}</text><text x="50" y="62" fill="white" font-family="monospace" font-size="14">${link}</text></svg>`;
  try {
    await sharp(Buffer.from(watermarkSvg)).png().toFile(imagePath);
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .input(imagePath)
        .inputOptions(["-loop 1"])
        .complexFilter(["[1:v][0:v]scale2ref=w=main_w*0.42:h=-1[wm][base]", "[base][wm]overlay=x=W-w-(W/90):y=(H-h)/2[vout]"])
        .outputOptions(["-map", "[vout]", "-map", "0:a?", "-c:a", "copy", "-preset", "veryfast", "-shortest", "-movflags", "+faststart"])
        .on("end", resolve)
        .on("error", reject)
        .save(tempPath);
    });
    await fs.promises.rename(tempPath, outputPath);
  } finally {
    await cleanup(tempPath, imagePath);
  }
}

export async function watermarkVideoBuffer(inputBuffer, text) {
  if (!canWatermarkSize(inputBuffer.length)) return inputBuffer;
  const inPath = tempFile("mp4");
  const outPath = tempFile("mp4");
  const label = String(text || "ES TEAMS TV").replace(/[\\':%]/g, "");
  await fs.promises.writeFile(inPath, inputBuffer);
  try {
    await new Promise((resolve, reject) => {
      ffmpeg(inPath)
        .videoFilters([
          {
            filter: "drawtext",
            options: {
              text: label,
              fontcolor: "white@0.85",
              fontsize: "h/18",
              x: "(w-text_w)/2",
              y: "h-(text_h*2)",
              box: 1,
              boxcolor: "black@0.45",
              boxborderw: 8,
            },
          },
        ])
        .outputOptions(["-c:a copy", "-preset veryfast", "-movflags +faststart"])
        .on("end", resolve)
        .on("error", reject)
        .save(outPath);
    });
    return await fs.promises.readFile(outPath);
  } catch (err) {
    return inputBuffer;
  } finally {
    cleanup(inPath, outPath);
  }
}

export async function watermarkAudioBuffer(inputBuffer, text) {
  if (!canWatermarkSize(inputBuffer.length)) return inputBuffer;
  if (!fs.existsSync(AUDIO_WATERMARK_ASSET)) return inputBuffer;
  const inPath = tempFile("mp3");
  const outPath = tempFile("mp3");
  await fs.promises.writeFile(inPath, inputBuffer);
  try {
    await new Promise((resolve, reject) => {
      ffmpeg(inPath)
        .input(AUDIO_WATERMARK_ASSET)
        .complexFilter([
          "[1:a]volume=0.35[wm]",
          "[0:a][wm]amix=inputs=2:duration=first:dropout_transition=0[aout]",
        ])
        .outputOptions(["-map", "[aout]", "-preset veryfast"])
        .on("end", resolve)
        .on("error", reject)
        .save(outPath);
    });
    return await fs.promises.readFile(outPath);
  } catch (err) {
    return inputBuffer;
  } finally {
    cleanup(inPath, outPath);
  }
}

import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";

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

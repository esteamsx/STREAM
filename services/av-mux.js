import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";

ffmpeg.setFfmpegPath(ffmpegPath);

const MAX_MUX_BYTES = 80 * 1024 * 1024;

function tempFile(ext) {
  return path.join(os.tmpdir(), `estv-mux-${crypto.randomBytes(8).toString("hex")}.${ext}`);
}

async function cleanup(...paths) {
  for (const p of paths) {
    fs.promises.unlink(p).catch(() => {});
  }
}

async function downloadToFile(url, destPath, maxBytes) {
  const res = await fetch(url);
  if (!res.ok) {
    throw Object.assign(new Error(`Upstream returned ${res.status} while fetching a stream.`), { status: 502 });
  }
  const cl = Number(res.headers.get("content-length") || 0);
  if (cl > maxBytes) {
    throw Object.assign(new Error("Stream is too large to mux."), { status: 413 });
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > maxBytes) {
    throw Object.assign(new Error("Stream is too large to mux."), { status: 413 });
  }
  await fs.promises.writeFile(destPath, buffer);
}

export async function muxRemoteAvToBuffer(videoUrl, audioUrl) {
  const videoPath = tempFile("mp4");
  const audioPath = tempFile("m4a");
  const outPath = tempFile("mp4");

  try {
    await Promise.all([
      downloadToFile(videoUrl, videoPath, MAX_MUX_BYTES),
      downloadToFile(audioUrl, audioPath, MAX_MUX_BYTES),
    ]);

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(videoPath)
        .input(audioPath)
        .outputOptions(["-c:v copy", "-c:a aac", "-map 0:v:0", "-map 1:a:0", "-shortest", "-movflags +faststart"])
        .on("end", resolve)
        .on("error", reject)
        .save(outPath);
    });

    return await fs.promises.readFile(outPath);
  } finally {
    await cleanup(videoPath, audioPath, outPath);
  }
}

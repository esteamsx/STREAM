import { Innertube, Platform } from "youtubei.js";
import vm from "node:vm";

function nodeJsEvaluator(data, env) {
  const argNames = Object.keys(env || {});
  const argsLiteral = Object.values(env || {}).map((v) => JSON.stringify(v)).join(",");
  const wrapped = `(function(${argNames.join(",")}) {\n${data.output}\n})(${argsLiteral})`;
  return vm.runInNewContext(wrapped, Object.create(null), { timeout: 5000 });
}
Platform.shim.eval = nodeJsEvaluator;

let clientPromise = null;

function getClient() {
  if (!clientPromise) {
    clientPromise = Innertube.create({ generate_session_locally: true }).catch((err) => {
      clientPromise = null;
      console.error("youtube client init error:", err.message);
      throw Object.assign(new Error("Could not reach YouTube right now."), { status: 502 });
    });
  }
  return clientPromise;
}

function pickBestVideo(results) {
  const videos = (results && results.videos) || [];
  for (const v of videos) {
    const id = v.video_id || v.id;
    if (id && !v.is_live && !v.is_upcoming) return v;
  }
  return null;
}

export async function searchYoutubeVideo(query) {
  const yt = await getClient();
  let results;
  try {
    results = await yt.search(query, { type: "video" });
  } catch (err) {
    console.error("youtube search error:", err.message);
    throw Object.assign(new Error("Could not search YouTube right now."), { status: 502 });
  }
  const video = pickBestVideo(results);
  if (!video) throw Object.assign(new Error("No results found for that search."), { status: 404 });
  return {
    videoId: video.video_id || video.id,
    title: video.title ? video.title.toString() : "Untitled",
    author: video.author ? video.author.name : "",
    durationSeconds: video.duration ? video.duration.seconds : 0,
  };
}

export async function getYoutubeDownload(videoId, { audioOnly = false } = {}) {
  const yt = await getClient();
  let info;
  try {
    info = await yt.getBasicInfo(videoId);
  } catch (err) {
    console.error("youtube getBasicInfo error:", err.message);
    throw Object.assign(new Error("Could not load that video."), { status: 502 });
  }

  let format;
  try {
    format = audioOnly
      ? info.chooseFormat({ type: "audio", quality: "best", format: "any" })
      : info.chooseFormat({ type: "video+audio", quality: "best", format: "mp4" });
  } catch {
    format = null;
  }
  if (!format) throw Object.assign(new Error("No downloadable format found for that video."), { status: 502 });

  let url;
  try {
    url = await format.decipher(info.actions.session.player);
  } catch (err) {
    console.error("youtube decipher error:", err.message);
    throw Object.assign(new Error("Could not resolve a playable link for that video."), { status: 502 });
  }
  if (!url) {
    console.error("youtube decipher error: empty url after decipher");
    throw Object.assign(new Error("Could not resolve a playable link for that video."), { status: 502 });
  }

  return {
    url,
    mimeType: (format.mime_type || "").split(";")[0].trim(),
    contentLength: format.content_length ? Number(format.content_length) : null,
  };
}

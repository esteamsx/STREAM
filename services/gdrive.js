export async function getGoogleDriveFileInfo(inputUrl) {
  const idMatch = String(inputUrl || "").match(/\/d\/([a-zA-Z0-9_-]+)/) || String(inputUrl || "").match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (!idMatch) throw Object.assign(new Error("Could not find a file ID in that link."), { status: 400 });
  const fileId = idMatch[1];
  const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

  let head = await fetch(directUrl, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(15000) });
  const contentType = head.headers.get("content-type") || "";
  if (contentType.includes("text/html")) {
    const html = await head.text();
    const confirmMatch = html.match(/confirm=([0-9A-Za-z_]+)/);
    if (confirmMatch) {
      head = await fetch(`${directUrl}&confirm=${confirmMatch[1]}`, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(15000) });
    }
  }

  const disposition = head.headers.get("content-disposition") || "";
  const nameMatch = disposition.match(/filename="?([^";]+)"?/);
  return {
    name: nameMatch ? decodeURIComponent(nameMatch[1]) : "Unknown",
    size: head.headers.get("content-length") || "Unknown",
    mimeType: head.headers.get("content-type") || "Unknown",
    downloadLink: head.url,
    thumbnail: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
  };
}

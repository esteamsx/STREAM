import dns from "node:dns";
import ipaddr from "ipaddr.js";

const dnsLookup = dns.promises.lookup;

export async function assertPublicHttpUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl || ""));
  } catch {
    throw Object.assign(new Error("Invalid URL."), { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw Object.assign(new Error("URL must be http or https."), { status: 400 });
  }
  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw Object.assign(new Error("That URL is not allowed."), { status: 400 });
  }

  let addresses;
  try {
    addresses = await dnsLookup(hostname, { all: true, verbatim: true });
  } catch {
    throw Object.assign(new Error("Could not resolve that URL's host."), { status: 400 });
  }
  if (!addresses.length) {
    throw Object.assign(new Error("Could not resolve that URL's host."), { status: 400 });
  }
  for (const { address } of addresses) {
    let range;
    try {
      range = ipaddr.process(address).range();
    } catch {
      throw Object.assign(new Error("That URL is not allowed."), { status: 400 });
    }
    if (range !== "unicast") {
      throw Object.assign(new Error("That URL is not allowed."), { status: 400 });
    }
  }
  return parsed;
}

function normalize(ip) {
  return String(ip || "").replace(/^::ffff:/, "").replace(/^\[|\]$/g, "").trim();
}

export function isPrivateIp(ip) {
  if (!ip) return true;
  if (ip === "::1" || ip === "127.0.0.1" || ip === "localhost") return true;
  if (/^(10\.|192\.168\.|169\.254\.)/.test(ip)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip)) return true; // carrier-grade NAT range
  if (/^(fc|fd|fe80)/i.test(ip)) return true;
  return false;
}

export function clientIp(req) {
  const h = req.headers || {};
  const direct = normalize(h["cf-connecting-ip"] || h["true-client-ip"]);
  if (direct && !isPrivateIp(direct)) return direct;
  const chain = String(h["x-forwarded-for"] || "").split(",").map(normalize).filter(Boolean);
  for (const ip of chain) if (!isPrivateIp(ip)) return ip; // left-most public address = the original client
  return normalize(req.ip);
}

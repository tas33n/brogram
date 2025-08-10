const fs = require("fs");
const path = require("path");
function findLatestJson(dir) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  if (!files.length) return null;
  const withTime = files.map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }));
  withTime.sort((a, b) => b.t - a.t);
  return path.join(dir, withTime[0].f);
}
function normalizeCookie(c) {
  const sameSite = typeof c.sameSite === "string" ? c.sameSite : c.same_site;
  const expires = typeof c.expires === "number"
    ? Math.floor(c.expires)
    : typeof c.expirationDate === "number"
    ? Math.floor(c.expirationDate)
    : -1;
  const domain = c.domain || (c.hostOnly ? c.hostOnly : "");
  const pathv = c.path || "/";
  const value = String(c.value || "");
  return {
    name: c.name,
    value,
    domain,
    path: pathv,
    expires,
    httpOnly: !!c.httpOnly,
    secure: !!c.secure,
    sameSite: sameSite && typeof sameSite === "string" ? sameSite : undefined
  };
}
async function loadLatestCookies(dir) {
  const file = findLatestJson(dir);
  if (!file) return [];
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const arr = Array.isArray(raw) ? raw : Array.isArray(raw.cookies) ? raw.cookies : [];
  return arr.filter((x) => x && x.name && (x.domain || x.url)).map(normalizeCookie);
}
module.exports = { loadLatestCookies };

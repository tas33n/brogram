const path = require("path");
require("dotenv").config();

function asBool(v, def = false) {
  if (v === undefined || v === null || v === "") return def;
  const s = String(v).toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}
function pickSurface(v) {
  const s = String(v || "home").toLowerCase();
  return s === "reels" ? "reels" : "home";
}

const scrollDelayMs =
  process.env.SCROLL_DELAY_MS != null
    ? Number(process.env.SCROLL_DELAY_MS)
    : process.env.SCROLL_DELAY_SEC != null
    ? Math.round(Number(process.env.SCROLL_DELAY_SEC) * 1000)
    : 600;

module.exports = {
  headless: asBool(process.env.HEADLESS, false),
  port: Number(process.env.PORT || 3000),
  cookiesDir: path.resolve(process.env.COOKIES_DIR || "./cookies"),
  actions: (process.env.ACTIONS || "scroll,like,comment")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  shareTo: process.env.SHARE_TO || "",
  commentText: process.env.COMMENT_TEXT || "🔥",
  logLevel: process.env.LOG_LEVEL || "info",

  followUsers: (process.env.FOLLOW_USERS || "").split(",").map(s => s.trim()).filter(Boolean),
  unfollowUsers: (process.env.UNFOLLOW_USERS || "").split(",").map(s => s.trim()).filter(Boolean),
  openProfiles: (process.env.OPEN_PROFILES || "").split(",").map(s => s.trim()).filter(Boolean),
  dmTo: (process.env.DM_TO || "").split(",").map(s => s.trim()).filter(Boolean),
  dmText: process.env.DM_TEXT || "👋",

  // unified surface (start + lock)
  surface: pickSurface(process.env.SURFACE),

  // scrolling
  scrollDelayMs,
  scrollStep: Number(process.env.SCROLL_STEP || 1200)
};

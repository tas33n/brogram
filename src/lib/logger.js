const fs = require("fs");
const path = require("path");
function ts() {
  return new Date().toISOString();
}
function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}
function createLogger(level = "info") {
  const dir = path.resolve("./logs");
  ensureDir(dir);
  const file = path.join(dir, `${new Date().toISOString().slice(0, 10)}.log`);
  const stream = fs.createWriteStream(file, { flags: "a" });
  const levels = ["fatal", "error", "warn", "info", "debug", "trace"];
  const idx = levels.indexOf(level);
  function write(kind, msg, meta) {
    const line = JSON.stringify({ t: ts(), level: kind, msg, meta: meta || null }) + "\n";
    stream.write(line);
    const parts = ["[", kind.toUpperCase(), "]", msg];
    if (meta && Object.keys(meta).length) parts.push(JSON.stringify(meta));
    console.log(parts.join(" "));
  }
  const api = {
    level,
    fatal: (m, o) => idx >= 0 && write("fatal", m, o),
    error: (m, o) => idx >= 1 && write("error", m, o),
    warn: (m, o) => idx >= 2 && write("warn", m, o),
    info: (m, o) => idx >= 3 && write("info", m, o),
    debug: (m, o) => idx >= 4 && write("debug", m, o),
    trace: (m, o) => idx >= 5 && write("trace", m, o),
    child: (ctx = {}) => ({
      fatal: (m, o) => api.fatal(m, { ...ctx, ...(o || {}) }),
      error: (m, o) => api.error(m, { ...ctx, ...(o || {}) }),
      warn: (m, o) => api.warn(m, { ...ctx, ...(o || {}) }),
      info: (m, o) => api.info(m, { ...ctx, ...(o || {}) }),
      debug: (m, o) => api.debug(m, { ...ctx, ...(o || {}) }),
      trace: (m, o) => api.trace(m, { ...ctx, ...(o || {}) })
    })
  };
  return api;
}
module.exports = { createLogger };

// src/server.js
const express = require("express");
const os = require("os");

function ensureServer(port, logger, getState = () => ({})) {
  const app = express();
  const boot = Date.now();

  app.get("/", (_, res) =>
    res.json({
      name: "BroGram",
      slogan: "IG antics, bro-grade"
    })
  );

  app.get("/uptime", (_, res) =>
    res.json({
      uptimeSec: Math.round((Date.now() - boot) / 1000),
      load: os.loadavg()
    })
  );

  app.get("/health", (_, res) => res.json({ ...getState() }));

  const srv = app.listen(port, () => logger.info("http_listening", { port }));
  return srv;
}

module.exports = { ensureServer };

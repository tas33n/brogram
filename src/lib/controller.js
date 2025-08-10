const readline = require("readline");
const {
  scrollToNextActionBar,
  scrollToPrevActionBar,
  centerNearestActionBar
} = require("./autoScroll");

function showHelp(logger, ctrl) {
  const lines = [
    "",
    "Console controls:",
    "  s            toggle auto-scroll",
    "  j / space    next post (center action bar)",
    "  k            previous post (center action bar)",
    "  g            re-center nearest action bar",
    "  + / =        faster scroll (shorter delay)",
    "  -            slower scroll (longer delay)",
    "  l            toggle LIKE actions",
    "  c            toggle COMMENT actions",
    "  r            open Reels",
    "  h            show help",
    "  q / Ctrl+C   quit",
    "",
    `State: scroll=${ctrl.scroll.enabled ? "on" : "off"} delay=${ctrl.scroll.delay}ms like=${ctrl.likeEnabled ? "on" : "off"} comment=${ctrl.commentEnabled ? "on" : "off"}`
  ];
  lines.forEach(l => logger.info(l));
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function setupConsoleController(page, ctrl, logger) {
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    try { process.stdin.setRawMode(true); } catch {}
  }

  let quitOnce = false;
  const requestQuit = (reason) => {
    if (quitOnce) return;
    quitOnce = true;
    logger.info(reason);
    process.emit("SIGINT");
  };

  const onKey = async (str, key = {}) => {
    try {
      const k = (key.name || str || "").toLowerCase();

      if (key.ctrl && k === "c") {
        requestQuit("shutdown_requested_ctrl_c");
        return;
      }

      switch (k) {
        case "h":
          showHelp(logger, ctrl);
          break;
        case "q":
          requestQuit("shutdown_requested_q");
          break;
        case "s":
          ctrl.scroll.enabled = !ctrl.scroll.enabled;
          logger.info("scroll_toggle", { enabled: ctrl.scroll.enabled, delay: ctrl.scroll.delay });
          break;
        case "j":
        case "space":
          try {
            await scrollToNextActionBar(page);
            logger.info("manual_next_post");
          } catch (e) {
            logger.error("manual_next_error", { error: String(e) });
          }
          break;
        case "k":
          try {
            await scrollToPrevActionBar(page);
            logger.info("manual_prev_post");
          } catch (e) {
            logger.error("manual_prev_error", { error: String(e) });
          }
          break;
        case "g":
          try {
            await centerNearestActionBar(page);
            logger.info("manual_center_post");
          } catch (e) {
            logger.error("manual_center_error", { error: String(e) });
          }
          break;
        case "+":
        case "=":
          ctrl.scroll.delay = clamp(ctrl.scroll.delay - 100, 100, 5000);
          logger.info("scroll_speed_faster", { delay: ctrl.scroll.delay });
          break;
        case "-":
          ctrl.scroll.delay = clamp(ctrl.scroll.delay + 100, 100, 5000);
          logger.info("scroll_speed_slower", { delay: ctrl.scroll.delay });
          break;
        case "l":
          ctrl.likeEnabled = !ctrl.likeEnabled;
          logger.info("like_toggle", { enabled: ctrl.likeEnabled });
          break;
        case "c":
          ctrl.commentEnabled = !ctrl.commentEnabled;
          logger.info("comment_toggle", { enabled: ctrl.commentEnabled });
          break;
        case "r":
          page.goto("https://www.instagram.com/reels/", { waitUntil: "networkidle2" })
            .then(() => logger.info("reels_opened_by_hotkey"))
            .catch((e) => logger.error("reels_hotkey_error", { error: String(e) }));
          break;
        default:
          break;
      }
    } catch (e) {
      logger.error("console_controller_error", { error: String(e) });
    }
  };

  process.stdin.on("keypress", onKey);
  showHelp(logger, ctrl);

  const close = () => {
    try { process.stdin.setRawMode && process.stdin.setRawMode(false); } catch {}
    try { process.stdin.removeListener("keypress", onKey); } catch {}
  };

  return { close };
}

module.exports = { setupConsoleController };

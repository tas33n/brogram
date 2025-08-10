const { createLogger } = require("./lib/logger");
const { printBanner } = require("./lib/banner");
const { ensureServer } = require("./server");
const { loadLatestCookies } = require("./lib/cookies");
const { verifyAuth } = require("./lib/auth");
const { setupConsoleController } = require("./lib/controller");
const { startAutoScroll } = require("./lib/autoScroll");
const cfg = require("./config");

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const logger = createLogger(cfg.logLevel);
  printBanner();

  const state = {
    startedAt: Date.now(),
    auth: { ok: false, cookieValid: false, webValid: false, username: null },
    enforce: { requireAuth: true }
  };

  let serverRef = null;
  let browserRef = null;
  let controllerRef = null;

  let shuttingDown = false;
  let alive = true;

  const closeServer = (srv) =>
    new Promise((resolve) => (srv ? srv.close(() => resolve()) : resolve()));

  const onSignal = (sig) => {
    if (shuttingDown) return;
    shuttingDown = true;
    alive = false;
    logger.info("shutdown_signal", { sig });
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);

  serverRef = ensureServer(cfg.port, logger, () => ({ ...state }));

  const getPuppeteer = require("./lib/puppeteer");
  const puppeteer = await getPuppeteer();
  const browser = await puppeteer.launch({
    headless: cfg.headless,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  browserRef = browser;
  logger.info("browser_launched", { headless: cfg.headless });

  // Single-window policy
  const context = browser.defaultBrowserContext();
  let pages = await browser.pages();
  let page = pages[0] || await browser.newPage();
  if (pages.length > 1) {
    for (const p of pages.slice(1)) { try { await p.close(); } catch {} }
    logger.info("closed_extra_pages", { count: pages.length - 1 });
  } else if (!pages.length) {
    logger.info("opened_initial_page");
  } else {
    logger.info("reusing_default_page");
  }

  // Live controller + default infinite auto-scroll
  const control = {
    likeEnabled: true,
    commentEnabled: true,
    surface: cfg.surface, // "home" or "reels"
    scroll: { enabled: true, step: cfg.scrollStep, delay: cfg.scrollDelayMs, hold: false, holds: 0 }
  };
  controllerRef = setupConsoleController(page, control, logger);

  const cookies = await loadLatestCookies(cfg.cookiesDir);
  if (cookies.length) {
    await context.setCookie(...cookies);
    logger.info("cookies_loaded", { count: cookies.length });
  } else {
    logger.warn("cookies_missing");
  }

  const auth = await verifyAuth(context, page, logger);
  state.auth = auth;
  if (!auth.ok) {
    logger.error("auth_failed_mandatory", auth);
    const isDev = String(process.env.NODE_ENV).toLowerCase() === "development";
    if (isDev) {
      logger.warn("auth_failed_debug_wait", { waitMs: 60000 });
      await sleep(60000);
    }
    try { controllerRef && controllerRef.close(); } catch {}
    try { browserRef && (await browserRef.close()); } catch {}
    try { await closeServer(serverRef); } catch {}
    process.exit(1);
    return;
  }

  // Navigate to chosen surface and kick off infinite auto-scroll
  const startUrl = control.surface === "reels"
    ? "https://www.instagram.com/reels/"
    : "https://www.instagram.com/";
  await page.goto(startUrl, { waitUntil: "networkidle2" });
  logger.info("instagram_opened", { user: auth.username || null, surface: control.surface });
  startAutoScroll(page, control, logger);

  // Task loop: run ACTIONS forever until Ctrl+C
  const createRunner = require("./tasks");
  const runner = createRunner(logger);

  const TASK_CYCLE_SLEEP_MS = 3000; 
  while (alive) {
    try {
      await runner.run(page, cfg.actions, {
        logger,
        shareTo: cfg.shareTo,
        commentText: cfg.commentText,
        followUsers: cfg.followUsers,
        unfollowUsers: cfg.unfollowUsers,
        openProfiles: cfg.openProfiles,
        dmTo: cfg.dmTo,
        dmText: cfg.dmText,
        control,
        scrollDelayMs: cfg.scrollDelayMs
      });
    } catch (e) {
      logger.error("task_cycle_error", { error: String(e && e.stack || e) });
    }
    await sleep(TASK_CYCLE_SLEEP_MS);
  }

  // Graceful cleanup once a shutdown signal is received
  logger.info("shutdown_cleanup_begin");
  try { controllerRef && controllerRef.close(); } catch {}
  try { await browserRef.close(); } catch {}
  try { await closeServer(serverRef); } catch {}
  logger.info("shutdown_complete");
  process.exit(0);
})();

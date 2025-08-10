module.exports = {
  name: "reels",
  run: async (page, ctx) => {
    try {
      // Respect unified surface lock
      if (ctx.control && ctx.control.surface === "home") {
        ctx.logger.info("reels_skipped_surface_locked_home");
        return;
      }
      await page.goto("https://www.instagram.com/reels/", { waitUntil: "networkidle2" });
      await new Promise((r) => setTimeout(r, 1000));
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press("ArrowDown");
        await new Promise((r) => setTimeout(r, 1000));
      }
      ctx.logger.info("reels_browsed");
    } catch (e) {
      ctx.logger.error("reels_error", { error: String(e && e.stack || e) });
    }
  }
};

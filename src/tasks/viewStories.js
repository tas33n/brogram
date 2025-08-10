module.exports = {
  name: "viewStories",
  run: async (page, ctx) => {
    await page.goto("https://www.instagram.com/", { waitUntil: "networkidle2" });
    const ring = page.locator('a[href^="/stories/"]').first();
    try { await ring.wait({ timeout: 4000 }); await ring.click(); } catch {}
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1500));
      await page.keyboard.press("ArrowRight");
    }
    ctx.logger.info("stories_viewed");
  }
};

module.exports = {
  name: "explore",
  run: async (page, ctx) => {
    await page.goto("https://www.instagram.com/explore/", { waitUntil: "networkidle2" });
    for (let i = 0; i < 30; i++) {
      await page.evaluate(y => window.scrollBy(0, y), 900);
      await new Promise(r => setTimeout(r, 300));
    }
    ctx.logger.info("explore_scrolled");
  }
};

const toList = (process.env.DM_TO || "").split(",").map(s => s.trim()).filter(Boolean);
const text = (process.env.DM_TEXT || "👋").toString();
module.exports = {
  name: "dm",
  run: async (page, ctx) => {
    const users = Array.isArray(ctx.dmTo) ? ctx.dmTo : toList;
    const body = ctx.dmText || text;
    if (!users.length) { ctx.logger.warn("dm_no_recipients"); return; }
    await page.goto("https://www.instagram.com/direct/inbox/", { waitUntil: "networkidle2" });
    for (const u of users) {
      try {
        const newMsgBtn = page.locator('text/New message').first();
        try { await newMsgBtn.wait({ timeout: 4000 }); await newMsgBtn.click(); } catch {}
        const input = page.locator('input[placeholder*="Search" i]').first();
        await input.wait({ timeout: 5000 });
        await input.fill(u);
        await new Promise(r => setTimeout(r, 800));
        await page.keyboard.press("Enter");
        const nextBtn = page.locator('text/Next').first();
        await nextBtn.click({ timeout: 5000 });
        const editor = page.locator('textarea').first();
        await editor.wait({ timeout: 5000 });
        await editor.fill(body);
        await page.keyboard.press("Enter");
        ctx.logger.info("dm_sent", { to: u });
        await new Promise(r => setTimeout(r, 800));
      } catch (e) {
        ctx.logger.error("dm_error", { to: u, error: String(e) });
      }
    }
  }
};

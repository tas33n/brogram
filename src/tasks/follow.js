const cfgUsers = (process.env.FOLLOW_USERS || "").split(",").map(s => s.trim()).filter(Boolean);
async function goToProfile(page, user) {
  await page.goto(`https://www.instagram.com/${user}/`, { waitUntil: "networkidle2" });
  await new Promise(r => setTimeout(r, 800));
}
async function clickFollow(page) {
  const selectors = [
    'button[aria-label="Follow"]',
    'xpath//button[normalize-space()="Follow"]',
    'aria/Follow[name="Follow"]'
  ];
  for (const s of selectors) {
    const loc = page.locator(s).first();
    try { await loc.wait({ timeout: 2000 }); await loc.click(); return true; } catch {}
  }
  return false;
}
module.exports = {
  name: "follow",
  run: async (page, ctx) => {
    const users = Array.isArray(ctx.followUsers) ? ctx.followUsers : cfgUsers;
    if (!users.length) {
      ctx.logger.warn("follow_no_targets");
      return;
    }
    for (const u of users) {
      try {
        await goToProfile(page, u);
        const ok = await clickFollow(page);
        ctx.logger.info(ok ? "followed" : "follow_failed", { user: u });
        await new Promise(r => setTimeout(r, 600));
      } catch (e) {
        ctx.logger.error("follow_error", { user: u, error: String(e) });
      }
    }
  }
};

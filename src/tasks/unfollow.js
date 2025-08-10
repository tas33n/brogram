const cfgUsers = (process.env.UNFOLLOW_USERS || "").split(",").map(s => s.trim()).filter(Boolean);
async function goToProfile(page, user) {
  await page.goto(`https://www.instagram.com/${user}/`, { waitUntil: "networkidle2" });
  await new Promise(r => setTimeout(r, 800));
}
async function clickUnfollow(page) {
  const followingBtn = page.locator('button[aria-label="Following"]').first();
  try { await followingBtn.wait({ timeout: 2500 }); await followingBtn.click(); } catch { return false; }
  const confirm = page.locator('text/Unfollow').first();
  try { await confirm.wait({ timeout: 2500 }); await confirm.click(); return true; } catch { return false; }
}
module.exports = {
  name: "unfollow",
  run: async (page, ctx) => {
    const users = Array.isArray(ctx.unfollowUsers) ? ctx.unfollowUsers : cfgUsers;
    if (!users.length) {
      ctx.logger.warn("unfollow_no_targets");
      return;
    }
    for (const u of users) {
      try {
        await goToProfile(page, u);
        const ok = await clickUnfollow(page);
        ctx.logger.info(ok ? "unfollowed" : "unfollow_failed", { user: u });
        await new Promise(r => setTimeout(r, 600));
      } catch (e) {
        ctx.logger.error("unfollow_error", { user: u, error: String(e) });
      }
    }
  }
};

const envList = (process.env.OPEN_PROFILES || "").split(",").map(s => s.trim()).filter(Boolean);
module.exports = {
  name: "openProfile",
  run: async (page, ctx) => {
    const users = (Array.isArray(ctx.openProfiles) && ctx.openProfiles.length) ? ctx.openProfiles : envList;
    if (!users.length) { ctx.logger.warn("openProfile_no_targets"); return; }
    for (const u of users) {
      await page.goto(`https://www.instagram.com/${u}/`, { waitUntil: "networkidle2" });
      ctx.logger.info("profile_opened", { user: u });
      await new Promise(r => setTimeout(r, 800));
    }
  }
};

async function clickSave(page) {
  const sels = [
    'button[aria-label="Save"]',
    'xpath//button[.//svg[@aria-label="Save"]]',
    'aria/Save[name="Save"]'
  ];
  for (const s of sels) {
    const loc = page.locator(s).first();
    try { await loc.wait({ timeout: 2000 }); await loc.click(); return true; } catch {}
  }
  return false;
}
module.exports = {
  name: "save",
  run: async (page, ctx) => {
    const ok = await clickSave(page);
    ctx.logger.info(ok ? "saved_post" : "save_not_found");
  }
};

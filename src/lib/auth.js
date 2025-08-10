async function verifyAuth(context, page, logger) {
  const cookies = await context.cookies();
  const now = Math.floor(Date.now() / 1000);
  const sess = cookies.find(c => c.name === "sessionid" && (c.domain || "").includes("instagram."));
  const cookieValid = !!sess && (sess.expires === -1 || sess.expires > now);
  let webValid = false;
  let username = null;
  const res = await page.goto("https://www.instagram.com/accounts/edit/", { waitUntil: "networkidle2" });
  const redirected = page.url().includes("/accounts/login");
  if (res && res.status() === 200 && !redirected) {
    webValid = true;
    try {
      username = await page.evaluate(() => {
        const el = document.querySelector('a[href*="/accounts/edit/"], a[href*="/accounts/password/change/"]');
        const profileLink = document.querySelector('a[href^="/accounts/"]');
        return (profileLink && profileLink.textContent) ? profileLink.textContent.trim() : null;
      });
    } catch {}
  }
  const ok = cookieValid && webValid;
  logger.info("auth_check", { cookieValid, webValid, ok, username });
  return { ok, cookieValid, webValid, username };
}
module.exports = { verifyAuth };

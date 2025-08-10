async function loadPuppeteer() {
  const m = await import("puppeteer");
  return m.default || m;
}
module.exports = loadPuppeteer;

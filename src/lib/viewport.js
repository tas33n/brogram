/**
 * Returns an ElementHandle for the clickable ancestor of the SVG icon with the given aria-label,
 * chosen by proximity to the viewport vertical center. Returns null if nothing suitable is visible.
 */
async function pickActionButton(page, ariaLabel) {
  const handle = await page.evaluateHandle((label) => {
    const midY = window.innerHeight / 2;
    const svgs = Array.from(document.querySelectorAll(`svg[aria-label="${label}"]`));

    const toClickable = (svg) =>
      svg.closest('button, div[role="button"]') ||
      svg.closest('div[role="button"]') ||
      svg.closest('div') ||
      svg;

    let best = null;
    let bestScore = Infinity;

    for (const svg of svgs) {
      const target = toClickable(svg);
      if (!target) continue;

      const r = target.getBoundingClientRect();
      const visible =
        r.bottom > 0 &&
        r.top < window.innerHeight &&
        r.right > 0 &&
        r.left < window.innerWidth;
      if (!visible) continue;

      const center = (r.top + r.bottom) / 2;
      const spansCenter = r.top <= midY && r.bottom >= midY;
      const dy = Math.abs(center - midY);
      const score = spansCenter ? dy : dy + 10000; // prefer those spanning the center

      if (score < bestScore) {
        bestScore = score;
        best = target;
      }
    }
    return best || null;
  }, ariaLabel);

  const el = handle && handle.asElement ? handle.asElement() : null;
  if (!el && handle) {
    try { await handle.dispose(); } catch {}
  }
  return el;
}

module.exports = { pickActionButton };

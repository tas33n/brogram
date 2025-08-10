async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/** Center the action bar (like button’s clickable ancestor) nearest viewport center. */
async function centerNearestActionBar(page) {
  return page.evaluate(() => {
    const midY = window.innerHeight / 2;
    const svgs = Array.from(document.querySelectorAll('svg[aria-label="Like"]'));
    const toBar = (svg) =>
      svg.closest('button, div[role="button"]') ||
      svg.closest('div[role="button"]') ||
      svg.closest('div') || svg;

    let bestY = null;
    let bestDy = Infinity;

    for (const svg of svgs) {
      const bar = toBar(svg);
      if (!bar) continue;
      const r = bar.getBoundingClientRect();
      const visible = r.bottom > 0 && r.top < innerHeight;
      if (!visible) continue;
      const center = (r.top + r.bottom) / 2;
      const dy = Math.abs(center - midY);
      if (dy < bestDy) { bestDy = dy; bestY = window.scrollY + (center - midY); }
    }
    if (bestY != null) {
      window.scrollTo({ top: bestY, left: 0, behavior: "instant" });
      return true;
    }
    return false;
  });
}

/** Scroll so the next action bar *below* center is centered. Falls back to pixel scroll. */
async function scrollToNextActionBar(page) {
  return page.evaluate(() => {
    const midY = window.innerHeight / 2 + 10;
    const svgs = Array.from(document.querySelectorAll('svg[aria-label="Like"]'));
    const toBar = (svg) =>
      svg.closest('button, div[role="button"]') ||
      svg.closest('div[role="button"]') ||
      svg.closest('div') || svg;

    let bestY = null;
    let bestDy = Infinity;

    for (const svg of svgs) {
      const bar = toBar(svg);
      if (!bar) continue;
      const r = bar.getBoundingClientRect();
      const visible = r.bottom > 0 && r.top < innerHeight;
      if (!visible) continue;
      const center = (r.top + r.bottom) / 2;
      const dy = center - midY; // positive if below center
      if (dy > 8 && dy < bestDy) {
        bestDy = dy;
        bestY = window.scrollY + (center - window.innerHeight / 2);
      }
    }
    if (bestY != null) {
      window.scrollTo({ top: bestY, left: 0, behavior: "instant" });
      return true;
    }
    // fallback pixel scroll
    window.scrollBy(0, Math.max(600, Math.round(window.innerHeight * 0.6)));
    return false;
  });
}

/** Scroll so the previous action bar *above* center is centered. */
async function scrollToPrevActionBar(page) {
  return page.evaluate(() => {
    const midY = window.innerHeight / 2 - 10;
    const svgs = Array.from(document.querySelectorAll('svg[aria-label="Like"]'));
    const toBar = (svg) =>
      svg.closest('button, div[role="button"]') ||
      svg.closest('div[role="button"]') ||
      svg.closest('div') || svg;

    let bestY = null;
    let bestDy = -Infinity;

    for (const svg of svgs) {
      const bar = toBar(svg);
      if (!bar) continue;
      const r = bar.getBoundingClientRect();
      const visible = r.bottom > 0 && r.top < innerHeight;
      if (!visible) continue;
      const center = (r.top + r.bottom) / 2;
      const dy = center - midY; // negative if above center
      if (dy < -8 && dy > bestDy) {
        bestDy = dy;
        bestY = window.scrollY + (center - window.innerHeight / 2);
      }
    }
    if (bestY != null) {
      window.scrollTo({ top: bestY, left: 0, behavior: "instant" });
      return true;
    }
    // fallback pixel scroll up
    window.scrollBy(0, -Math.max(600, Math.round(window.innerHeight * 0.6)));
    return false;
  });
}

async function startAutoScroll(page, control, logger) {
  logger.info("auto_scroll_started", { delay: control.scroll.delay, step: control.scroll.step });
  (async () => {
    for (;;) {
      try {
        const sc = control.scroll;
        if (sc.enabled && !sc.hold) {
          await scrollToNextActionBar(page);
        }
        await sleep(sc.delay);
      } catch (e) {
        logger.error("auto_scroll_error", { error: String(e && e.stack || e) });
        await sleep(control.scroll.delay);
      }
    }
  })().catch(() => {});
}

module.exports = {
  startAutoScroll,
  scrollToNextActionBar,
  scrollToPrevActionBar,
  centerNearestActionBar
};

module.exports = {
  name: "like",
  run: async (page, ctx) => {
    const log = ctx.logger || console;
    const ctrl = ctx.control || {};
    if (ctrl.likeEnabled === false) {
      log.info("like_skipped_disabled");
      return;
    }

    // Pick the like button whose box is closest to the viewport vertical center
    async function pickVisibleLikeButton(page) {
      const handle = await page.evaluateHandle(() => {
        const midY = window.innerHeight / 2;
        const svgs = Array.from(document.querySelectorAll('svg[aria-label="Like"]'));

        const toClickable = (svg) => {
          // climb to nearest clickable; then try a couple div ancestors as fallback
          return (
            svg.closest('button, div[role="button"]') ||
            svg.closest('div[role="button"]') ||
            (svg.closest('div') ? svg.closest('div') : svg)
          );
        };

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

          const spansCenter = r.top <= midY && r.bottom >= midY;
          const dy = Math.abs((r.top + r.bottom) / 2 - midY);

          // Favor elements that actually span the center line; penalize others
          const score = spansCenter ? dy : dy + 10_000;

          if (score < bestScore) {
            bestScore = score;
            best = target;
          }
        }
        return best || null;
      });

      const el = handle && handle.asElement ? handle.asElement() : null;
      if (!el) {
        if (handle) await handle.dispose().catch(() => {});
        return null;
      }
      return el;
    }

    async function tryClickElementHandle(el) {
      try {
        // If it's already liked, the button usually contains an Unlike icon
        const unlike = await el.$('svg[aria-label="Unlike"]');
        if (unlike) return { ok: true, already: true };

        await el.evaluate((node) => {
          node.scrollIntoView({ block: "center", inline: "center" });
        });
        await el.click({ delay: 30 }); // small delay makes it more human-like
        return { ok: true, already: false };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    }

    try {
      const btn = await pickVisibleLikeButton(page);
      if (!btn) {
        log.warn("like_button_not_found_in_viewport");
        return;
      }

      const res = await tryClickElementHandle(btn);
      try { await btn.dispose(); } catch {}

      if (!res.ok) {
        log.error("like_click_failed", { error: res.error });
        return;
      }
      if (res.already) {
        log.info("already_liked_visible");
      } else {
        log.info("liked_visible");
      }
    } catch (e) {
      log.error("like_task_error", { error: String(e && e.stack || e) });
    }
  }
};

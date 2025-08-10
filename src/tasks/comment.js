module.exports = {
  name: "comment",
  run: async (page, ctx) => {
    const log = ctx.logger || console;
    const ctrl = ctx.control || {};
    if (ctrl.commentEnabled === false) {
      log.info("comment_skipped_disabled");
      return;
    }

    const text = String(ctx.commentText || "🔥");

    try {
      const SEL =
        'textarea[placeholder*="Add a comment" i], textarea[aria-label*="Add a comment" i]';

      const handle = await page.evaluateHandle((sel) => {
        const midY = window.innerHeight / 2;
        const nodes = Array.from(document.querySelectorAll(sel));

        let best = null;
        let bestScore = Infinity;

        for (const el of nodes) {
          const r = el.getBoundingClientRect();
          const visible = r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight;
          if (!visible) continue;

          const center = (r.top + r.bottom) / 2;
          const score = Math.abs(center - midY);
          if (score < bestScore) {
            bestScore = score;
            best = el;
          }
        }
        return best || null;
      }, SEL);

      const ta = handle && handle.asElement ? handle.asElement() : null;
      if (!ta) {
        if (handle) try { await handle.dispose(); } catch {}
        log.warn("comment_textarea_not_found_in_viewport");
        return;
      }

      // Bring it to center, focus, type, and submit
      await ta.evaluate((el) => el.scrollIntoView({ block: "center", inline: "center" })).catch(() => {});
      await ta.click({ delay: 10 }).catch(() => {});
      // Use keyboard typing to avoid any React-specific composition quirks
      await page.keyboard.type(text, { delay: 10 });
      await page.keyboard.press("Enter");

      // Small settle
      await new Promise((r) => setTimeout(r, 300));
      log.info("commented_visible", { text });

      try { await ta.dispose(); } catch {}
    } catch (e) {
      log.error("comment_task_error", { error: String(e && e.stack || e) });
    }
  }
};

let shareCounter = 0;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function pickShareButton(page, label) {
  const handle = await page.evaluateHandle((ariaLabel) => {
    const midY = window.innerHeight / 2;
    const svgs = Array.from(document.querySelectorAll(`svg[aria-label="${ariaLabel}"]`));

    const toClickable = (svg) =>
      svg.closest('button, div[role="button"]') ||
      svg.closest('div[role="button"]') ||
      svg.closest("div") ||
      svg;

    let best = null,
      bestScore = Infinity;

    for (const svg of svgs) {
      const btn = toClickable(svg);
      if (!btn) continue;
      const r = btn.getBoundingClientRect();
      const visible = r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
      if (!visible) continue;

      const center = (r.top + r.bottom) / 2;
      const spansCenter = r.top <= midY && r.bottom >= midY;
      const dy = Math.abs(center - midY);
      const score = spansCenter ? dy : dy + 10000;

      if (score < bestScore) {
        bestScore = score;
        best = btn;
      }
    }
    return best || null;
  }, label);

  const el = handle && handle.asElement ? handle.asElement() : null;
  if (!el && handle) {
    try {
      await handle.dispose();
    } catch {}
  }
  return el;
}

module.exports = {
  name: "share",
  run: async (page, ctx) => {
    const log = ctx.logger || console;
    const to = String(ctx.shareTo || "").trim();
    if (!to) {
      log.warn("share_no_target");
      return;
    }

    try {
      // 1) Open share sheet from the visible post
      let shareBtn = await pickShareButton(page, "Share");
      if (!shareBtn) shareBtn = await pickShareButton(page, "Send");
      if (!shareBtn) {
        log.warn("share_button_not_found_in_viewport");
        return;
      }

      await shareBtn.evaluate((el) => el.scrollIntoView({ block: "center", inline: "center" }));
      await shareBtn.click({ delay: 20 }).catch(() => {});
      try {
        await shareBtn.dispose();
      } catch {}

      // 2) Locate the dialog (if present) so we scope selectors correctly
      let dialog = await page.$('[role="dialog"]');
      // some variants don't use role=dialog; fall back to document if needed
      const getInDialog = async (selector) => {
        if (dialog) {
          return (await dialog.$(selector)) || null;
        }
        return await page.$(selector);
      };
      const waitInDialog = async (selector, timeout = 8000) => {
        const start = Date.now();
        while (Date.now() - start < timeout) {
          const h = await getInDialog(selector);
          if (h) return h;
          await sleep(100);
        }
        return null;
      };

      // 3) Search for the recipient username
      const searchSel =
        'input[name="queryBox"], input[placeholder*="Search" i], input[aria-label*="Search" i]';
      const searchInput = await waitInDialog(searchSel, 8000);
      if (!searchInput) {
        log.warn("share_search_input_not_found");
        return;
      }

      // Clear and type
      try {
        await searchInput.click({ clickCount: 3 });
      } catch {}
      try {
        await page.keyboard.press("Backspace");
      } catch {}
      await searchInput.type(to, { delay: 20 });

      // give results a moment to populate
      await sleep(600);

      // 4) Explicitly select TOP result and VERIFY it's selected
      // IG often renders a checkbox input per result inside the dialog
      const topCheckbox = await waitInDialog(
        'input[name="PolarisShareSheetV3ContactSearchResultCheckbox"]',
        4000
      );

      if (topCheckbox) {
        // prefer clicking the <label> ancestor; fallback to the input itself
        let clicked = false;
        const labelHandle = await page.evaluateHandle((el) => el.closest("label"), topCheckbox);
        const labelEl = labelHandle && labelHandle.asElement ? labelHandle.asElement() : null;
        try {
          if (labelEl) {
            await labelEl.click({ delay: 15 });
            clicked = true;
          }
        } catch {}
        if (!clicked) {
          try {
            await topCheckbox.click({ delay: 15 });
            clicked = true;
          } catch {}
        }

        // verify checked or aria-checked changes to true
        try {
          await page.waitForFunction(
            (el) => el.checked === true || el.getAttribute("aria-checked") === "true",
            { timeout: 4000 },
            topCheckbox
          );
          log.info("share_target_selected_click", { to });
        } catch {
          // fallback: Enter can toggle the top item in some variants
          try {
            await page.keyboard.press("Enter");
          } catch {}
          try {
            await page.waitForFunction(
              (el) => el.checked === true || el.getAttribute("aria-checked") === "true",
              { timeout: 2000 },
              topCheckbox
            );
            log.info("share_target_selected_enter_fallback", { to });
          } catch {
            log.warn("share_target_not_selected");
          }
        }
        try {
          if (labelHandle) await labelHandle.dispose();
        } catch {}
      } else {
        // No checkbox variant: try pressing Enter to select first match
        try {
          await page.keyboard.press("Enter");
        } catch {}
        log.info("share_target_selected_enter_only", { to });
      }

      // 5) Fill "Write a message..." (if present)
      const msgSel = 'input[name="shareCommentText"], input[placeholder*="Write a message" i]';
      const msgEl = await waitInDialog(msgSel, 4000);
      if (msgEl) {
        shareCounter += 1;
        const phrases = ["🔥", "lol", "bro 😎", "check this", "haha", "wild"];
        const pick = phrases[Math.floor(Math.random() * phrases.length)];
        const msg = `${pick} #${shareCounter}`;
        try {
          await msgEl.click({ clickCount: 3 });
        } catch {}
        try {
          await page.keyboard.press("Backspace");
        } catch {}
        await msgEl.type(msg, { delay: 15 });
        log.info("share_message_filled", { msg });
      } else {
        log.warn("share_message_box_not_found");
      }

      // 6) Click Send (scoped to dialog; look for exact text content)
      // We can't rely on XPath here, so we search in the dialog for visible buttons/div[role=button] with text "Send".
      const sendHandle = await page.evaluateHandle((dlg) => {
        const root = dlg || document;
        const cand = Array.from(root.querySelectorAll('button, div[role="button"]'));
        for (const el of cand) {
          const text = (el.textContent || "").trim();
          const disabled = el.getAttribute("aria-disabled");
          if (text === "Send" && (disabled === null || disabled === "false")) {
            return el;
          }
        }
        return null;
      }, dialog);
      const sendBtn = sendHandle && sendHandle.asElement ? sendHandle.asElement() : null;

      if (!sendBtn) {
        log.warn("share_send_button_not_found_or_disabled");
        if (sendHandle) {
          try {
            await sendHandle.dispose();
          } catch {}
        }
        return;
      }

      await sendBtn.click({ delay: 20 });
      log.info("shared_visible", { to, count: shareCounter });
      try {
        await sendBtn.dispose();
      } catch {}

      // tiny settle to let the dialog close or UI update
      await sleep(600);
    } catch (e) {
      log.error("share_failed", { to, error: String((e && e.stack) || e) });
    }
  },
};

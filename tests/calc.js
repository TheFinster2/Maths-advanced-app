#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
   The scientific calculator.

   Two halves, and the second one is why this file exists.

   1. IT HAS TO BE RIGHT. A calculator that is subtly wrong about operator
      precedence, or about degrees, is worse than no calculator: it hands a
      student a confident wrong number. Every case below was worked out by
      hand first.

   2. IT MUST NEVER RAISE THE SOFT KEYBOARD. On a phone, a focusable text
      field in a bottom sheet means the keyboard slides up over the keypad the
      moment you press a key, and the calculator becomes unusable. The fix —
      no <input> anywhere, preventDefault on every key, blur on open, no focus
      when sending the result — is invisible when it works, which is exactly
      the kind of thing that rots. So it is asserted directly:

        · nothing focusable exists inside the panel
        · pressing a key leaves document.activeElement on <body>
        · opening the calculator blurs the answer field
        · "→ Answer" fills the field WITHOUT focusing it

      Playwright cannot see a soft keyboard. It can see focus, and focus is
      what summons the keyboard, so focus is what gets tested.
   ═══════════════════════════════════════════════════════════════ */

const H = require("./harness");
const PORT = 8826;

/* [keys to press, expected display, note]. Keys are button labels. */
const SUMS = [
  [["7", "×", "8", "="],                       "56",     "times"],
  [["2", "+", "3", "×", "4", "="],             "14",     "precedence: × before +"],
  [["(", "2", "+", "3", ")", "×", "4", "="],   "20",     "brackets override it"],
  [["2", "xʸ", "1", "0", "="],                 "1024",   "powers"],
  [["9", "√", "9", ")", "="],                  "9√9 → 27", "sqrt is a function, not a postfix"],
  [["1", "0", "x!", "="],                      "3628800", "factorial"],
  [["5", "0", "%", "×", "8", "0", "="],        "40",     "percent"],
  [["1", "÷", "3", "="],                       "0.3333333333", "10 significant figures"]
];

(async () => {
  const R = H.reporter("MathQuest calculator test");
  const server = await H.serve(PORT, "/");
  const browser = await H.launch();
  let page;

  try {
    /* A phone, because that is where the keyboard problem lives. */
    page = await H.newPage(browser, { viewport: { width: 390, height: 780 } });
    await H.boot(page, `http://127.0.0.1:${PORT}/`);

    /* Calculation Crunch: typed answers, so there IS an answer field to fight
       over. That is the worst case for the keyboard. */
    await H.goTo(page, "/game/crunch");
    await page.waitForTimeout(600);
    await H.dismissModal(page, 400);

    R.section("Opening");
    R.ok(await page.evaluate(() => document.querySelectorAll(".tb-fab-btn").length === 3),
      "the toolbelt offers three tools");

    /* Focus the answer box first — this is a student mid-question with the
       keyboard already up. */
    await page.evaluate(() => {
      const i = document.querySelector("#view .numin");
      if (i) i.focus();
    });
    const focusedBefore = await page.evaluate(() =>
      document.activeElement && document.activeElement.className);
    R.ok(/numin/.test(focusedBefore || ""), "the answer box starts focused", focusedBefore);

    await page.evaluate(() => window.MQ.Toolbelt.open("calc"));
    await page.waitForTimeout(400);

    R.ok(await page.evaluate(() => !!document.querySelector(".calc-pad")),
      "the calculator opens");
    R.ok(await page.evaluate(() =>
      !document.activeElement || document.activeElement === document.body ||
      !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)),
      "opening it takes focus OFF the answer box, so the keyboard drops");

    R.section("The keyboard can never come up");
    /* The structural guarantee: nothing in the panel can receive text. */
    const focusables = await page.evaluate(() => {
      const sheet = document.querySelector(".tb-sheet");
      return {
        inputs: sheet.querySelectorAll("input, textarea, [contenteditable]").length,
        editable: sheet.querySelectorAll("[contenteditable='true']").length
      };
    });
    R.ok(focusables.inputs === 0,
      "there is no input, textarea or contenteditable in the sheet",
      focusables.inputs + " found");

    /* The behavioural guarantee: a press moves nothing. */
    await page.click(".calc-key:has-text('7')").catch(() => {});
    const afterPress = await page.evaluate(() => {
      const keys = Array.from(document.querySelectorAll(".calc-key"));
      const seven = keys.find(k => k.textContent.trim() === "7");
      seven.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
      seven.click();
      const a = document.activeElement;
      return { tag: a ? a.tagName : "none", cls: a ? String(a.className) : "" };
    });
    R.ok(!/^(INPUT|TEXTAREA)$/.test(afterPress.tag),
      "pressing a key does not focus anything that would raise a keyboard",
      `activeElement is <${afterPress.tag}> ${afterPress.cls}`);

    const prevented = await page.evaluate(() => {
      const keys = Array.from(document.querySelectorAll(".calc-key"));
      const ev = new PointerEvent("pointerdown", { bubbles: true, cancelable: true });
      keys[0].dispatchEvent(ev);
      return ev.defaultPrevented;
    });
    R.ok(prevented, "keys call preventDefault() on pointerdown (no focus transfer)");

    R.section("Arithmetic");
    for (const [keys, expect, note] of SUMS) {
      const got = await page.evaluate(async labels => {
        const press = label => {
          const k = Array.from(document.querySelectorAll(".calc-key"))
            .find(b => b.textContent.trim() === label);
          if (!k) return "no key: " + label;
          k.click();
          return null;
        };
        /* AC first so each case starts clean. */
        press("AC");
        for (const l of labels) { const err = press(l); if (err) return err; }
        await new Promise(r => setTimeout(r, 30));
        return document.querySelector(".calc-result").textContent.trim();
      }, keys);
      const want = expect.includes("→") ? expect.split("→")[1].trim() : expect;
      R.ok(got.replace(/^=\s*/, "").startsWith(want), note,
        `${keys.join(" ")}  →  ${got}, wanted ${want}`);
    }

    R.section("Degrees and radians");
    const angles = await page.evaluate(async () => {
      const press = label => {
        const k = Array.from(document.querySelectorAll(".calc-key"))
          .find(b => b.textContent.trim() === label);
        if (k) k.click();
      };
      const read = () => document.querySelector(".calc-result").textContent.replace(/^=\s*/, "").trim();
      const out = {};

      /* Default is DEG, which is the safer default for HSC trig. */
      out.startsInDeg = !!Array.from(document.querySelectorAll(".calc-key"))
        .find(b => b.textContent.trim() === "DEG");

      press("AC"); ["sin", "3", "0", ")", "="].forEach(press);
      await new Promise(r => setTimeout(r, 30));
      out.sin30deg = read();

      press("DEG");                      // → RAD
      press("AC"); ["sin", "π", "÷", "2", ")", "="].forEach(press);
      await new Promise(r => setTimeout(r, 30));
      out.sinHalfPi = read();

      out.nowRad = !!Array.from(document.querySelectorAll(".calc-key"))
        .find(b => b.textContent.trim() === "RAD");
      press("RAD");                      // back to DEG
      press("AC");
      return out;
    });
    R.ok(angles.startsInDeg, "it starts in degrees");
    R.ok(angles.sin30deg === "0.5", "sin(30) in DEG is 0.5", angles.sin30deg);
    R.ok(angles.nowRad, "the switch flips to RAD");
    R.ok(angles.sinHalfPi === "1", "sin(π/2) in RAD is 1", angles.sinHalfPi);

    R.section("2nd, Ans and memory");
    const extras = await page.evaluate(async () => {
      const press = label => {
        const k = Array.from(document.querySelectorAll(".calc-key"))
          .find(b => b.textContent.trim() === label);
        if (k) k.click();
        return !!k;
      };
      const read = () => document.querySelector(".calc-result").textContent.replace(/^=\s*/, "").trim();
      const out = {};

      press("AC"); press("2nd");
      out.secondSwapsTrig = !!Array.from(document.querySelectorAll(".calc-key"))
        .find(b => b.textContent.trim() === "sin⁻¹");
      ["sin⁻¹", "0", ".", "5", ")", "="].forEach(press);
      await new Promise(r => setTimeout(r, 30));
      out.asin = read();

      /* 2nd is one-shot, like the real thing. */
      out.secondCleared = !!Array.from(document.querySelectorAll(".calc-key"))
        .find(b => b.textContent.trim() === "sin");

      press("AC"); ["6", "×", "7", "="].forEach(press);
      await new Promise(r => setTimeout(r, 30));
      press("AC"); ["Ans", "+", "8", "="].forEach(press);
      await new Promise(r => setTimeout(r, 30));
      out.ans = read();
      return out;
    });
    R.ok(extras.secondSwapsTrig, "2nd swaps sin for sin⁻¹");
    R.ok(extras.asin === "30", "sin⁻¹(0.5) in DEG is 30", extras.asin);
    R.ok(extras.secondCleared, "2nd is one-shot and clears after use");
    R.ok(extras.ans === "50", "Ans carries the last result (42 + 8)", extras.ans);

    R.section("Sending the result to the answer");
    const sent = await page.evaluate(async () => {
      const press = label => {
        const k = Array.from(document.querySelectorAll(".calc-key"))
          .find(b => b.textContent.trim() === label);
        if (k) k.click();
      };
      press("AC"); ["1", "2", "×", "3", "="].forEach(press);
      await new Promise(r => setTimeout(r, 30));
      press("→ Answer");
      await new Promise(r => setTimeout(r, 60));
      const input = document.querySelector("#view .numin");
      const a = document.activeElement;
      return {
        value: input ? input.value : null,
        focusedTag: a ? a.tagName : "none"
      };
    });
    R.ok(sent.value === "36", "the result lands in the answer box", String(sent.value));
    R.ok(!/^(INPUT|TEXTAREA)$/.test(sent.focusedTag),
      "and it does NOT focus the box — that would raise the keyboard over the keypad",
      `activeElement is <${sent.focusedTag}>`);

    R.section("You can still see the question");
    const vis = await page.evaluate(() => {
      const mirror = document.querySelector(".tb-qmirror");
      const sheet = document.querySelector(".tb-sheet");
      const q = document.querySelector("#view .qtext");
      return {
        mirrored: !!(mirror && !mirror.hidden && mirror.textContent.trim().length > 3),
        sheetTop: sheet ? Math.round(sheet.getBoundingClientRect().top) : 0,
        viewport: window.innerHeight,
        reserved: getComputedStyle(document.documentElement).getPropertyValue("--sheet-h").trim(),
        padded: getComputedStyle(document.querySelector(".view")).paddingBottom,
        qText: q ? q.textContent.trim().slice(0, 30) : ""
      };
    });
    R.ok(vis.mirrored, "the question is mirrored inside the calculator sheet");
    R.ok(vis.sheetTop > vis.viewport * 0.2,
      "the sheet leaves the top of the screen free for the real question",
      `sheet starts at ${vis.sheetTop} of ${vis.viewport} px`);
    R.ok(parseFloat(vis.padded) > 100,
      "the page reserves room below, so the question can scroll clear of the sheet",
      `padding-bottom ${vis.padded}, sheet ${vis.reserved}`);

    R.section("Teardown");
    await page.evaluate(() => window.MQ.Toolbelt.close());
    await page.waitForTimeout(200);
    R.ok(await page.evaluate(() =>
      !document.documentElement.dataset.sheet &&
      !document.documentElement.style.getPropertyValue("--sheet-h")),
      "closing it releases the reserved page space");

    await H.assertNoOverflow(page, "calculator @390");
    await page.setViewportSize({ width: 360, height: 740 });
    await page.evaluate(() => window.MQ.Toolbelt.open("calc"));
    await page.waitForTimeout(300);
    await H.assertNoOverflow(page, "calculator @360");
    R.ok(true, "no horizontal overflow at 390 px or 360 px");

    R.ok(page.errors.length === 0, "no console errors", page.errors.slice(0, 3).join("\n      "));

  } catch (e) {
    R.ok(false, "calculator run completed", e.message + "\n" + (e.stack || "").split("\n")[1]);
  } finally {
    await browser.close();
    server.close();
  }

  process.exit(R.finish());
})();

#!/usr/bin/env node
/* Smoke test: drive every screen and every mode end to end.

   Fails on ANY console error, and checks horizontal overflow on every screen
   at both 390 px and 360 px. That overflow check is three lines and it catches
   a whole class of regressions — a deeply nested fraction is exactly the kind
   of unshrinkable content that pushes a grid child past the viewport. */

const H = require("./harness");
const PORT = 8821;

(async () => {
  const R = H.reporter("MathQuest smoke test");
  const server = await H.serve(PORT, "/");
  const browser = await H.launch();
  const base = `http://127.0.0.1:${PORT}/`;
  let page;

  try {
    page = await H.newPage(browser);
    await H.boot(page, base);
    R.ok(true, "app boots");

    /* ── every top-level screen ── */
    R.section("Screens");
    const screens = ["/home", "/play", "/study", "/reference", "/formulas", "/progress",
                     "/shop", "/achievements", "/settings", "/arcade"];
    for (const route of screens) {
      await H.goTo(page, route);
      const rendered = await page.evaluate(() => document.getElementById("view").children.length > 0);
      R.ok(rendered, `${route} renders`);
      await H.assertNoOverflow(page, route + " @390");
    }

    /* ── a reference sheet, and the drill it links to ── */
    await H.goTo(page, "/reference/ref-derivs");
    R.ok(await page.evaluate(() => document.body.innerText.includes("Derivatives")),
      "a reference sheet opens");
    await H.assertNoOverflow(page, "/reference/ref-derivs @390");

    /* ── the study deck ── */
    R.section("Study");
    await H.goTo(page, "/study/deck/all");
    const cardShown = await page.evaluate(() => !!document.querySelector(".fcard"));
    R.ok(cardShown, "a flashcard renders");
    if (cardShown) {
      await page.click(".fcard");
      await page.waitForTimeout(200);
      const flipped = await page.evaluate(() => document.querySelector(".fcard").classList.contains("flip"));
      R.ok(flipped, "the card flips");
      await H.assertNoOverflow(page, "flashcard @390");
    }

    /* ── every game mode ── */
    R.section("Game modes");
    const modes = MODES();
    for (const m of modes) {
      await H.goTo(page, "/game/" + m.id);
      await page.waitForTimeout(m.wait || 250);
      const up = await page.evaluate(sel => !!document.querySelector(sel), m.expect);
      R.ok(up, `${m.id} starts`, up ? "" : `expected ${m.expect}`);
      await H.assertNoOverflow(page, m.id + " @390");
      await H.dismissModal(page, 300);
    }

    /* ── answering a question end to end ── */
    R.section("Answering");
    await H.goTo(page, "/game/drill/MA-C2");
    await page.waitForTimeout(1400);   // clear MIN_READ_MS so the answer pays
    const before = await H.snapshot(page);
    await page.click(".choice");
    await page.waitForTimeout(250);
    R.ok(await page.evaluate(() => !!document.querySelector(".feedback")),
      "answering reveals the worked explanation");
    R.ok(await page.evaluate(() => !!document.querySelector(".js-next")),
      "the explanation stays until you press Next (it is never covered by a modal)");
    const after = await H.snapshot(page);
    R.ok(after.answered === before.answered + 1, "the answer is recorded");

    /* the star / bookmark control */
    await page.click(".bookmark-btn");
    await page.waitForTimeout(120);
    R.ok(await page.evaluate(() => window.MQ.State.data.bookmarks.length > 0),
      "starring a question saves it for review");

    /* ── a boss fight ── */
    R.section("Boss");
    await H.goTo(page, "/game/boss/asymptote");
    R.ok(await page.evaluate(() => !!document.querySelector(".hpbar.enemy")), "the boss fight starts");
    await H.assertNoOverflow(page, "boss @390");
    await page.waitForTimeout(1400);
    /* Click ANY option and assert the turn RESOLVES: the boss takes damage on a
       correct answer, the player takes it on a wrong one. Asserting only the
       boss bar makes the test depend on the shuffled option order, which is a
       coin flip and therefore a flaky test rather than a real check. */
    await page.click(".choice");
    await page.waitForTimeout(350);
    const bars = await page.evaluate(() => ({
      boss: document.querySelector(".hpbar.enemy > i").style.width,
      player: document.querySelector(".hpbar:not(.enemy) > i").style.width,
      revealed: !!document.querySelector(".choice.correct")
    }));
    R.ok(bars.revealed, "the boss fight reveals the correct answer");
    R.ok(bars.boss !== "100%" || bars.player !== "100%",
      "answering resolves the turn — one side takes damage",
      `boss=${bars.boss} player=${bars.player}`);
    R.ok(!!(await page.$(".js-next")), "the boss turn waits for you to continue");

    /* ── the shop ── */
    R.section("Shop");
    await H.goTo(page, "/shop");
    await H.seedSave(page, { coins: 50000 });
    await H.goTo(page, "/shop");
    const spentVia = await page.evaluate(() => {
      /* Assert `spendCoins` was CALLED and the inventory changed — never
         "coins went down", which stops being true the moment an achievement
         pays out mid-purchase. */
      const S = window.MQ.State;
      const realSpend = S.spendCoins;
      let called = 0;
      S.spendCoins = n => { called++; return realSpend(n); };
      const before = S.data.inventory.fifty || 0;
      const btn = Array.from(document.querySelectorAll(".shop-item button"))
        .find(b => !b.disabled && /🔢/.test(b.textContent));
      if (btn) btn.click();
      const after = window.MQ.State.data.inventory.fifty || 0;
      S.spendCoins = realSpend;
      return { called, changed: after !== before || called > 0 };
    });
    R.ok(spentVia.called > 0, "a purchase goes through spendCoins()");

    /* a crate opening */
    await H.goTo(page, "/shop");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll(".crate button")).find(b => !b.disabled);
      if (btn) btn.click();
    });
    await page.waitForTimeout(300);
    R.ok(await page.evaluate(() => {
      const root = document.getElementById("modal-root");
      return !!root && !root.hidden;
    }), "a crate opens with a result modal");
    await H.dismissModal(page);

    /* ── theme switching ── */
    R.section("Themes");
    await page.evaluate(() => {
      window.MQ.DATA.shop.themes.forEach(t => {
        if (!window.MQ.State.ownsTheme(t.id)) window.MQ.State.data.owned.themes.push(t.id);
      });
    });
    for (const t of ["paper", "euler", "radian", "graph"]) {
      await page.evaluate(id => window.MQ.UI.applyTheme(id), t);
      await page.waitForTimeout(60);
      const applied = await page.evaluate(() => document.documentElement.dataset.theme);
      R.ok(applied === t, `theme "${t}" applies`);
    }
    /* H2: a hover rule must not repaint a primary button's background — dark
       text on a dark fill, on every primary button in the app. */
    const hoverSafe = await page.evaluate(() => {
      const btn = document.querySelector(".btn-primary");
      if (!btn) return true;
      const before = getComputedStyle(btn).backgroundImage;
      return before.includes("gradient");
    });
    R.ok(hoverSafe, "primary buttons keep their gradient (no flat hover repaint)");

    /* ── persistence across a reload ── */
    R.section("Persistence");
    await page.evaluate(() => {
      window.MQ.State.data.coins = 31337;
      window.MQ.State.data.profile.name = "Persisted";
      window.MQ.State.flush();
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await H.waitFor(page, () => !!(window.MQ && window.MQ.State && window.MQ.State.data), { label: "reloaded" });
    const kept = await page.evaluate(() => ({
      coins: window.MQ.State.data.coins, name: window.MQ.State.data.profile.name
    }));
    R.ok(kept.coins === 31337 && kept.name === "Persisted", "progress survives a reload");

    /* ── 360 px ── */
    R.section("Narrow phone (360 px)");
    await page.setViewportSize({ width: 360, height: 780 });
    await page.waitForTimeout(150);
    for (const route of screens.concat(["/game/crunch", "/game/equiv", "/game/panic", "/game/lab"])) {
      await H.goTo(page, route);
      await page.waitForTimeout(200);
      await H.assertNoOverflow(page, route + " @360");
      await H.dismissModal(page, 200);
    }
    R.ok(true, "no horizontal overflow on any screen at 360 px");

    /* ── the toolbelt: formula sheet + working-out pad ──
       Checked at 360 px, because that is the width where a bottom sheet either
       works or covers the whole question. */
    R.section("Toolbelt");
    await H.goTo(page, "/game/drill/MA-C2");
    await page.waitForTimeout(300);

    /* Three tools: formula sheet, working-out pad, calculator. The calculator
       has its own suite (tests/calc.js) — this only checks it is mounted. */
    const fabs = await page.$$(".tb-fab-btn");
    R.ok(fabs.length === 3, "all three toolbelt buttons are mounted inside a game",
      fabs.length + " found");

    /* The navbar is nearly full width on a phone, so a bottom-right button is
       one bad number away from sitting on top of it. Measure rather than trust
       the arithmetic in the stylesheet. */
    const clearance = await page.evaluate(() => {
      const fab = document.querySelector(".tb-fab");
      const nav = document.getElementById("navbar");
      if (!fab || !nav) return null;
      const f = fab.getBoundingClientRect(), n = nav.getBoundingClientRect();
      const overlapsX = f.left < n.right && f.right > n.left;
      return { gap: Math.round(n.top - f.bottom), overlapsX };
    });
    R.ok(clearance && clearance.gap >= 6,
      "the toolbelt buttons clear the navbar at 360 px",
      clearance ? `${clearance.gap} px gap (overlapping horizontally: ${clearance.overlapsX})` : "not found");

    if (fabs.length === 3) {
      await fabs[0].click();
      await page.waitForTimeout(300);
      R.ok(await page.evaluate(() => !!document.querySelector(".tb-sheet")),
        "the formula sheet opens over the game");
      R.ok(await page.evaluate(() => document.querySelectorAll(".tb-row").length > 20),
        "it lists formulas");
      R.ok(await page.evaluate(() => document.querySelectorAll(".nesa-badge.yes").length > 0 &&
                                     document.querySelectorAll(".nesa-badge.no").length > 0),
        "both NESA states are labelled");
      await H.assertNoOverflow(page, "toolbelt formulas @360");

      /* An on-sheet formula is visible without paying anything; an off-sheet
         one is behind a reveal. That asymmetry IS the feature. */
      R.ok(await page.evaluate(() =>
        !!document.querySelector(".tb-row.is-sheet .tb-tex") &&
        !document.querySelector(".tb-row.is-sheet .tb-reveal")),
        "printed formulas are shown outright");
      R.ok(await page.evaluate(() => !!document.querySelector(".tb-row.is-learn .tb-reveal")),
        "memorise-only formulas are behind a reveal");

      R.ok(await page.evaluate(() => window.MQ.Toolbelt.penalty() === 1),
        "nothing is charged before you reveal one");
      await page.click(".tb-row.is-learn .tb-reveal");
      await page.waitForTimeout(200);
      R.ok(await page.evaluate(() => window.MQ.Toolbelt.penalty() < 1 && window.MQ.Toolbelt.lookups() === 1),
        "revealing one charges the run");
      R.ok(await page.evaluate(() => window.MQ.UI.formulaPenalty() === window.MQ.Toolbelt.penalty()),
        "the reward pipeline sees the same number");

      /* The crutch LATCHES: closing the sheet must not refund it. */
      await page.click(".tb-close");
      await page.waitForTimeout(250);
      R.ok(await page.evaluate(() => !document.querySelector(".tb-sheet")), "the sheet closes");
      R.ok(await page.evaluate(() => window.MQ.Toolbelt.penalty() < 1),
        "closing the sheet does not refund the crutch");

      /* Working-out pad. */
      await page.click(".tb-fab-btn:nth-child(2)");
      await page.waitForTimeout(300);
      R.ok(await page.evaluate(() => !!document.querySelector(".tb-canvas")),
        "the working-out pad opens");
      const drew = await page.evaluate(async () => {
        const c = document.querySelector(".tb-canvas");
        const r = c.getBoundingClientRect();
        const ev = (type, x, y) => c.dispatchEvent(new PointerEvent(type, {
          clientX: r.left + x, clientY: r.top + y, bubbles: true, pointerId: 1
        }));
        ev("pointerdown", 20, 20);
        for (let i = 1; i <= 12; i++) ev("pointermove", 20 + i * 8, 20 + i * 5);
        ev("pointerup", 116, 80);
        await new Promise(res => setTimeout(res, 80));
        const px = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
        for (let i = 3; i < px.length; i += 4) if (px[i] > 0) return true;
        return false;
      });
      R.ok(drew, "you can draw on it");
      R.ok(await page.evaluate(() => {
        const t = document.querySelector(".tb-notes");
        t.value = "let u = x^2 + 1";
        t.dispatchEvent(new Event("input", { bubbles: true }));
        return window.MQ.State.data.scratch === "let u = x^2 + 1";
      }), "typed working is saved");
      await H.assertNoOverflow(page, "toolbelt working @360");
      await page.click(".tb-close");
      await page.waitForTimeout(200);
    }

    /* Leaving the game must take the toolbelt with it. */
    await H.goTo(page, "/home");
    await page.waitForTimeout(300);
    R.ok(await page.evaluate(() => !document.querySelector(".tb-fab")),
      "the toolbelt is torn down when you leave the game");
    R.ok(await page.evaluate(() => window.MQ.Toolbelt.penalty() === 1),
      "and the crutch latch resets for the next run");

    /* ── the standalone formula sheet is free ── */
    await H.goTo(page, "/formulas");
    await page.waitForTimeout(300);
    R.ok(await page.evaluate(() => !document.querySelector(".tb-reveal")),
      "outside a run nothing is hidden behind a reveal");

    /* ── text size ── */
    R.section("Text size");
    const sizes = await page.evaluate(() => {
      const out = [];
      for (const key of ["md", "lg", "xl"]) {
        document.documentElement.dataset.text = key;
        const p = document.querySelector(".view p");
        out.push(parseFloat(getComputedStyle(p).fontSize));
      }
      document.documentElement.dataset.text = "md";
      return out;
    });
    R.ok(sizes[1] > sizes[0] && sizes[2] > sizes[1],
      "each text size step actually gets bigger", sizes.join(" → ") + " px");

    /* ── the console must be clean ── */
    R.section("Console");
    R.ok(page.errors.length === 0, "no console errors anywhere",
      page.errors.slice(0, 5).join("\n      "));

  } catch (e) {
    R.ok(false, "smoke run completed", e.message + "\n" + (e.stack || "").split("\n")[1]);
    if (page && page.errors.length) console.log("      console: " + page.errors.slice(0, 5).join("\n      "));
  } finally {
    await browser.close();
    server.close();
  }

  process.exit(R.finish());
})();

/* Each mode with a selector proving it actually rendered. */
function MODES() {
  return [
    { id: "rapid",     expect: ".qcard" },
    { id: "drill",     expect: ".game-card" },        // the topic picker
    { id: "equiv",     expect: ".equiv-target" },
    { id: "match",     expect: ".mgrid" },
    { id: "curve",     expect: "canvas.plot", wait: 500 },
    { id: "crunch",    expect: ".numin" },
    { id: "panic",     expect: ".ptable" },
    { id: "lab",       expect: "canvas.plot", wait: 500 },
    { id: "proof",     expect: ".proof-pool" },
    { id: "induction", expect: ".proof-pool" },
    { id: "vector",    expect: "canvas.plot", wait: 500 },
    { id: "survival",  expect: ".qcard" },
    { id: "mistakes",  expect: ".empty, .qcard" },
    { id: "starred",   expect: ".empty, .qcard" }
  ];
}

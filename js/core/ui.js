/* UI shell: hash router, header sync, toasts, modals, shared game chrome —
   and THE REWARD PIPELINE, which every mode funnels XP and Primes through.

   Two conventions hold this app together:

   1. Every reward goes through UI.award(). Level-ups, achievement checks,
      toasts, confetti, the XP multiplier and the anti-farm accuracy gate all
      happen in exactly one function. No mode can forget them and no mode can
      bypass the anti-cheat — which is what makes the arcade's "earns nothing"
      rule structural rather than aspirational: arcade code simply never
      calls this.

   2. Every game gets its chrome from UI.gameShell() and registers teardown
      with UI.onLeave(). The router runs onLeave before swapping screens, and
      it is the only thing stopping setInterval timers and rAF loops leaking
      between modes. A maths app has far more of those than chemistry did —
      every animated graph is one. */
window.MQ = window.MQ || {};

MQ.UI = (function () {
  const U = MQ.U;
  const S = MQ.State;
  const routes = {};
  /* A LIST, not a single handler. onLeave() used to replace whatever was
     registered, so a mode that called it after its shared chrome already had
     silently cancelled the chrome's teardown — the arcade ticket clock kept
     draining playtime after you left the game. Accumulating is the only shape
     that is safe to call from more than one layer. */
  let cleanups = [];

  /** Runs below this accuracy earn no completion bonus at all. */
  const MIN_BONUS_ACCURACY = 0.5;
  /** Answers faster than this can't have involved reading the question. */
  const MIN_READ_MS = 1200;

  /* ── routing ─────────────────────────────────────────────── */
  function route(name, fn) { routes[name] = fn; }

  function go(path) {
    if (location.hash === "#" + path) handleRoute();
    else location.hash = path;
  }

  function parseHash() {
    const raw = (location.hash || "#/home").replace(/^#/, "");
    const parts = raw.split("/").filter(Boolean);
    return { name: parts[0] || "home", args: parts.slice(1) };
  }

  function handleRoute() {
    const { name, args } = parseHash();
    const fn = routes[name] || routes.home;

    // Run every registered teardown. One throwing must not strand the others,
    // and must not block navigation.
    cleanups.forEach(fn => {
      try { fn(); } catch (e) { console.warn("teardown failed", e); }
    });
    cleanups = [];

    const view = U.$("#view");
    if (view.childNodes.length) MQ.Sound.nav();
    view.innerHTML = "";
    const result = fn(view, args);
    if (typeof result === "function") cleanups.push(result);

    const navKey = ({ play: "play", game: "play", arcade: "play" })[name] || name;
    U.$$(".nav-item").forEach(a => a.classList.toggle("on", a.dataset.nav === navKey));

    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    view.focus({ preventScroll: true });
  }

  /**
   * Register a teardown for the current screen: timers, listeners, rAF loops.
   * Handlers ACCUMULATE — calling this twice registers two, it does not replace
   * the first. Shared chrome and the mode using it both need one.
   */
  function onLeave(fn) { if (typeof fn === "function") cleanups.push(fn); }

  /* ── header ──────────────────────────────────────────────── */
  function syncHeader() {
    const d = S.data;
    const need = S.xpNeeded(d.level);
    U.$("#avatar-emoji").textContent = d.profile.avatar;
    U.$("#lvl-badge").textContent = "Lv " + d.level;
    U.$("#lvl-title").textContent = S.levelTitle(d.level);
    U.$("#lvl-xp").textContent = `${d.xpIntoLevel} / ${need} XP`;
    U.$("#xpbar-fill").style.width = U.clamp((d.xpIntoLevel / need) * 100, 0, 100) + "%";

    const coinEl = U.$("#coin-count");
    if (coinEl.textContent !== String(d.coins)) {
      coinEl.textContent = d.coins;
      pulse(U.$("#coin-pill"));
    }
    U.$("#streak-count").textContent = d.streak.count;
    U.$("#streak-pill").classList.toggle("hot", d.streak.count >= 3);
  }

  function pulse(node) {
    if (!node) return;
    node.classList.remove("bump");
    void node.offsetWidth;
    node.classList.add("bump");
  }

  function applyTheme(id) {
    document.documentElement.dataset.theme = id;
    S.data.profile.theme = id;
    S.save();
  }

  /* ── toasts ──────────────────────────────────────────────── */
  function toast(opts) {
    const o = typeof opts === "string" ? { text: opts } : opts;
    const node = U.el("div", { class: "toast " + (o.kind || "") }, [
      U.el("span", { class: "toast-ico", text: o.icon || "📐" }),
      U.el("span", { html: o.text })
    ]);
    U.$("#toasts").appendChild(node);
    setTimeout(() => {
      node.classList.add("out");
      setTimeout(() => node.remove(), 320);
    }, o.ms || 2600);
  }

  /* ── modals ──────────────────────────────────────────────── */
  let escHandler = null;

  function modal(content, opts) {
    const o = opts || {};
    const root = U.$("#modal-root");
    closeModal();
    root.hidden = false;

    const box = U.el("div", { class: "modal" + (o.center ? " modal-center" : "") + (o.wide ? " modal-wide" : "") });
    if (typeof content === "string") box.innerHTML = content;
    else box.appendChild(content);
    root.appendChild(box);

    // Sticky modals (run results, crate openings) are dismissed by their own buttons.
    if (!o.sticky) {
      root.onclick = e => { if (e.target === root) closeModal(); };
      escHandler = e => { if (e.key === "Escape") closeModal(); };
      document.addEventListener("keydown", escHandler);
    }
    return { box, close: closeModal };
  }

  function closeModal() {
    const root = U.$("#modal-root");
    root.hidden = true;
    root.innerHTML = "";
    root.onclick = null;
    if (escHandler) {
      document.removeEventListener("keydown", escHandler);
      escHandler = null;
    }
  }

  function confirmDialog(title, body, onYes, yesLabel) {
    modal(U.el("div", {}, [
      U.el("h2", { text: title }),
      U.el("p", { html: body }),
      U.el("div", { class: "row", style: "margin-top:16px" }, [
        U.el("button", { class: "btn btn-ghost", text: "Cancel", on: { click: closeModal } }),
        U.el("div", { class: "spacer" }),
        U.el("button", {
          class: "btn btn-primary", text: yesLabel || "Confirm",
          on: { click: () => { closeModal(); onYes(); } }
        })
      ])
    ]));
  }

  /* ── the reward pipeline ─────────────────────────────────── */
  /**
   * opts: { xp, bonus, accuracy, coins, at (element), silent, raw }
   *
   * The accuracy gate below is the whole reason this is one function. The
   * original chemistry design paid XP for correct answers with no penalty
   * for wrong ones, so mashing any option and finishing the run earned
   * 35,097 XP/hour. Four fixes were needed, and this is the one that has to
   * live somewhere no mode can skip.
   */
  function award(opts) {
    const o = opts || {};

    let bonus = Math.max(0, o.bonus || 0);
    if (o.accuracy !== undefined) {
      const acc = U.clamp(o.accuracy, 0, 1);
      // Below 50% the completion bonus is withheld ENTIRELY, not scaled down.
      bonus = acc < MIN_BONUS_ACCURACY ? 0 : Math.round(bonus * acc);
    }

    // Difficulty and ascension multipliers apply here and nowhere else.
    const mult = o.raw ? 1 : S.xpMultiplier();
    /* The Toolbelt's off-sheet formula crutch is charged here for the same
       reason the accuracy gate is: one function, no mode can forget it. It
       LATCHES for the run (see toolbelt.js), and every mode reports got.xp
       rather than what it computed, so the results screen shows the truth. */
    const crutch = o.raw ? 1 : formulaPenalty();
    const xp = Math.round((Math.max(0, o.xp || 0) + bonus) * mult * crutch);
    // Primes are deliberately scarcer than XP: payouts scale to 60%.
    const coins = Math.round((o.coins || 0) * (o.raw ? 1 : 0.6));

    if (coins) S.addCoins(coins, true);
    const res = xp ? S.addXP(xp) : { levelsGained: 0, newLevel: S.data.level };
    if (!xp && coins) S.emit();
    res.xp = xp;
    res.coins = coins;
    res.multiplier = mult;
    res.formulaCrutch = crutch;

    if (o.at && xp && !o.silent) {
      const r = o.at.getBoundingClientRect();
      MQ.FX.floatText(r.left + r.width / 2 - 20, r.top - 6, "+" + xp + " XP");
    }
    if (coins && !o.silent) MQ.Sound.coin();

    if (res.levelsGained > 0) {
      MQ.Sound.levelUp();
      MQ.FX.confetti(110);
      toast({
        icon: "🎉", kind: "xp", ms: 3600,
        text: `<b>Level ${res.newLevel}!</b> You are now ${S.levelTitle(res.newLevel)} &middot; +${30 * res.newLevel} 🔢`
      });
      if (res.newLevel >= S.MAX_LEVEL) {
        setTimeout(() => toast({
          icon: "🔱", kind: "good", ms: 5000,
          text: "<b>Level 60.</b> You can now Ascend from the Progress screen."
        }), 1200);
      }
    }

    S.checkAchievements().forEach((a, i) => {
      setTimeout(() => {
        MQ.Sound.achievement();
        MQ.FX.confetti(60);
        toast({
          icon: a.icon, kind: "good", ms: 3800,
          text: `<b>${U.escapeHtml(a.name)}</b> unlocked${a.reward ? ` &middot; +${a.reward} 🔢` : ""}`
        });
      }, 500 + i * 900);
    });

    syncHeader();
    return res;
  }

  /** The XP multiplier the Toolbelt has charged this run: 1, or 0.8 once an
      off-sheet formula has been revealed. Lives here so award() and results()
      agree, and so a build without the Toolbelt degrades to "no penalty". */
  function formulaPenalty() {
    return MQ.Toolbelt && MQ.Toolbelt.penalty ? MQ.Toolbelt.penalty() : 1;
  }

  /* ── shared game chrome ──────────────────────────────────── */
  /**
   * Returns { root, body, meta } — append the playfield to `body`,
   * status chips to `meta`.
   *
   * Every game shell also mounts the Toolbelt (formula sheet + working-out
   * pad) and resets its run-scoped crutch latch. Pass `toolbelt:false` for
   * screens that are reference material rather than a scored run.
   */
  function gameShell(title, opts) {
    const o = opts || {};
    const meta = U.el("div", { class: "gmeta" });
    const body = U.el("div", { class: "grid" });
    const back = U.el("button", {
      class: "btn btn-sm btn-ghost", text: "← Back",
      on: { click: () => {
        if (o.confirmExit) {
          confirmDialog("Quit this run?", "Your progress in this run will be lost.",
            () => go(o.backTo || "/play"), "Quit");
        } else go(o.backTo || "/play");
      } }
    });
    const head = U.el("div", { class: "ghead" }, [
      back,
      U.el("div", { class: "gtitle", text: title }),
      meta
    ]);
    if (o.help) {
      head.insertBefore(U.el("button", {
        class: "btn btn-sm btn-ghost", text: "?", title: "How this mode works",
        on: { click: () => modal(U.el("div", {}, [
          U.el("h2", { text: title }),
          U.el("p", { html: o.help }),
          U.el("button", { class: "btn btn-primary btn-block", text: "Got it", on: { click: closeModal } })
        ])) }
      }), meta);
    }
    if (MQ.Toolbelt && o.toolbelt !== false) MQ.Toolbelt.mount({ scored: o.scored !== false });
    return { root: U.el("div", { class: "gshell" }, [head, body]), body, meta };
  }

  /** Grade a run. */
  function rank(accuracy, bonus) {
    const score = accuracy + (bonus || 0);
    if (score >= 97) return { rank: "S", cls: "rank-s", blurb: "Flawless. Band 6 energy." };
    if (score >= 88) return { rank: "A", cls: "rank-a", blurb: "Excellent — you know this cold." };
    if (score >= 75) return { rank: "B", cls: "rank-b", blurb: "Solid. Tighten up the tricky ones." };
    if (score >= 60) return { rank: "C", cls: "rank-c", blurb: "Getting there. Review your mistakes." };
    return { rank: "D", cls: "rank-d", blurb: "Rough run — try the flashcards for this topic." };
  }

  /* ── the review sheet ───────────────────────────────────────────
     crunch.js already carries the note "never cover the worked solution with
     a results overlay" — the student reads the explanation, THEN moves on.
     This is that same rule at the scale of a whole run: the results modal is
     sticky, and its only exits were "Back to games" and "Play again", both of
     which destroy the marked-up screen underneath. Fill in a table, submit,
     and the one moment the app knows exactly what you got wrong is the moment
     it covers it up and offers to throw it away.

     Two ways back, because modes differ in where the truth lives:

     · review — a per-item list the mode hands over. Works everywhere,
       including the modes that only ever showed you one question at a time.
     · reviewScreen — for a mode whose own screen IS the review (Table Panic
       marks every cell and fills in the ones you missed). Closes the modal
       and leaves a bar to get back, instead of rebuilding that board in a
       list that would be strictly worse than the real thing. */

  /**
   * Post-run answer review. Entries:
   *   { ok, prompt, yours, correct, why, label, topic, id }
   * `yours` may be null for an item that was skipped or never reached.
   */
  function reviewSheet(list, opts) {
    const o = opts || {};
    const items = (list || []).filter(Boolean);
    const wrong = items.filter(x => !x.ok).length;
    let wrongOnly = false;

    const box = U.el("div");
    render();
    modal(box, { sticky: true, wide: true });

    function render() {
      box.innerHTML = "";
      const shown = wrongOnly ? items.filter(x => !x.ok) : items;

      box.appendChild(U.el("h2", { text: o.title || "Review your answers" }));
      box.appendChild(U.el("p", { class: "muted", style: "margin-top:-4px", text:
        `${items.length - wrong} right · ${wrong} to look at` +
        (o.note ? " · " + o.note : "") }));

      /* Only worth offering when it would actually hide something. Getting
         everything wrong makes the filter a no-op, and so does a short list. */
      if (wrong && wrong < items.length && items.length > 4) {
        box.appendChild(U.el("div", { class: "row", style: "margin-bottom:12px" }, [
          U.el("button", { class: "btn btn-sm" + (wrongOnly ? "" : " btn-primary"), text: "All",
            on: { click: () => { wrongOnly = false; render(); } } }),
          U.el("button", { class: "btn btn-sm" + (wrongOnly ? " btn-primary" : ""),
            text: "Only what I missed (" + wrong + ")",
            on: { click: () => { wrongOnly = true; render(); } } })
        ]));
      }

      shown.forEach(it => box.appendChild(reviewItem(it)));

      box.appendChild(U.el("div", { class: "row", style: "margin-top:16px" }, [
        o.onBack ? U.el("button", { class: "btn btn-ghost btn-sm", text: "← Results",
          on: { click: () => { closeModal(); o.onBack(); } } }) : null,
        U.el("div", { class: "spacer" }),
        U.el("button", { class: "btn btn-primary", text: o.doneLabel || "Done",
          on: { click: () => { closeModal(); if (o.onDone) o.onDone(); } } })
      ]));
    }
  }

  function reviewItem(it) {
    /* Starring works from here as well as mid-run. Review is exactly when a
       student knows which question they want to see again, and making them
       replay the run to star it is how it never gets starred. */
    let star = null;
    if (it.id) {
      const on0 = MQ.State.isBookmarked(it.id);
      star = U.el("button", { class: "bookmark-btn" + (on0 ? " on" : ""), type: "button",
        title: "Star this question for review", text: on0 ? "★" : "☆" });
      star.addEventListener("click", () => {
        const on = MQ.State.toggleBookmark(it.id);
        star.classList.toggle("on", on);
        star.textContent = on ? "★" : "☆";
        MQ.Sound.tap();
      });
    }

    const rows = [];
    if (it.ok) {
      rows.push(reviewRow("You", it.yours, "ok"));
    } else {
      // Blank reads as "you ran out of time", which is not the same mistake as
      // an answer that was wrong, and should not look like one.
      rows.push(reviewRow("You", it.yours === null || it.yours === undefined || it.yours === ""
        ? "— left blank" : it.yours, "no"));
      rows.push(reviewRow("Answer", it.correct, "ok"));
    }

    return U.el("div", { class: "rev-item " + (it.ok ? "ok" : "no") }, [
      U.el("div", { class: "rev-head" }, [
        U.el("span", { class: "rev-mark", text: it.ok ? "✓" : "✗" }),
        it.label ? U.el("span", { class: "chip", text: it.label }) : null,
        it.topic ? U.el("span", { class: "chip", text: MQ.Bank.topicName(it.topic) }) : null,
        it.topic ? tierChip(it.topic) : null,
        U.el("div", { class: "spacer" }),
        star
      ]),
      it.prompt ? U.el("div", { class: "rev-q math", html: U.math(it.prompt) }) : null,
      U.el("div", { class: "rev-rows" }, rows),
      it.why ? U.el("div", { class: "rev-why math", html: U.math(it.why) }) : null
    ]);
  }

  function reviewRow(label, value, cls) {
    return U.el("div", { class: "rev-row " + cls }, [
      U.el("span", { class: "rev-lbl", text: label }),
      U.el("span", { class: "math rev-val", html: U.math(value) })
    ]);
  }

  /* Closes the results modal and leaves the mode's own marked-up screen
     visible, with one control to get the results back. Without that control
     the student is stranded on a finished board with no obvious next step. */
  function reviewOnScreen(reopen) {
    closeModal();
    const bar = U.el("div", { class: "review-bar" }, [
      U.el("span", { class: "review-bar-txt", text: "Reviewing — ✓ right, ✗ wrong, blanks filled in" }),
      U.el("button", { class: "btn btn-sm btn-primary", text: "Results",
        on: { click: () => { bar.remove(); reopen(); } } })
    ]);
    document.body.appendChild(bar);
    // Leaving the screen must take the bar with it, or it follows the student
    // onto Home and floats over an unrelated page forever.
    onLeave(() => bar.remove());
  }

  /**
   * End-of-run summary modal.
   * opts: { title, correct, total, xp, coins, extraStats:[[label,value]],
   *         newBest, onAgain, bonus, review, reviewScreen }
   */
  function results(opts) {
    const o = opts;
    const acc = U.pct(o.correct, o.total);
    const r = rank(acc, o.bonus);
    const perfect = o.total > 0 && o.correct === o.total;

    if (!o.silent) {
      if (perfect) { MQ.Sound.perfect(); MQ.FX.confetti(140); }
      else if (acc >= 60) { MQ.Sound.win(); MQ.FX.confetti(70); }
      else MQ.Sound.lose();
    }

    const cells = [
      ["Correct", `${o.correct}/${o.total}`],
      ["Accuracy", acc + "%"],
      ["XP", "+" + o.xp]
    ].concat(o.extraStats || []);

    /* Reported by the shell rather than by each mode: a crutch that no mode
       remembered to mention would be a crutch nobody notices paying for. */
    const looks = MQ.Toolbelt && MQ.Toolbelt.lookups ? MQ.Toolbelt.lookups() : 0;
    if (looks) cells.push(["Off-sheet lookups", looks + " · ×" + formulaPenalty()]);

    /* Reopening has to rebuild from `o`, not reuse a node — the review sheet
       and the on-screen bar both close this modal, and closeModal() empties
       the root. Guard the celebration so coming back does not re-fire the
       confetti and the fanfare every time. */
    const again = () => results(Object.assign({}, o, { silent: true }));
    const list = (o.review || []).filter(Boolean);

    modal(U.el("div", { class: "modal-center" }, [
      U.el("div", { class: "modal-big " + r.cls, text: r.rank }),
      U.el("h2", { class: "modal-center", text: o.title || "Run complete", style: "justify-content:center" }),
      U.el("p", { text: r.blurb }),
      o.newBest ? U.el("div", { class: "chip on", text: "🏅 New personal best!" }) : null,
      U.el("div", { class: "result-grid" }, cells.map(([lbl, val]) =>
        U.el("div", { class: "result-cell" }, [
          U.el("div", { class: "result-num", text: String(val) }),
          U.el("div", { class: "result-lbl", text: lbl })
        ])
      )),
      o.coins ? U.el("p", { class: "muted", html: `Earned <b>${o.coins}</b> 🔢 Primes` }) : null,

      /* Above "Play again" deliberately. Both of the old exits threw the run
         away, so the way back to it has to be the more prominent choice. */
      list.length ? U.el("button", {
        class: "btn btn-block js-review", style: "margin-top:4px",
        text: "📋 Review your answers" + (o.correct < o.total ? ` (${o.total - o.correct} missed)` : ""),
        on: { click: () => reviewSheet(list, {
          title: o.title, onBack: again, onDone: again,
          doneLabel: "Back to results"
        }) }
      }) : null,
      o.reviewScreen ? U.el("button", {
        class: "btn btn-block js-review-screen", style: "margin-top:8px",
        text: "🔍 Look back at the board",
        on: { click: () => reviewOnScreen(again) }
      }) : null,

      U.el("div", { class: "row", style: "margin-top:12px" }, [
        U.el("button", {
          class: "btn btn-ghost btn-sm", text: "Back to games",
          on: { click: () => { closeModal(); go("/play"); } }
        }),
        U.el("div", { class: "spacer" }),
        U.el("button", {
          class: "btn btn-primary js-again", text: "Play again",
          on: { click: () => { closeModal(); o.onAgain(); } }
        })
      ])
    ]), { sticky: true });
  }

  /** Standard chip used by games for score / lives / timer. */
  function chip(text, cls) { return U.el("span", { class: "chip " + (cls || ""), text }); }

  /** A tier badge — small EXT marker, present but not smug. */
  function tierChip(topic) {
    if (MQ.DATA.tierOf(topic) !== "ME") return null;
    return U.el("span", { class: "chip chip-ext", text: "EXT", title: "Mathematics Extension 1" });
  }

/* ── the test introspection hook ────────────────────────────────
   MQ.__current holds whatever the mode currently expects, so tests/exploit.js
   can drive an HONEST player as well as a farming one. Measuring only the
   farming bot proves nothing by itself: a mode tightened until it pays nobody
   would score a perfect zero and look like a pass.

   This is not a security hole. Anyone with a console can already call
   State.addXP() directly — a client-side app cannot defend against its own
   owner, and there is no leaderboard to protect. The anti-farm measures exist
   to stop LAZY IN-APP farming, which is the behaviour a student actually
   drifts into. */

  /* ── boot ────────────────────────────────────────────────── */
  function init() {
    window.addEventListener("hashchange", handleRoute);
    S.onChange(syncHeader);
    syncHeader();
    handleRoute();
  }

  return { route, go, init, handleRoute, syncHeader, applyTheme, toast, modal, closeModal,
           confirmDialog, award, gameShell, results, reviewSheet, reviewOnScreen,
           rank, chip, tierChip, onLeave, pulse,
           formulaPenalty, MIN_BONUS_ACCURACY, MIN_READ_MS };
})();

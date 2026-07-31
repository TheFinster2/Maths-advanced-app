/* THE TOOLBELT — the two things you actually have on the desk in an exam,
   available inside every game mode without leaving the question.

     📄  Formula Sheet   — every formula, labelled with whether NESA prints it
     ✏️  Working         — a scribble pad and a notes field

   ── why the formula sheet is not simply free ────────────────────────────────
   In the exam you are handed the NESA reference sheet. Everything on it costs
   you nothing to look up, so in here it costs nothing either: those formulas
   are always visible, always searchable, no penalty, no latch.

   Everything NOT on that sheet is a different matter. In the exam nobody hands
   it to you, so looking it up mid-run is a crutch, and it is priced like every
   other crutch in this app (see equiv.js and lab.js): the moment you reveal one
   the run drops to 80% XP, and it LATCHES — closing the sheet does not refund
   it. Anything else would make the flag decorative. The point of separating the
   two lists is to make you notice which half you are leaning on.

   The scribble pad is free and always will be. Working out is not cheating.

   ── teardown ───────────────────────────────────────────────────────────────
   The FAB and the sheet live OUTSIDE #view, because #view is emptied on every
   route change. They are removed through UI.onLeave(), which accumulates
   handlers rather than replacing them — see the comment in ui.js. */
window.MQ = window.MQ || {};

MQ.Toolbelt = (function () {
  const U = MQ.U;

  /** XP multiplier applied for the rest of the run once an off-sheet formula
      is revealed. Mirrors the live-check crutch in the Equivalence Engine. */
  const CRUTCH = 0.8;

  /* Run-scoped state. `revealed` is a Set of formula ids so a second look at
     the same formula does not read as a second offence — the crutch is being
     TOLD the formula, and you can only be told once. */
  let offSheetLooks = 0;
  let revealed = new Set();
  let scored = false;

  /* Pad state, kept across tab switches and sheet closes but not across runs.
     Points are stored NORMALISED to 0..1 so a rotation or a keyboard opening
     does not smear the working. */
  let strokes = [];
  let penColor = "accent";
  let penWidth = 2.6;

  let sheetEl = null, fabEl = null;

  /* ── run lifecycle ─────────────────────────────────────────── */

  /** Called by UI.gameShell(). `opts.scored` is false for the reference
      screens, where nothing is being paid out and nothing should be hidden. */
  function beginRun(opts) {
    const o = opts || {};
    offSheetLooks = 0;
    revealed = new Set();
    scored = o.scored !== false;
    strokes = [];
  }

  const lookups = () => offSheetLooks;
  const usedCrutch = () => offSheetLooks > 0;
  /** The XP multiplier this run has earned itself. 1 until an off-sheet look. */
  const penalty = () => (offSheetLooks > 0 ? CRUTCH : 1);

  /* ── the floating button ───────────────────────────────────── */

  /**
   * Mount the toolbelt button for the current screen and register its teardown.
   * Safe to call twice — the second call replaces the first button.
   */
  function mount(opts) {
    beginRun(opts);
    unmount();

    fabEl = U.el("div", { class: "tb-fab" }, [
      U.el("button", {
        class: "tb-fab-btn", "aria-label": "Formula sheet", title: "Formula sheet",
        on: { click: () => open("formulas") }
      }, [U.el("span", { class: "tb-fab-ico", text: "📄" })]),
      U.el("button", {
        class: "tb-fab-btn", "aria-label": "Working out", title: "Working out",
        on: { click: () => open("working") }
      }, [U.el("span", { class: "tb-fab-ico", text: "✏️" })])
    ]);
    document.body.appendChild(fabEl);
    MQ.UI.onLeave(unmount);
  }

  /**
   * Tear the toolbelt down AND end the run it belonged to.
   *
   * The reset belongs here rather than only in beginRun(): this is what the
   * router calls when you leave, so this is the moment the run is actually
   * over. Leaving the crutch latched past the end of a run would quietly tax
   * the next one, and leaving the scribbles up would show one question's
   * working over the top of the next.
   */
  function unmount() {
    close();
    if (fabEl) { fabEl.remove(); fabEl = null; }
    offSheetLooks = 0;
    revealed = new Set();
    strokes = [];
  }

  /* ── the sheet ─────────────────────────────────────────────── */

  function open(tab) {
    close();
    MQ.Sound && MQ.Sound.nav && MQ.Sound.nav();

    const body = U.el("div", { class: "tb-body" });
    const tabs = U.el("div", { class: "tb-tabs" });

    const mk = (id, label) => {
      const b = U.el("button", { class: "tb-tab", text: label,
        on: { click: () => { setTab(id); } } });
      b.dataset.tab = id;
      return b;
    };
    const tFormulas = mk("formulas", "📄 Formulas");
    const tWorking  = mk("working",  "✏️ Working");
    tabs.appendChild(tFormulas);
    tabs.appendChild(tWorking);

    function setTab(id) {
      U.$$(".tb-tab", tabs).forEach(b => b.classList.toggle("on", b.dataset.tab === id));
      body.innerHTML = "";
      body.appendChild(id === "working" ? workingPad() : formulaPanel({ scored }));
    }

    sheetEl = U.el("div", { class: "tb-sheet-root" }, [
      U.el("div", { class: "tb-scrim", on: { click: close } }),
      U.el("div", { class: "tb-sheet", role: "dialog", "aria-label": "Toolbelt" }, [
        U.el("div", { class: "tb-grab" }),
        U.el("div", { class: "tb-head" }, [
          tabs,
          U.el("button", { class: "tb-close", text: "✕", "aria-label": "Close", on: { click: close } })
        ]),
        body
      ])
    ]);
    document.body.appendChild(sheetEl);
    setTab(tab === "working" ? "working" : "formulas");

    escHandler = e => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", escHandler);
  }

  let escHandler = null;

  function close() {
    if (escHandler) { document.removeEventListener("keydown", escHandler); escHandler = null; }
    if (sheetEl) { sheetEl.remove(); sheetEl = null; }
  }

  /* ── the formula panel ─────────────────────────────────────── */

  /**
   * The searchable formula list. Also used, unscored, by the standalone
   * Formula Sheet screen — pass { scored:false } and nothing is hidden.
   */
  function formulaPanel(opts) {
    const o = opts || {};
    const isScored = o.scored !== false;
    const wrap = U.el("div", { class: "tb-panel" });

    const search = U.el("input", {
      class: "ref-search", type: "search", autocomplete: "off",
      placeholder: "Search — \"quotient rule\", \"annuity\", \"projection\""
    });

    let filter = "all";
    const filterRow = U.el("div", { class: "tb-filters" });
    [["all", "Everything"], ["sheet", "✅ On the HSC sheet"], ["learn", "🧠 Memorise"]]
      .forEach(([id, label]) => {
        const b = U.el("button", { class: "chip chip-btn" + (id === "all" ? " on" : ""), text: label,
          on: { click: () => {
            filter = id;
            U.$$(".chip", filterRow).forEach(c => c.classList.toggle("on", c === b));
            draw();
          } } });
        filterRow.appendChild(b);
      });

    const list = U.el("div", { class: "tb-list" });

    /* The honesty note. A wrong ✅ is worse than no label at all, because it
       teaches a student not to learn something they will not be given. */
    const disclaimer = U.el("p", { class: "tiny muted tb-disclaimer", html:
      "✅ <b>On the HSC sheet</b> means NESA prints it on the reference sheet you are given in the exam. " +
      "🧠 <b>Memorise</b> means they do not. Checked against the current " +
      "Mathematics Advanced / Extension 1 reference sheet — NESA does revise it, so confirm " +
      "against the copy in your exam pack before you rely on it." });

    function draw() {
      list.innerHTML = "";
      const sections = MQ.Formulas.grouped(search.value, filter);
      if (!sections.length) {
        list.appendChild(U.el("div", { class: "empty" }, [
          U.el("div", { class: "empty-ico", text: "🔍" }),
          U.el("p", { text: "Nothing matches that. Try a shorter word." })
        ]));
        return;
      }
      sections.forEach(sec => {
        list.appendChild(U.el("div", { class: "tb-group" }, [
          U.el("span", { text: sec.group.icon }),
          U.el("span", { text: sec.group.name }),
          U.el("span", { class: "tb-group-n", text: String(sec.items.length) })
        ]));
        sec.items.forEach(f => list.appendChild(row(f)));
      });
    }

    function row(f) {
      const badge = f.nesa
        ? U.el("span", { class: "nesa-badge yes", text: "✅ HSC sheet",
            title: "Printed on the NESA reference sheet — free to look up in the exam" })
        : U.el("span", { class: "nesa-badge no", text: "🧠 Memorise",
            title: "NOT on the NESA reference sheet — you must know this one" });

      const head = U.el("div", { class: "tb-row-head" }, [
        U.el("span", { class: "tb-row-name", text: f.name }),
        MQ.UI.tierChip(f.tier + "-x"),
        badge
      ]);

      const bodyWrap = U.el("div", { class: "tb-row-body" });
      const node = U.el("div", {}, [
        U.el("div", { class: "math tb-tex", html: U.math(f.tex) }),
        f.hint ? U.el("div", { class: "math tb-hint", html: U.math(f.hint) }) : null
      ]);

      /* On the sheet, or not being scored: just show it. */
      if (f.nesa || !isScored || revealed.has(f.id)) {
        bodyWrap.appendChild(node);
      } else {
        const cost = usedCrutch()
          ? "Already at 80% XP this run"
          : "Reveals it and drops this run to 80% XP";
        const btn = U.el("button", { class: "btn btn-sm tb-reveal" }, [
          U.el("span", { text: "🧠 Tap to reveal" }),
          U.el("span", { class: "tiny muted", text: cost })
        ]);
        btn.addEventListener("click", () => {
          revealed.add(f.id);
          offSheetLooks++;
          MQ.State.bump && MQ.State.bump("formulaLookups");
          if (offSheetLooks === 1) {
            MQ.UI.toast({ icon: "🧠", kind: "bad", ms: 3200, text:
              "<b>Off-sheet formula revealed.</b> This run now pays 80% XP — " +
              "NESA would not have given you that one." });
          }
          bodyWrap.innerHTML = "";
          bodyWrap.appendChild(node);
          /* Other hidden rows now show the cheaper "already charged" wording. */
          U.$$(".tb-reveal .muted", list).forEach(s => { s.textContent = "Already at 80% XP this run"; });
        });
        bodyWrap.appendChild(btn);
      }

      return U.el("div", { class: "tb-row" + (f.nesa ? " is-sheet" : " is-learn") }, [head, bodyWrap]);
    }

    search.addEventListener("input", draw);
    wrap.appendChild(search);
    wrap.appendChild(filterRow);
    wrap.appendChild(disclaimer);
    wrap.appendChild(list);
    draw();
    return wrap;
  }

  /* ── the working-out pad ───────────────────────────────────────
     A canvas you can write on with a finger or a stylus, plus a text field for
     anyone who would rather type. Strokes are kept as normalised points rather
     than as pixels so that rotating the phone, or the on-screen keyboard
     resizing the viewport, redraws the working instead of scrambling it. */

  function workingPad() {
    const S = MQ.State;
    const wrap = U.el("div", { class: "tb-panel" });

    const canvas = U.el("canvas", { class: "tb-canvas" });
    const ctx = canvas.getContext ? canvas.getContext("2d") : null;

    const COLORS = [["accent", "--accent"], ["ink", "--ink"], ["warn", "--warn"], ["bad", "--bad"]];
    function colorOf(name) {
      const found = COLORS.find(c => c[0] === name) || COLORS[0];
      return getComputedStyle(document.documentElement).getPropertyValue(found[1]).trim() || "#39d6c8";
    }

    function fit() {
      if (!ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      redraw();
    }

    function redraw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      strokes.forEach(st => {
        if (st.pts.length < 2) {
          if (!st.pts.length) return;
          // A single tap is a dot, not nothing.
          ctx.beginPath();
          ctx.fillStyle = colorOf(st.color);
          ctx.arc(st.pts[0][0] * canvas.width, st.pts[0][1] * canvas.height,
                  (st.width * canvas.width) / 400, 0, Math.PI * 2);
          ctx.fill();
          return;
        }
        ctx.beginPath();
        ctx.strokeStyle = colorOf(st.color);
        ctx.lineWidth = (st.width * canvas.width) / 200;
        ctx.moveTo(st.pts[0][0] * canvas.width, st.pts[0][1] * canvas.height);
        /* Quadratic midpoints, so a fast finger draws a curve rather than a
           run of visible straight segments. */
        for (let i = 1; i < st.pts.length - 1; i++) {
          const cx = st.pts[i][0] * canvas.width, cy = st.pts[i][1] * canvas.height;
          const nx = (st.pts[i][0] + st.pts[i + 1][0]) / 2 * canvas.width;
          const ny = (st.pts[i][1] + st.pts[i + 1][1]) / 2 * canvas.height;
          ctx.quadraticCurveTo(cx, cy, nx, ny);
        }
        const last = st.pts[st.pts.length - 1];
        ctx.lineTo(last[0] * canvas.width, last[1] * canvas.height);
        ctx.stroke();
      });
    }

    let drawing = null;
    function pointAt(e) {
      const r = canvas.getBoundingClientRect();
      return [U.clamp((e.clientX - r.left) / r.width, 0, 1),
              U.clamp((e.clientY - r.top) / r.height, 0, 1)];
    }
    canvas.addEventListener("pointerdown", e => {
      e.preventDefault();
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
      drawing = { color: penColor, width: penWidth, pts: [pointAt(e)] };
      strokes.push(drawing);
      redraw();
    });
    canvas.addEventListener("pointermove", e => {
      if (!drawing) return;
      e.preventDefault();
      drawing.pts.push(pointAt(e));
      redraw();
    });
    const stop = () => { drawing = null; };
    canvas.addEventListener("pointerup", stop);
    canvas.addEventListener("pointercancel", stop);
    canvas.addEventListener("pointerleave", stop);

    /* tools */
    const tools = U.el("div", { class: "tb-tools" });
    COLORS.forEach(([name]) => {
      const dot = U.el("button", { class: "tb-pen" + (name === penColor ? " on" : ""),
        "aria-label": "Pen colour " + name });
      dot.style.background = `var(${COLORS.find(c => c[0] === name)[1]})`;
      dot.addEventListener("click", () => {
        penColor = name;
        U.$$(".tb-pen", tools).forEach(d => d.classList.toggle("on", d === dot));
      });
      tools.appendChild(dot);
    });
    const sizes = [["S", 1.6], ["M", 2.6], ["L", 4.4]];
    sizes.forEach(([label, w]) => {
      const b = U.el("button", { class: "chip chip-btn" + (w === penWidth ? " on" : ""), text: label });
      b.addEventListener("click", () => {
        penWidth = w;
        U.$$(".chip", tools).forEach(c => c.classList.toggle("on", c === b));
      });
      tools.appendChild(b);
    });
    tools.appendChild(U.el("div", { class: "spacer" }));
    tools.appendChild(U.el("button", { class: "btn btn-sm btn-ghost", text: "↩ Undo",
      on: { click: () => { strokes.pop(); redraw(); } } }));
    tools.appendChild(U.el("button", { class: "btn btn-sm btn-ghost", text: "Clear",
      on: { click: () => { strokes = []; redraw(); } } }));

    /* typed notes — these DO persist, because they are cheap to store and
       losing a page of typed working to a reload is infuriating. */
    const notes = U.el("textarea", { class: "tb-notes", rows: "4", spellcheck: "false",
      placeholder: "…or type your working here. Saved automatically." });
    notes.value = (S.data && S.data.scratch) || "";
    notes.addEventListener("input", () => {
      if (!S.data) return;
      S.data.scratch = notes.value.slice(0, 4000);
      S.save();
    });

    wrap.appendChild(U.el("p", { class: "tiny muted", style: "margin:0 0 8px", text:
      "Free, always. Working out is not a crutch — it is the subject." }));
    wrap.appendChild(U.el("div", { class: "tb-canvas-wrap" }, [canvas]));
    wrap.appendChild(tools);
    wrap.appendChild(notes);

    /* The canvas has no size until it is in the document. */
    setTimeout(fit, 0);
    const onResize = () => fit();
    window.addEventListener("resize", onResize);
    MQ.UI.onLeave(() => window.removeEventListener("resize", onResize));

    return wrap;
  }

  return { mount, unmount, open, close, beginRun, formulaPanel, workingPad,
           lookups, usedCrutch, penalty, CRUTCH };
})();

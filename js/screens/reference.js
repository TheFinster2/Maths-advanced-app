/* 📖 The Reference Library, and 📄 the Formula Sheet.

   Two different tools, deliberately kept separate:

     /reference   — seventeen TEACHING sheets. Tables you read: exact values,
                    the unit circle, the induction template. Long-form.
     /formulas    — one flat, searchable LOOKUP list. What you want when you
                    are three lines into a question and cannot remember the
                    quotient rule. The same list the in-play Toolbelt shows.

   Both label every formula with whether NESA prints it on the reference sheet
   you are handed in the exam. Reading either earns NOTHING. That is
   deliberate: they should be what you reach for when stuck, not another XP
   faucet. The only thing tracked is a count, so the "Looked It Up"
   achievement has something to fire on. */
window.MQ = window.MQ || {};
MQ.Screens = MQ.Screens || {};

/* A small ✅ / 🧠 marker. Used in both screens, so it lives in one place. */
MQ.Screens.nesaBadge = function (isNesa, compact) {
  const U = MQ.U;
  return U.el("span", {
    class: "nesa-badge " + (isNesa ? "yes" : "no"),
    text: isNesa ? (compact ? "✅" : "✅ HSC sheet") : (compact ? "🧠" : "🧠 Memorise"),
    title: isNesa
      ? "Printed on the NESA reference sheet — you get this one in the exam"
      : "NOT on the NESA reference sheet — you have to know this one"
  });
};

/* ── the flat formula sheet ─────────────────────────────────── */
MQ.Screens.formulas = function (view) {
  const U = MQ.U, S = MQ.State, UI = MQ.UI;

  S.bump("referenceReads");
  S.checkAchievements().forEach((a, i) => setTimeout(() => {
    MQ.Sound.achievement();
    UI.toast({ icon: a.icon, kind: "good", text: `<b>${U.escapeHtml(a.name)}</b> unlocked` });
  }, 400 + i * 800));

  const total = MQ.Formulas.all().length;
  const sheet = MQ.Formulas.onSheet().length;

  view.appendChild(U.el("h1", { text: "Formula Sheet" }));
  view.appendChild(U.el("p", { text:
    "Every formula the course uses, searchable, and marked with the one thing no textbook " +
    "tells you: whether you are given it in the exam." }));

  view.appendChild(U.el("div", { class: "grid g3", style: "margin-bottom:14px" }, [
    U.el("div", { class: "card stat-tile" }, [
      U.el("div", { class: "stat-num", text: String(total) }),
      U.el("div", { class: "stat-lbl", text: "Formulas" })
    ]),
    U.el("div", { class: "card stat-tile" }, [
      U.el("div", { class: "stat-num", text: String(sheet) }),
      U.el("div", { class: "stat-lbl", text: "On the HSC sheet" })
    ]),
    U.el("div", { class: "card stat-tile" }, [
      U.el("div", { class: "stat-num", text: String(total - sheet) }),
      U.el("div", { class: "stat-lbl", text: "To memorise" })
    ])
  ]));

  /* Unscored: nothing is hidden and nothing is charged. You are not mid-run. */
  view.appendChild(MQ.Toolbelt.formulaPanel({ scored: false }));

  view.appendChild(U.el("p", { class: "arcade-note", style: "margin-top:12px", text:
    "Reading this earns no XP. Inside a game the memorise-only formulas cost 20% of the " +
    "run's XP to reveal — out here they are free." }));

  view.appendChild(U.el("button", {
    class: "btn btn-block", style: "margin-top:10px", text: "📖 Reference Library — the long-form sheets",
    on: { click: () => UI.go("/reference") }
  }));
};

/* ── the teaching sheets ────────────────────────────────────── */
MQ.Screens.reference = function (view, args) {
  const U = MQ.U, S = MQ.State, UI = MQ.UI;

  if (args && args[0]) return sheet(args[0]);
  return index();

  function index() {
    view.appendChild(U.el("h1", { text: "Reference Library" }));
    view.appendChild(U.el("p", { text:
      "Every formula the course needs, on one screen each. Search across titles, " +
      "rows and notes — this reads the whole table, not just the headings." }));

    view.appendChild(U.el("button", {
      class: "btn btn-primary btn-block", style: "margin-bottom:14px",
      text: "📄 Open the flat Formula Sheet",
      on: { click: () => UI.go("/formulas") }
    }));

    const search = U.el("input", {
      class: "ref-search", type: "search", placeholder: "Search — try \"chain rule\", \"z-score\", \"projectile\"",
      autocomplete: "off"
    });
    const results = U.el("div", { class: "grid g2", style: "margin-top:14px" });

    function draw(term) {
      results.innerHTML = "";
      const found = MQ.Reference.search(term);
      if (!found.length) {
        results.appendChild(U.el("div", { class: "empty", style: "grid-column:1/-1" }, [
          U.el("div", { class: "empty-ico", text: "🔍" }),
          U.el("p", { text: "Nothing matches that. Try a shorter word." })
        ]));
        return;
      }
      found.forEach(r => {
        const printed = r.rows.filter(MQ.Reference.isNesa).length;
        const card = U.el("button", { class: "game-card", style: "--gc:var(--glow-a)" }, [
          U.el("div", { class: "game-ico", text: r.icon }),
          U.el("div", { class: "game-name", text: r.title }),
          U.el("div", { class: "game-desc", text: r.blurb }),
          U.el("div", { class: "game-foot" }, [
            U.el("span", { class: "chip", text: r.rows.length + " rows" }),
            U.el("span", { class: "nesa-badge " + (printed ? "yes" : "no"),
              text: printed ? "✅ " + printed + " printed" : "🧠 none printed",
              title: "How many rows appear on the NESA reference sheet" }),
            r.tier === "ME" ? U.el("span", { class: "chip chip-ext", text: "EXT" }) : null
          ])
        ]);
        card.addEventListener("click", () => UI.go("/reference/" + r.id));
        results.appendChild(card);
      });
    }

    search.addEventListener("input", () => draw(search.value));
    view.appendChild(search);
    view.appendChild(results);
    draw("");
    setTimeout(() => search.focus(), 60);
  }

  function sheet(id) {
    const r = MQ.Reference.byId(id);
    if (!r) return UI.go("/reference");

    S.bump("referenceReads");
    // Reading reference material triggers an achievement CHECK but pays no XP.
    S.checkAchievements().forEach((a, i) => setTimeout(() => {
      MQ.Sound.achievement();
      UI.toast({ icon: a.icon, kind: "good", text: `<b>${U.escapeHtml(a.name)}</b> unlocked` });
    }, 400 + i * 800));

    /* toolbelt:false — this screen IS the reference material. Floating a second
       formula sheet over the top of it would be absurd. */
    const shell = UI.gameShell(r.icon + " " + r.title, { backTo: "/reference", toolbelt: false });
    view.appendChild(shell.root);

    shell.body.appendChild(U.el("p", { text: r.blurb }));

    /* H5: on a long sheet the column headings scroll away, so they are pinned.
       --topbar-h is measured in app.js and republished on resize.

       The first column carries the ✅/🧠 marker rather than it having a column
       of its own: an extra column on a four-column table pushes a 390 px phone
       into horizontal scrolling for one glyph. */
    const table = U.el("table", { class: "ref-table" }, [
      U.el("thead", {}, [U.el("tr", {}, r.cols.map(h =>
        U.el("th", { class: "math", html: U.math(h) })))]),
      U.el("tbody", {}, r.rows.map(row => {
        const printed = MQ.Reference.isNesa(row);
        const cells = MQ.Reference.cells(row);
        return U.el("tr", { class: printed ? "row-nesa" : "" }, cells.map((cell, i) =>
          U.el("td", { class: "math" }, i === 0
            ? [MQ.Screens.nesaBadge(printed, true), U.el("span", { html: U.math(cell) })]
            : [U.el("span", { html: U.math(cell) })])));
      }))
    ]);
    shell.body.appendChild(U.el("div", { class: "card" }, [
      U.el("div", { class: "ref-scroll" }, [table])
    ]));

    shell.body.appendChild(U.el("div", { class: "row tiny muted", style: "gap:14px" }, [
      MQ.Screens.nesaBadge(true), U.el("span", { text: "printed on the NESA reference sheet" }),
      MQ.Screens.nesaBadge(false), U.el("span", { text: "you have to know it" })
    ]));

    if (r.note) {
      shell.body.appendChild(U.el("div", { class: "feedback math", html: U.math(r.note) }));
    }

    shell.body.appendChild(U.el("p", { class: "arcade-note", style: "margin-top:8px",
      text: "Reading the reference sheets awards no XP — it is a tool, not a game mode." }));

    /* Straight to practice on the same material. */
    const topics = MQ.Bank.topics().filter(t => {
      const hay = (r.title + " " + r.blurb).toLowerCase();
      return hay.includes(t.short.toLowerCase()) || hay.includes(t.group.toLowerCase());
    });
    if (topics.length) {
      shell.body.appendChild(U.el("button", {
        class: "btn btn-primary btn-block",
        text: "🎯 Drill " + topics[0].short,
        on: { click: () => UI.go("/game/drill/" + topics[0].id) }
      }));
    }
  }
};

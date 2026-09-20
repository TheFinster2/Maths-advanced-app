/* Progress — mastery per topic, the XP heatmap, mistakes, and Ascension. */
window.MQ = window.MQ || {};
MQ.Screens = MQ.Screens || {};

MQ.Screens.progress = function (view) {
  const U = MQ.U, S = MQ.State, UI = MQ.UI;
  const d = S.data;

  view.appendChild(U.el("h1", { text: "Progress" }));

  view.appendChild(U.el("div", { class: "grid g4" }, [
    tile(d.lifetimeXp.toLocaleString(), "Lifetime XP"),
    tile(d.stats.answered.toLocaleString(), "Answered"),
    tile(S.overallAccuracy() + "%", "Accuracy"),
    tile(d.stats.bestStreak, "Best streak")
  ]));

  /* ── the XP heatmap ── */
  view.appendChild(U.el("h2", {}, [
    document.createTextNode("Last 12 weeks"),
    U.el("span", { class: "h2-sub", text: "XP per day" })
  ]));
  /* Columns are WEEKS and rows are weekdays, like every contribution graph
     worth reading. The grid was auto-filling to whatever fitted — about 20
     columns — which wrapped 84 days into four ragged rows where neither axis
     meant anything: you could not find "last Tuesday" or "three weeks ago",
     so it was texture rather than data.

     Built column-major and laid out with grid-auto-flow:column so the DOM
     order stays chronological (which is what a screen reader gets) while the
     visual grid reads top-to-bottom within a week, left-to-right across
     weeks. The last column ends today, so the final partial week is at the
     right-hand edge where it belongs. */
  const heat = U.el("div", { class: "heat" });
  const today = new Date();
  // Back up to the most recent Monday so every column is a whole week.
  const offsetToMonday = (today.getDay() + 6) % 7;
  const values = [];
  for (let i = offsetToMonday + 77; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    values.push({ key: U.dayKey(day), xp: d.history[U.dayKey(day)] || 0, dow: (day.getDay() + 6) % 7 });
  }
  const peak = Math.max(1, ...values.map(v => v.xp));
  values.forEach(v => {
    const lv = v.xp === 0 ? 0 : Math.min(4, Math.ceil((v.xp / peak) * 4));
    heat.appendChild(U.el("div", { class: "heat-day", data: { lv: String(lv) },
      style: "grid-row:" + (v.dow + 1),
      title: `${v.key}: ${v.xp} XP` }));
  });
  view.appendChild(U.el("div", { class: "card" }, [
    heat,
    U.el("div", { class: "tiny muted", style: "margin-top:8px",
      text: "One column per week, Monday at the top. This week is on the right." })
  ]));

  /* ── mastery, every topic, grouped by tier ── */
  view.appendChild(U.el("h2", {}, [
    document.createTextNode("Mastery by topic"),
    U.el("span", { class: "h2-sub", text: "accuracy × how much you have seen" })
  ]));
  /* "10/15 correct … 40%" reads as a bug unless the screen says why. Mastery
     is confidence-weighted: a perfect three-question run is not mastery, so
     the percentage is held down until the sample is big enough to mean
     something. Home said so; the screen actually showing the number did not. */
  view.appendChild(U.el("p", { class: "tiny muted", style: "margin:-6px 0 10px", text:
    "Mastery is not your raw score — it is scaled by how many questions you have " +
    "attempted, so it climbs as you build a track record rather than jumping to " +
    "100% after three lucky answers." }));
  const stats = MQ.Bank.statsByTopic();
  MQ.DATA.TIERS.forEach(tier => {
    const rows = stats.filter(t => t.tier === tier);
    if (!rows.length) return;
    const card = U.el("div", { class: "card", style: "margin-bottom:12px" }, [
      U.el("div", { class: "row", style: "margin-bottom:6px" }, [
        U.el("h3", { style: "margin:0", text: MQ.DATA.TIER_META[tier].name }),
        U.el("div", { class: "spacer" }),
        U.el("span", { class: "chip" + (tier === "ME" ? " chip-ext" : ""),
          text: MQ.DATA.TIER_META[tier].chip })
      ])
    ]);
    rows.forEach(t => {
      const mt = S.masteryTier(t.mastery);
      card.appendChild(U.el("div", { class: "mastery-item" }, [
        U.el("div", { class: "mastery-badge", style: `color:${mt.colour}`, text: mt.icon }),
        U.el("div", { class: "mastery-body" }, [
          U.el("div", { class: "mastery-name", text: t.id + " · " + t.short }),
          U.el("div", { class: "bar" }, [U.el("i", { style: `width:${t.mastery}%` })]),
          U.el("div", { class: "tiny muted", style: "margin-top:4px",
            text: `${t.correct}/${t.seen} correct · ${t.total} questions available` })
        ]),
        U.el("div", { class: "mastery-pct", text: t.mastery + "%" })
      ]));
    });
    view.appendChild(card);
  });

  /* ── the review queue ────────────────────────────────────────
     Two different numbers, and showing only one of them is how the queue stops
     making sense: DUE is what to do today, IN THE QUEUE is what is still not
     learnt. A question leaves only after five correct recalls across widening
     gaps, so the second number falls slowly and that is the design working,
     not the student failing. Say so, or it reads as a backlog you can never
     clear. */
  const dueCount = S.dueReviews().length;
  const queued = (d.mistakes || []).length;
  const preview = MQ.Bank.reviewQuestions(dueCount > 0).slice(0, 6);

  view.appendChild(U.el("h2", {}, [
    document.createTextNode("Review queue"),
    U.el("span", { class: "h2-sub", text: queued ? dueCount + " due · " + queued + " in the queue" : "empty" })
  ]));
  if (!queued) {
    view.appendChild(U.el("div", { class: "card" }, [
      U.el("p", { style: "margin:0", text:
        "Nothing queued. A question you miss lands here and comes back on a widening schedule — " +
        "once more this session, then after a day, two, four and eight — until you have " +
        "recalled it right five times." })
    ]));
  } else {
    view.appendChild(U.el("div", { class: "card", style: "margin-bottom:10px" }, [
      U.el("p", { class: "tiny muted", style: "margin:0", text: dueCount
        ? dueCount + " ready now. The rest are deliberately waiting — the gap is what makes the " +
          "recall stick, so bringing them forward would waste them."
        : "Nothing due today. These are all ahead of schedule, so answering them now will not " +
          "advance them — coming back tomorrow is worth more than grinding them today." })
    ]));
    preview.forEach(q => {
      const rec = S.reviewEntry(q.id) || {};
      view.appendChild(U.el("div", { class: "wrongq" }, [
        U.el("div", { class: "q math", html: U.math(q.q) }),
        U.el("div", { class: "a math", html: "→ " + U.math(q.choices[q.a]) }),
        U.el("div", { class: "tiny muted", style: "margin-top:4px", text:
          "Step " + (rec.box || 1) + " of 5" +
          (rec.misses > 1 ? " · missed " + rec.misses + "×" : "") +
          (rec.hiConf ? " · you were sure on this one" : "") })
      ]));
    });
    view.appendChild(U.el("button", {
      class: "btn btn-primary btn-block",
      text: dueCount ? "🩹 Review the " + Math.min(dueCount, 15) + " due now"
                     : "🩹 Look at them anyway (no credit)",
      on: { click: () => UI.go("/game/mistakes") }
    }));
  }

  /* ── calibration ─────────────────────────────────────────────
     What "I know it" is actually worth. The gap between the label and the
     percentage is the useful number: a student who is right 55% of the time
     when certain is not short of practice, they are short of a way to tell
     which of their beliefs are wrong — and that is the thing no amount of
     re-reading fixes. */
  const calib = S.calibration();
  if (calib.length) {
    const sure = calib.find(c => c.id === "sure");
    view.appendChild(U.el("h2", {}, [
      document.createTextNode("Calibration"),
      U.el("span", { class: "h2-sub", text: "how well you know what you know" })
    ]));
    const card = U.el("div", { class: "card" });
    calib.forEach(c => {
      /* Coloured by DISTANCE FROM TARGET, not by height. Three identical bars
         hide the only thing this chart is for: 33% on "No idea" is honest and
         60% on "I know it" is not, and they must not look the same. */
      card.appendChild(U.el("div", { class: "calib-row calib-" + c.band }, [
        U.el("div", { class: "calib-lbl", text: c.label }),
        U.el("div", { class: "calib-bar" }, [
          U.el("i", { style: "width:" + c.pct + "%" }),
          // Where a well-calibrated student would land.
          U.el("b", { class: "calib-target", style: "left:" + c.target + "%",
            title: "about " + c.target + "% for a well-calibrated student" })
        ]),
        U.el("div", { class: "calib-pct", text: c.pct + "% of " + c.n })
      ]));
    });
    card.appendChild(U.el("p", { class: "tiny muted", style: "margin:10px 0 0", text:
      !sure || sure.n < 10
        ? "Answer a few more with the recall check on and this becomes meaningful."
        : sure.pct >= 85
          ? "Well calibrated — when you say you know it, you do. Trust that feeling in the exam."
          : sure.pct >= 70
            ? "Slightly overconfident. The ones you were sure about and still missed are the " +
              "cheapest marks you will ever pick up."
            : "You are markedly overconfident, and that is worth more than it sounds: it means " +
              "your revision is being spent on things you already know. The queue is now " +
              "prioritising the ones you were sure about." }));
    view.appendChild(card);
  }

  /* ── achievements shortcut ── */
  const total = MQ.DATA.enabledAchievements().length;
  const done = MQ.DATA.enabledAchievements().filter(a => d.achievements[a.id]).length;
  view.appendChild(U.el("h2", { text: "Achievements" }));
  view.appendChild(U.el("div", { class: "card" }, [
    U.el("div", { class: "row" }, [
      U.el("div", { style: "flex:1; min-width:0" }, [
        U.el("div", { class: "bar" }, [U.el("i", { style: `width:${U.pct(done, total)}%` })]),
        U.el("div", { class: "tiny muted", style: "margin-top:6px", text: `${done} of ${total} unlocked` })
      ]),
      U.el("button", { class: "btn btn-sm", text: "View all", on: { click: () => UI.go("/achievements") } })
    ])
  ]));

  /* ── ascension ── */
  view.appendChild(U.el("h2", { text: "Ascension" }));
  const canAscend = S.canPrestige();
  view.appendChild(U.el("div", { class: "card" }, [
    U.el("p", { html: canAscend
      ? "You have reached level 60. <b>Ascending</b> resets your level and XP but keeps every " +
        "unlock, achievement, flashcard box and statistic — and grants a permanent <b>+12% XP</b>, " +
        "which stacks with every ascension."
      : `Reach level 60 to Ascend. You are level <b>${d.level}</b>.` +
        (d.prestige ? ` You have ascended <b>${d.prestige}</b> time${d.prestige === 1 ? "" : "s"} — currently +${d.prestige * 12}% XP.` : "") }),
    U.el("button", {
      class: "btn " + (canAscend ? "btn-primary" : "") + " btn-block",
      disabled: !canAscend,
      text: canAscend ? "🔱 Ascend" : "🔒 Locked until level 60",
      on: { click: () => UI.confirmDialog("Ascend?",
        "Your level and XP reset to 1. Everything else stays, and you gain a permanent +12% XP.",
        () => {
          if (!S.doPrestige()) return;
          MQ.Sound.prestige();
          MQ.FX.confetti(200);
          UI.toast({ icon: "🔱", kind: "good", ms: 5000,
            text: `<b>Ascended.</b> Permanent bonus is now +${S.data.prestige * 12}% XP.` });
          UI.handleRoute();
        }, "Ascend") }
    })
  ]));

  function tile(num, label) {
    return U.el("div", { class: "card stat-tile" }, [
      U.el("div", { class: "stat-num", text: String(num) }),
      U.el("div", { class: "stat-lbl", text: label })
    ]);
  }
};

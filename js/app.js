/* Bootstrap: load the save, register routes, wire the chrome, start the app,
   and handle service-worker updates — which is the fiddliest part of this file
   and the one that generated the most support questions in the reference app. */
window.MQ = window.MQ || {};

/* Shown in Settings. "What version am I actually on?" has to be answerable,
   or an update problem cannot be diagnosed at all. Keep in step with CACHE
   in sw.js — the validator asserts they match. */
MQ.VERSION = "1.6.0";

(function () {
  const U = MQ.U, S = MQ.State, UI = MQ.UI;

  S.load();

  /* The syllabus course, applied BEFORE the first route runs. The banks all
     memoise lazily on first access, so as long as nothing has rendered yet
     there is no stale cache to worry about — but move this below UI.init()
     and the first screen builds against the wrong tier. */
  S.applyCourse();

  /* Preferences applied before the first paint. */
  document.documentElement.dataset.theme =
    S.ownsTheme(S.data.profile.theme) ? S.data.profile.theme : "graph";
  document.documentElement.dataset.motion = S.data.settings.motion ? "on" : "off";
  document.documentElement.dataset.text = MQ.Screens.textSizeKey(S.data.settings.textScale);
  MQ.Sound.setEnabled(S.data.settings.sound);
  MQ.Sound.setVolume(S.data.settings.volume);
  MQ.FX.setReduced(!S.data.settings.motion);

  /* ── routes ─────────────────────────────────────────────── */
  UI.route("home",         view => MQ.Screens.home(view));
  UI.route("play",         view => MQ.Screens.play.screen(view));
  UI.route("game",   (view, args) => MQ.Screens.play.dispatch(view, args));
  UI.route("study",  (view, args) => MQ.Screens.study.screen(view, args));
  UI.route("reference", (view, args) => MQ.Screens.reference(view, args));
  UI.route("formulas",     view => MQ.Screens.formulas(view));
  UI.route("progress",     view => MQ.Screens.progress(view));
  UI.route("shop",         view => MQ.Screens.shop(view));
  UI.route("arcade", (view, args) => MQ.Arcade.screen(view, args));
  UI.route("achievements", view => MQ.Screens.achievements(view));
  UI.route("settings",     view => MQ.Screens.settings(view));

  /* ── chrome ─────────────────────────────────────────────── */
  U.$("#avatar-btn").addEventListener("click", () => MQ.Screens.profileSheet());
  U.$("#settings-btn").addEventListener("click", () => UI.go("/settings"));
  U.$("#coin-pill").addEventListener("click", () => UI.go("/shop"));
  U.$("#streak-pill").addEventListener("click", () => UI.go("/progress"));

  /* The top bar's height is NOT a constant — the safe-area inset changes it on
     notched phones and again on rotation — so sticky panels read it from a
     custom property that is remeasured rather than hard-coding a number. */
  function measureTopbar() {
    const bar = U.$("#topbar");
    if (!bar || bar.hidden) return;
    document.documentElement.style.setProperty("--topbar-h", bar.offsetHeight + "px");
  }
  window.addEventListener("resize", measureTopbar);
  window.addEventListener("orientationchange", () => setTimeout(measureTopbar, 250));

  /* Persist immediately when the app is backgrounded or closed.
     `visibilitychange` is the only event mobile browsers reliably fire before
     reclaiming a tab; a 200 ms debounce with no flush loses whatever was in
     flight when someone switches apps mid-question. */
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") S.flush();
  });
  window.addEventListener("pagehide", () => S.flush());

  /* The first gesture anywhere unlocks the WebAudio context. */
  const unlockAudio = () => {
    MQ.Sound.click();
    document.removeEventListener("pointerdown", unlockAudio);
  };
  document.addEventListener("pointerdown", unlockAudio);

  if (!location.hash) location.hash = "/home";
  UI.init();

  /* ── welcome ──────────────────────────────────────────────
     Also where the syllabus course is chosen. Asking once, here, is the whole
     reason the toggle is worth having: defaulting an Advanced-only student
     into Extension 1 content buries them in vectors and induction on day one,
     and they have no way of knowing the setting exists to turn it off.

     Opened immediately, not on a delay. A 900 ms timer let the home screen
     paint and become tappable first, so the student's very first interaction
     with the app was a modal stealing a tap they had already committed to. */
  if (S.data.stats.answered === 0 && Object.keys(S.data.history).length === 0) welcome();

  /* The course question is the whole modal, and it is ASKED rather than
     defaulted. Pre-highlighting the current course highlighted the build
     default — the widest one — so a student who tapped straight past the
     question was silently enrolled in Extension 1: 629 questions instead of
     424, twelve extra topics in the drill picker, and vectors and induction in
     their revision. That is the exact outcome the comment above says must not
     happen, and a pre-selected button is how it happened.

     Nothing else is on screen until it is answered, which also fixes the
     second problem: the feature list pushed the only exit below the fold on a
     844 px phone, so the button that starts the app needed a scroll to reach. */
  function welcome() {
    const courses = MQ.DATA.availableCourses();

    if (courses.length < 2) return welcomeIntro();    // nothing to ask

    UI.modal(U.el("div", { class: "modal-center" }, [
      U.el("div", { class: "modal-big", text: "∫" }),
      U.el("h2", { style: "justify-content:center", text: "Which course are you doing?" }),
      U.el("p", { class: "muted", text:
        "This decides what you are shown. You can change it any time in Settings." }),
      U.el("div", { class: "grid", style: "margin:18px 0 6px" }, courses.map(c =>
        U.el("button", { class: "btn btn-block", style: "text-align:left; padding:14px 16px" }, [
          U.el("div", { style: "font-weight:800; font-size:15px", text: c.icon + "  " + c.name }),
          U.el("div", { class: "tiny muted", style: "margin-top:3px; white-space:normal", text: c.desc })
        ])
      ).map((btn, i) => {
        btn.addEventListener("click", () => {
          S.setCourse(courses[i].id);
          MQ.Sound.equip();
          welcomeIntro();
        });
        return btn;
      }))
    ]), { sticky: true });
  }

  function welcomeIntro() {
    const ext = MQ.DATA.hasExt();
    UI.modal(U.el("div", { class: "modal-center" }, [
      U.el("div", { class: "modal-big", text: "∫" }),
      U.el("h2", { style: "justify-content:center", text: "Welcome to MathQuest" }),
      U.el("p", { html:
        "A game-based trainer for <b>HSC Mathematics " +
        (ext ? "Advanced and Extension 1" : "Advanced") + "</b>. " +
        "Answer questions to earn XP and <b>Primes</b> 🔢, level up, unlock themes, " +
        "and take down the " + (ext ? "six" : "five") + " Exam Bosses." }),
      U.el("div", { class: "grid", style: "text-align:left; margin:14px 0" }, [
        bullet("🎯", "It works out what you need",
          "Questions you miss come back on a widening schedule until they stick."),
        bullet("🔢", "Questions that never run out",
          MQ.Gen.enabled().length + " generators build fresh numeric problems every time.")
      ]),
      U.el("button", {
        class: "btn btn-primary btn-block", text: "Let's differentiate",
        on: { click: () => { UI.closeModal(); MQ.Sound.win(); MQ.FX.confetti(90); } }
      })
    ]), { sticky: true });
  }

  function bullet(icon, title, desc) {
    return U.el("div", { class: "row", style: "gap:12px; align-items:flex-start" }, [
      U.el("div", { style: "font-size:22px", text: icon }),
      U.el("div", {}, [
        U.el("div", { style: "font-weight:700; font-size:13.5px", text: title }),
        U.el("div", { class: "tiny muted", text: desc })
      ])
    ]);
  }

  /* ══════════════════════════════════════════════════════════
     OFFLINE SUPPORT AND UPDATES

     Registered only over http(s): service workers are unavailable on file://
     and attempting it there throws. The app works fine either way.

     The ordering below is load-bearing. Getting it wrong produces the exact
     symptom the reference app's user reported twice — "updates take forever
     to arrive" — and it is entirely self-inflicted:

     · A worker that finished installing in a PREVIOUS session is sitting in
       registration.waiting with no event ever coming. `updatefound` fires
       when installation STARTS, so it will never fire for that worker. You
       have to look for it explicitly at boot.
     · And you must look BEFORE calling registration.update(). Calling update()
       while a worker is already waiting makes Chromium install that same
       worker again, which fires `updatefound` — turning a silent, correct
       "apply the pending update" into a dismissable reload prompt. Dismiss it
       and you stay on the old version until next launch, where it happens
       again.
     ══════════════════════════════════════════════════════════ */
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      /* Read this BEFORE registering. On a first visit there is no controller,
         and the new worker's clients.claim() fires controllerchange anyway.
         That is not an update, so it must not reload — otherwise every first
         load reloads itself. */
      const hadController = !!navigator.serviceWorker.controller;
      let reloading = false;

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!hadController || reloading) return;
        reloading = true;
        S.flush();
        location.reload();
      });

      navigator.serviceWorker
        // updateViaCache:"none" so the browser's HTTP cache can never serve a
        // stale sw.js — which would make the app permanently un-updatable.
        .register("sw.js", { updateViaCache: "none" })
        .then(reg => {
          // STEP 1: claim anything already waiting from a previous session.
          if (reg.waiting && navigator.serviceWorker.controller) {
            reg.waiting.postMessage("SKIP_WAITING");
          }

          // STEP 2: only now go looking for something newer.
          reg.addEventListener("updatefound", () => {
            const incoming = reg.installing;
            if (!incoming) return;
            incoming.addEventListener("statechange", () => {
              // "installed" WITH an existing controller means an update is
              // waiting, rather than the very first install.
              if (incoming.state === "installed" && navigator.serviceWorker.controller) {
                offerUpdate(incoming);
              }
            });
          });

          /* Reopening an installed PWA usually just resumes the page, so the
             browser's own update check never runs. Check on the way back in,
             throttled so a tab flicked in and out is not hammered. */
          let lastCheck = 0;
          document.addEventListener("visibilitychange", () => {
            if (document.visibilityState !== "visible") return;
            const now = Date.now();
            if (now - lastCheck < 60000) return;
            lastCheck = now;
            // Same ordering: waiting worker first, THEN look for a new one.
            if (reg.waiting && navigator.serviceWorker.controller) {
              reg.waiting.postMessage("SKIP_WAITING");
              return;
            }
            reg.update().catch(() => { /* offline; nothing to do */ });
          });
        })
        .catch(err => console.warn("Offline support unavailable:", err));
    });
  }

  function offerUpdate(worker) {
    const bar = U.el("div", { class: "toast xp", style: "pointer-events:auto" }, [
      U.el("span", { class: "toast-ico", text: "⬆️" }),
      U.el("span", { text: "New version ready" }),
      U.el("button", {
        class: "btn btn-sm btn-primary", style: "margin-left:8px", text: "Reload",
        on: { click: () => { S.flush(); worker.postMessage("SKIP_WAITING"); } }
      })
    ]);
    U.$("#toasts").appendChild(bar);
  }

  /* ── reveal ─────────────────────────────────────────────── */
  window.addEventListener("load", reveal);
  setTimeout(reveal, 1200);
  let revealed = false;
  function reveal() {
    if (revealed) return;
    revealed = true;
    U.$("#boot").classList.add("gone");
    U.$("#topbar").hidden = false;
    U.$("#navbar").hidden = false;
    measureTopbar();
    setTimeout(() => { const b = U.$("#boot"); if (b) b.remove(); }, 600);
  }
})();

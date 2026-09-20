/* The save file: XP, levels, Primes, streaks, inventory, SRS, bookmarks,
   achievements and stats. One localStorage key, written on a short debounce
   with an explicit flush (see §9.4 of the brief — mobile browsers reclaim
   backgrounded tabs without warning, and a 200 ms debounce with no flush
   loses whatever was in flight). */
window.MQ = window.MQ || {};

MQ.State = (function () {
  const KEY = "mathquest.save.v1";
  const U = MQ.U;

  const DEFAULT = () => ({
    v: 1,
    createdAt: Date.now(),
    profile: { name: "Student", avatar: "🧮", theme: "graph" },
    xp: 0, level: 1, xpIntoLevel: 0, coins: 100, prestige: 0, lifetimeXp: 0,
    streak: { count: 0, lastDay: null, longest: 0 },
    stats: {
      answered: 0, correct: 0, bestStreak: 0, perfectRuns: 0,
      equivalences: 0, pairsMatched: 0, curvesRead: 0, calcsCorrect: 0,
      tangentsPlaced: 0, perfectTangents: 0, areasFound: 0,
      proofsSolved: 0, inductionsSolved: 0, gridsFilled: 0, perfectGrids: 0,
      projectilesLanded: 0, bullseyes: 0,
      bossWins: 0, flawlessBoss: 0, clutchWins: 0,
      mistakesFixed: 0, peakCoins: 100, nightOwl: false, earlyBird: false,
      timePlayed: 0, survivalBest: 0, hardWins: 0, nightmareWins: 0,
      cardsMastered: 0, questsDone: 0, extAnswered: 0, extCorrect: 0,
      finalPaperBest: 0, referenceReads: 0, formulaLookups: 0
    },
    topics: {},
    modesPlayed: {},
    proofsSolved: {},
    bossesBeaten: {},
    inventory: { fifty: 1, skip: 1, freeze: 0, shield: 0, double: 0, insight: 0, revive: 0 },
    owned: { themes: ["graph"], avatars: ["🧮", "📐"] },
    srs: {},
    /* Missed questions on a spaced ladder — see scheduleReview(). */
    mistakes: [],
    /* { sure: {n, right}, think: {...}, guess: {...} } — see recordCalibration(). */
    calibration: {},
    bookmarks: [],
    achievements: {},
    history: {},
    scores: {},
    /* `course` is the Advanced / Advanced + Extension 1 choice (see
       js/data/tiers.js). null means "never chosen" — the app then runs the
       widest course this build ships, and the first-run welcome asks. It is
       stored as a course id rather than a tier array so that a save written
       by a build with different tiers still restores to something valid. */
    settings: { sound: true, motion: true, volume: 0.8, difficulty: "standard", radians: true,
                textScale: 1, course: null, recallCheck: true },
    /* The Toolbelt's typed working-out. Capped at 4 kB by the writer — a save
       file that can grow without bound is a save file that eventually blows
       the localStorage quota and takes the rest of the progress with it. */
    scratch: "",
    daily: { day: null, progress: 0, claimed: false, spec: null },
    weekly: { week: null, baseline: null, quests: [], claimed: [] },
    arcade: { tickets: {}, scores: {}, played: {} }
  });

  let data = DEFAULT();
  const listeners = new Set();
  let saveTimer = null;
  /* Set by replaceSave(). Once latched, NO further write can happen — see the
     comment on replaceSave() for why this exists. */
  let frozen = false;

  /* ── persistence ─────────────────────────────────────────── */
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) data = deepMerge(DEFAULT(), JSON.parse(raw));
    } catch (e) {
      console.warn("Save file unreadable, starting fresh.", e);
      data = DEFAULT();
    }
    return data;
  }

  function deepMerge(base, override) {
    /* A null override must NOT replace a structured default. `{"xp":0,
       "settings":null}` passed importSave's only check, latched the save, and
       reloaded into a blank screen: app.js throws at applyCourse() before the
       routes are registered and before the settings button is wired, so the
       student is left with an inert nav bar and no way to reach Reset. Keeping
       the default for a null is both safer and what every caller wants. */
    if (override === null && base !== null && typeof base === "object") return base;
    if (Array.isArray(base)) return Array.isArray(override) ? override : base;
    if (base && typeof base === "object" && override && typeof override === "object") {
      const out = Object.assign({}, base);
      for (const k of Object.keys(override)) {
        out[k] = k in base ? deepMerge(base[k], override[k]) : override[k];
      }
      return out;
    }
    return override === undefined ? base : override;
  }

  function write() {
    if (frozen) return;
    try { localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (e) { console.warn("Could not save progress.", e); }
  }

  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(write, 200);
  }

  /** Write immediately, cancelling any pending debounce. The app calls this on
      visibilitychange and pagehide — visibilitychange is the only event mobile
      browsers reliably fire before reclaiming a tab. */
  function flush() {
    clearTimeout(saveTimer);
    saveTimer = null;
    write();
  }

  function emit() { listeners.forEach(fn => fn(data)); save(); }
  function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  /* ── levelling ───────────────────────────────────────────────
     Level 20 is ~87,000 XP and level 60 about 1.42 million: a whole-HSC-year
     progression, deliberately. Do not soften this — the reference app's user
     asked explicitly for it to be harder than the first tuning. */
  const xpNeeded = level => Math.round(130 * Math.pow(level, 1.5));
  const MAX_LEVEL = 60;

  function levelTitle(level) {
    const t = MQ.DATA.levelTitles;
    return t[Math.min(level - 1, t.length - 1)];
  }

  function difficulty() {
    const id = data.settings.difficulty || "standard";
    return MQ.DATA.difficulties.find(d => d.id === id) || MQ.DATA.difficulties[0];
  }

  /* ── syllabus course ─────────────────────────────────────────
     `difficulty` is scoring; `course` is SYLLABUS. Two different knobs that
     get confused constantly, which is why they live apart and say so in the
     Settings copy. */

  /** Apply the saved course to MQ.DATA.TIERS. Called once at boot. */
  function applyCourse() {
    if (data.settings.course) MQ.DATA.setCourse(data.settings.course);
    // A null course means "never asked" — leave the build default in place.
    // Re-read it, so a save naming a course this build no longer ships (or a
    // build whose BUILD_TIERS shrank) settles on something that exists.
    data.settings.course = MQ.DATA.course().id;
    return data.settings.course;
  }

  /**
   * Switch syllabus course and persist it. Returns true when it changed —
   * every tier-filtered cache in the app has been dropped by then, so the
   * caller only has to redraw.
   */
  function setCourse(id) {
    const changed = MQ.DATA.setCourse(id);
    data.settings.course = MQ.DATA.course().id;
    if (changed) emit(); else save();
    return changed;
  }

  /** Difficulty bonus compounded with the permanent ascension bonus (+12% each). */
  function xpMultiplier() {
    return difficulty().xp * (1 + (data.prestige || 0) * 0.12);
  }

  const canPrestige = () => data.level >= MAX_LEVEL;

  /** Ascend: reset level and XP, keep every unlock, gain a permanent XP bonus. */
  function doPrestige() {
    if (!canPrestige()) return false;
    data.prestige = (data.prestige || 0) + 1;
    data.level = 1;
    data.xpIntoLevel = 0;
    data.xp = 0;
    addCoins(2500, true);
    grantPowerup("double", 3);
    emit();
    return true;
  }

  function masteryTier(pct) {
    const tiers = MQ.DATA.masteryTiers;
    let out = tiers[0];
    for (const t of tiers) if (pct >= t.at) out = t;
    return out;
  }

  /** Award XP (already multiplied by the caller). Returns { levelsGained, newLevel }. */
  function addXP(amount) {
    if (!amount || amount <= 0) return { levelsGained: 0, newLevel: data.level };
    data.xp += amount;
    data.lifetimeXp = (data.lifetimeXp || 0) + amount;
    data.xpIntoLevel += amount;
    const today = U.dayKey();
    data.history[today] = (data.history[today] || 0) + amount;

    let gained = 0;
    while (data.level < MAX_LEVEL && data.xpIntoLevel >= xpNeeded(data.level)) {
      data.xpIntoLevel -= xpNeeded(data.level);
      data.level++;
      gained++;
      addCoins(30 * data.level, true);
    }
    if (data.level >= MAX_LEVEL) data.xpIntoLevel = Math.min(data.xpIntoLevel, xpNeeded(MAX_LEVEL));
    emit();
    return { levelsGained: gained, newLevel: data.level };
  }

  function addCoins(n, quiet) {
    data.coins = Math.max(0, data.coins + n);
    if (data.coins > data.stats.peakCoins) data.stats.peakCoins = data.coins;
    if (!quiet) emit();
    return data.coins;
  }

  function spendCoins(n) {
    if (data.coins < n) return false;
    data.coins -= n;
    emit();
    return true;
  }

  /* ── daily streak ────────────────────────────────────────── */
  function touchStreak() {
    const today = U.dayKey();
    const last = data.streak.lastDay;
    if (last === today) return { changed: false, count: data.streak.count };

    if (!last) data.streak.count = 1;
    else {
      const gap = U.daysBetween(last, today);
      data.streak.count = gap === 1 ? data.streak.count + 1 : 1;
    }
    data.streak.lastDay = today;
    data.streak.longest = Math.max(data.streak.longest, data.streak.count);

    const hour = new Date().getHours();
    if (hour >= 0 && hour < 4) data.stats.nightOwl = true;
    if (hour >= 5 && hour < 7) data.stats.earlyBird = true;

    emit();
    return { changed: true, count: data.streak.count };
  }

  const streakBonus = () => Math.min(5 + data.streak.count * 3, 60);

  /* ── answer recording ────────────────────────────────────── */
  function recordAnswer(topic, isCorrect, questionId, confidence) {
    data.stats.answered++;
    if (isCorrect) data.stats.correct++;

    if (topic) {
      const t = data.topics[topic] || (data.topics[topic] = { seen: 0, correct: 0 });
      t.seen++;
      if (isCorrect) t.correct++;
      if (MQ.DATA.tierOf(topic) === "ME") {
        data.stats.extAnswered = (data.stats.extAnswered || 0) + 1;
        if (isCorrect) data.stats.extCorrect = (data.stats.extCorrect || 0) + 1;
      }
    }

    if (questionId) scheduleReview(questionId, topic, isCorrect, confidence);
    if (confidence) recordCalibration(confidence, isCorrect);
    save();
  }

  /* ── the review queue ────────────────────────────────────────
     This used to be a flat list of outstanding mistakes: get a question wrong,
     it goes in; get it right ONCE, it comes straight back out. That encodes
     "one successful retrieval means learned", which is the single thing the
     retrieval-practice literature is most consistent about being false.
     Durable learning needs SEVERAL successful retrievals, SPACED OUT — one
     correct answer thirty seconds after reading the explanation mostly
     measures working memory.

     So a missed question now rides a Leitner ladder of its own and only leaves
     the queue after FIVE correct recalls: one in the session that missed it,
     then across gaps of one, two, four and eight days. A correct answer before
     the interval has elapsed earns nothing — see the promotion check below,
     which is the part that makes any of this real.
     `data.mistakes` keeps its name and shape so existing saves keep working;
     entries written by an older build simply have no box yet and start at 1.

     HYPERCORRECTION. An entry missed while the student said "I know it" is
     flagged. A confident error is both the most damaging kind — it is a belief,
     not a gap — and the most correctable: being wrong when you were sure is
     surprising, and surprise is what makes the correction stick. Those come
     back sooner and weigh more heavily in the draw. */
  function reviewEntry(id) {
    return (data.mistakes || []).find(m => m.id === id);
  }

  /* Days until the next test, indexed by box. Box 1 is ZERO on purpose: a
     question you have just missed should be re-tested before you leave, which
     is successive relearning — reach the criterion once in the session, THEN
     space it. Separate from the flashcards' BOX_DAYS because the ladders
     graduate differently and sharing the array coupled two unrelated
     schedules. */
  const REVIEW_DAYS = [0, 0, 1, 2, 4, 8];
  const REVIEW_STEPS = 5;

  function scheduleReview(id, topic, isCorrect, confidence) {
    const list = data.mistakes || (data.mistakes = []);
    const idx = list.findIndex(m => m.id === id);
    const rec = idx >= 0 ? list[idx] : null;

    if (!rec) {
      // Correct first time and not in the queue: nothing to schedule.
      if (isCorrect) return;
      list.unshift({ id, topic, misses: 1, ts: Date.now(), box: 1, reps: 0,
                     due: U.dayKey(), hiConf: confidence === "sure" });
      evict(list);
      return;
    }

    rec.ts = Date.now();
    rec.reps = (rec.reps || 0) + 1;
    if (confidence === "sure" && !isCorrect) rec.hiConf = true;

    if (!isCorrect) {
      rec.misses = (rec.misses || 0) + 1;
      /* A lapse resets the ladder AND makes it due immediately. Pushing a
         question you have just failed out to tomorrow — which is what
         deriving the date from the box did — moves your worst material out of
         today's queue precisely because it is your worst material. */
      rec.box = 1;
      rec.due = U.dayKey();
      return;
    }

    /* PROMOTION REQUIRES THE INTERVAL TO HAVE ELAPSED. Without this check the
       ladder is decorative: four correct answers in one sitting graduate a
       question permanently, and the app has several ways to hand you the same
       question twice in a session (the Review Queue's "work ahead" path,
       Rapid Fire's endless top-up, a boss fight's repeated draws). Answering
       it right again ten seconds after reading the explanation is not a
       spaced retrieval and must not be scored as one.

       Getting it right early is still good news — it just earns nothing. The
       box and the date are left exactly where they were. */
    if (!isDue(rec)) return;

    /* At most one "fixed" credit per question per day. A lapse makes an entry
       due immediately (which is right), so without this an alternating
       wrong/right tap on a single question farmed the Self-Correcting and
       Nothing Sticks achievements in under a minute. */
    const today = U.dayKey();
    if (rec.fixedDay !== today) { data.stats.mistakesFixed++; rec.fixedDay = today; }

    rec.box = boxOf(rec) + 1;
    if (rec.box > REVIEW_STEPS) {        // survived the whole ladder
      list.splice(idx, 1);
      return;
    }
    const due = new Date();
    due.setDate(due.getDate() + REVIEW_DAYS[rec.box]);
    rec.due = U.dayKey(due);
  }

  /* A date we cannot parse counts as DUE. Treating it as not-due meant a
     single corrupt field wedged an entry forever: never due, so never
     promoted, so never graduated, occupying a queue slot until the cap
     evicted it. Due-when-unsure is self-healing — the next correct answer
     rewrites the date with a good one. */
  const isDue = rec => {
    if (!rec.due) return true;
    const n = U.daysBetween(rec.due, U.dayKey());
    return !isFinite(n) || n >= 0;
  };

  /* Boxes arrive from the save file, so they arrive from anywhere. A string
     "1" turned into "11" on the next promotion and tripped the graduation
     test, silently deleting the entry and its four remaining reviews; a
     negative or fractional box indexed REVIEW_DAYS out of bounds and wrote
     the literal string "NaN-NaN-NaN" as a due date. */
  const boxOf = rec => {
    const n = Math.round(Number(rec.box));
    return isFinite(n) && n >= 1 ? Math.min(n, REVIEW_STEPS) : 1;
  };

  /**
   * True when answering this question right NOW would be a genuine spaced
   * recovery: it is in the queue, its interval has elapsed, and it has already
   * survived at least one overnight gap.
   *
   * Asked BEFORE recordAnswer, because recording it changes the answer.
   *
   * This is what the app pays a premium for, and the `box >= 2` clause is what
   * makes that safe. Box 2 is only ever set with a due date at least a day
   * out, so a recovery cannot be manufactured inside a session: you cannot
   * miss a question and "recover" it minutes later, however many times you
   * try. Paying for a same-session fix would have been a farm worth thousands
   * of XP an hour — miss, correct, repeat — which is why the premium is
   * attached to the day gap rather than to the mode you happen to be in.
   */
  function isSpacedRecovery(id) {
    const rec = reviewEntry(id);
    return !!rec && boxOf(rec) >= 2 && isDue(rec);
  }

  /* Cap the queue by dropping the entry you are CLOSEST to done with, not the
     one that happens to be oldest. Evicting by insertion order deletes a
     question you have failed seven times while certain to make room for one
     you shrugged at once — silently throwing away the highest-value item in
     the queue to keep the lowest. */
  function evict(list) {
    while (list.length > 150) {
      let worst = 0;
      for (let i = 1; i < list.length; i++) {
        if (reviewPriority(list[i]) < reviewPriority(list[worst])) worst = i;
      }
      list.splice(worst, 1);
    }
  }

  /** Higher means "keep this one". */
  function reviewPriority(m) {
    return (m.hiConf ? 100 : 0) + Math.min(50, (m.misses || 1) * 10) - (m.box || 1) * 5;
  }

  /** Queue entries whose interval has elapsed, most-overdue and worst first. */
  function dueReviews() {
    const today = U.dayKey();
    const overdueBy = m => {
      const n = U.daysBetween(m.due || today, today);
      return isFinite(n) ? n : 0;
    };
    return (data.mistakes || [])
      .filter(isDue)
      /* Overdue first, then confident errors, then most-missed. A student
         returning after a fortnight has a backlog, and working it in
         insertion order means the two-week-old items stay two weeks old. */
      /* daysBetween(due, today) is days OVERDUE, so this is descending: the
         most overdue first. Ascending — which is what this said — worked the
         backlog from the wrong end, and since the session only takes the top
         15 the oldest items were never reached at all. A 21-day-overdue
         confident error sorted dead last. */
      .sort((a, b) =>
        overdueBy(b) - overdueBy(a) ||
        (b.hiConf ? 1 : 0) - (a.hiConf ? 1 : 0) ||
        (b.misses || 0) - (a.misses || 0));
  }

  /* ── calibration ─────────────────────────────────────────────
     How often "I know it" really means you know it. Kept as three counters
     rather than a log: the readout only ever needs the rates, and a per-answer
     history is save-file weight that buys nothing. */
  function recordCalibration(confidence, isCorrect) {
    const c = data.calibration || (data.calibration = {});
    const k = c[confidence] || (c[confidence] = { n: 0, right: 0 });
    k.n++;
    if (isCorrect) k.right++;
  }

  /** [{ id, label, n, right, pct }] for the levels actually used. */
  function calibration() {
    const c = data.calibration || {};
    return MQ.DATA.CONFIDENCE.map(lvl => {
      const k = c[lvl.id] || { n: 0, right: 0 };
      const pct = k.n ? Math.round((k.right / k.n) * 100) : null;
      /* Signed, deliberately: over is overconfident and under is
         underconfident, and they call for opposite advice. */
      const off = pct === null ? null : pct - lvl.target;
      return { id: lvl.id, label: lvl.label, n: k.n, right: k.right, pct,
               target: lvl.target, off,
               band: off === null ? null
                   : Math.abs(off) <= 15 ? "good" : Math.abs(off) <= 30 ? "near" : "off" };
    }).filter(x => x.n > 0);
  }

  function noteStreak(n) { if (n > data.stats.bestStreak) { data.stats.bestStreak = n; save(); } }

  function bump(statKey, by) {
    data.stats[statKey] = (data.stats[statKey] || 0) + (by === undefined ? 1 : by);
    save();
  }

  function markMode(modeId) {
    data.modesPlayed[modeId] = (data.modesPlayed[modeId] || 0) + 1;
    save();
  }

  /**
   * Record a mode score. Returns true only for a genuine personal BEST.
   *
   * The first run of a mode sets the baseline and is not a best — you cannot
   * beat a record that does not exist. Treating `undefined` as beatable put a
   * gold "🏅 New personal best!" on a first run of 0 out of 15, next to grade
   * D and "Rough run", which is the worst possible moment to be congratulated
   * and empties the badge of meaning everywhere else.
   */
  function recordScore(modeId, score) {
    const prev = data.scores[modeId];
    if (prev === undefined) { data.scores[modeId] = score; save(); return false; }
    if (score > prev) { data.scores[modeId] = score; save(); return true; }
    return false;
  }

  /* ── bookmarks ───────────────────────────────────────────────
     Star a question mid-run and it lands in a review deck on the Study
     screen. Deliberately unrewarded — it's a notebook, not a game mode. */
  function toggleBookmark(id) {
    const i = data.bookmarks.indexOf(id);
    if (i >= 0) data.bookmarks.splice(i, 1);
    else data.bookmarks.unshift(id);
    if (data.bookmarks.length > 200) data.bookmarks.pop();
    save();
    return i < 0;
  }
  const isBookmarked = id => data.bookmarks.indexOf(id) >= 0;

  /* ── topic mastery ───────────────────────────────────────── */
  function mastery(topic) {
    const t = data.topics[topic];
    if (!t || !t.seen) return 0;
    // Confidence-weighted: a perfect 3-question run shouldn't read as mastered.
    return Math.round((t.correct / t.seen) * Math.min(1, t.seen / 25) * 100);
  }

  const overallAccuracy = () => U.pct(data.stats.correct, data.stats.answered);

  /* ── inventory ───────────────────────────────────────────── */
  function usePowerup(id) {
    if ((data.inventory[id] || 0) <= 0) return false;
    data.inventory[id]--;
    emit();
    return true;
  }
  function grantPowerup(id, n) {
    data.inventory[id] = (data.inventory[id] || 0) + (n || 1);
    emit();
  }

  const ownsTheme = id => data.owned.themes.includes(id);
  const ownsAvatar = em => data.owned.avatars.includes(em);

  /* ── spaced repetition (Leitner, 5 boxes) ────────────────── */
  const BOX_DAYS = [0, 1, 2, 4, 8, 16];

  function cardState(id) {
    return data.srs[id] || (data.srs[id] = { box: 1, due: U.dayKey(), reps: 0, lapses: 0 });
  }

  /* Flashcards are self-graded, so "Did you get it?" → "Yes" → XP is an
     infinite loop. A card therefore pays at most once per day, and only if
     it was genuinely due (see §9.8). */
  function cardXpEligible(id) {
    const c = data.srs[id];
    return !c || c.xpDay !== U.dayKey();
  }
  function markCardXp(id) { cardState(id).xpDay = U.dayKey(); save(); }

  function reviewCard(id, gotIt) {
    const c = cardState(id);
    c.reps++;
    if (gotIt) c.box = Math.min(5, c.box + 1);
    else { c.box = 1; c.lapses++; }
    const due = new Date();
    due.setDate(due.getDate() + BOX_DAYS[c.box]);
    c.due = U.dayKey(due);
    data.stats.cardsMastered = Object.values(data.srs).filter(x => x.box >= 5).length;
    save();
    return c;
  }

  /**
   * Cards a study session should offer: everything due, PLUS everything never
   * seen. A card with no record is not "due" in any meaningful sense, but it
   * does still have to be learnt, so the session needs it.
   */
  function dueCards(deck) {
    const today = U.dayKey();
    return (deck || MQ.Cards.all()).filter(card => {
      const c = data.srs[card.id];
      return !c || U.daysBetween(c.due, today) >= 0;
    });
  }

  /**
   * Cards that are genuinely DUE — seen before, and the interval has elapsed.
   *
   * This is the number for a dashboard, and it is not the same one. On a fresh
   * save every card is unseen, so dueCards() returns the entire deck and a
   * "cards due" badge reads 137 before the student has done anything. A
   * backlog you were born with is not a call to action, it is a reason to
   * close the app.
   */
  function dueCardReviews(deck) {
    const today = U.dayKey();
    return (deck || MQ.Cards.all()).filter(card => {
      const c = data.srs[card.id];
      return c && U.daysBetween(c.due, today) >= 0;
    });
  }

  /* ── achievements ────────────────────────────────────────── */
  function achievementStats() {
    return Object.assign({}, data.stats, {
      level: data.level,
      longestDayStreak: data.streak.longest,
      topics: data.topics,
      modesPlayed: data.modesPlayed,
      themesOwned: data.owned.themes.length,
      avatarsOwned: data.owned.avatars.length,
      proofsSolvedUnique: Object.keys(data.proofsSolved).length,
      inductionsSolvedUnique: MQ.Proofs.inductions().filter(p => data.proofsSolved[p.id]).length,
      bossesBeaten: Object.keys(data.bossesBeaten).length,
      cardsMastered: Object.values(data.srs).filter(x => x.box >= 5).length,
      bookmarks: data.bookmarks.length,
      prestige: data.prestige || 0,
      questsDone: data.stats.questsDone || 0,
      // Exposed as a function so mastery achievements use the UI's weighting.
      masteryOf: mastery
    });
  }

  /** Evaluate every enabled achievement; returns any newly unlocked. */
  function checkAchievements() {
    const s = achievementStats();
    const unlocked = [];
    for (const a of MQ.DATA.enabledAchievements()) {
      if (data.achievements[a.id]) continue;
      let ok = false;
      try { ok = !!a.check(s); } catch (e) { ok = false; }
      if (ok) {
        data.achievements[a.id] = Date.now();
        if (a.reward) addCoins(a.reward, true);
        unlocked.push(a);
      }
    }
    if (unlocked.length) emit();
    return unlocked;
  }

  /* ── daily challenge ─────────────────────────────────────────
     Derived from the date, so it's stable all day and identical for
     everyone. */
  function dailySpec() {
    const day = U.dayKey();
    const rng = U.seededRandom(U.hash("mathquest-" + day));
    const modes = ["rapid", "equiv", "match", "curve", "crunch", "panic", "lab", "proof"]
      .concat(MQ.DATA.hasExt() ? ["vector"] : []);
    const mode = modes[Math.floor(rng() * modes.length)];
    const targets = { rapid: 14, equiv: 6, match: 1, curve: 10, crunch: 8,
                      panic: 1, lab: 3, proof: 3, vector: 3 };
    return { day, mode, target: targets[mode] || 10, reward: 120, xp: 150 };
  }

  function daily() {
    const spec = dailySpec();
    if (data.daily.day !== spec.day) {
      data.daily = { day: spec.day, progress: 0, claimed: false, spec };
      save();
    } else data.daily.spec = spec;
    return data.daily;
  }

  function progressDaily(mode, by) {
    const d = daily();
    if (d.claimed || d.spec.mode !== mode) return false;
    d.progress = Math.min(d.spec.target, d.progress + (by === undefined ? 1 : by));
    save();
    return d.progress >= d.spec.target;
  }

  function claimDaily() {
    const d = daily();
    if (d.claimed || d.progress < d.spec.target) return false;
    d.claimed = true;
    addCoins(d.spec.reward, true);
    addXP(d.spec.xp);
    return true;
  }

  /* ── weekly quests ───────────────────────────────────────────
     Each quest names a cumulative stat; progress is that stat minus a
     snapshot taken at week rollover, so no per-event plumbing is needed. */
  const QUEST_POOL = [
    { id:"q_answer",  stat:"answered",     target:180, xp:1400, coins:700, icon:"📝",
      name:"Grind it out",      desc:"Answer 180 questions" },
    { id:"q_correct", stat:"correct",      target:120, xp:1600, coins:800, icon:"🎯",
      name:"On target",         desc:"Get 120 questions right" },
    { id:"q_equiv",   stat:"equivalences", target:30,  xp:1300, coins:650, icon:"🔁",
      name:"Same thing twice",  desc:"Verify 30 equivalences" },
    { id:"q_pairs",   stat:"pairsMatched", target:60,  xp:1100, coins:550, icon:"🃏",
      name:"Pair sweep",        desc:"Match 60 pairs" },
    { id:"q_lab",     stat:"tangentsPlaced", target:20, xp:1500, coins:750, icon:"📐",
      name:"Gradient week",     desc:"Place 20 tangents in the Calculus Lab" },
    { id:"q_proof",   stat:"proofsSolved", target:12,  xp:1400, coins:700, icon:"🪜",
      name:"Proof sprint",      desc:"Assemble 12 proofs" },
    { id:"q_calc",    stat:"calcsCorrect", target:45,  xp:1400, coins:700, icon:"🔢",
      name:"Number crunch",     desc:"Solve 45 calculations" },
    { id:"q_curve",   stat:"curvesRead",   target:45,  xp:1300, coins:650, icon:"📈",
      name:"Curve literacy",    desc:"Read 45 graphs correctly" },
    { id:"q_boss",    stat:"bossWins",     target:3,   xp:2200, coins:1100, icon:"⚔️",
      name:"Boss hunter",       desc:"Defeat 3 Exam Bosses" },
    { id:"q_perfect", stat:"perfectRuns",  target:5,   xp:2000, coins:1000, icon:"✨",
      name:"Flawless five",     desc:"Finish 5 perfect runs" },
    { id:"q_cards",   stat:"cardsMastered",target:20,  xp:1500, coins:750, icon:"🗂️",
      name:"Deck builder",      desc:"Have 20 flashcards mastered" },
    { id:"q_survive", stat:"survivalBest", target:25,  xp:1800, coins:900, icon:"💀",
      name:"Last stand",        desc:"Reach a 25-question Survival run" }
  ];

  /** ISO-ish week key, e.g. "2026-W31". */
  function weekKey(d) {
    const t = d || new Date();
    const target = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));
    const firstThursday = new Date(target.getFullYear(), 0, 4);
    firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7));
    const week = 1 + Math.round((target - firstThursday) / (7 * 86400000));
    return `${target.getFullYear()}-W${String(week).padStart(2, "0")}`;
  }

  function statFor(key) {
    if (key === "cardsMastered") return Object.values(data.srs).filter(c => c.box >= 5).length;
    return data.stats[key] || 0;
  }

  function weekly() {
    const wk = weekKey();
    if (data.weekly.week !== wk) {
      const rng = U.seededRandom(U.hash("mathquest-week-" + wk));
      const picked = U.seededShuffle(QUEST_POOL, rng).slice(0, 3).map(q => q.id);
      const baseline = {};
      QUEST_POOL.forEach(q => (baseline[q.stat] = statFor(q.stat)));
      data.weekly = { week: wk, baseline, quests: picked, claimed: [] };
      save();
    }
    return data.weekly;
  }

  function weeklyQuests() {
    const w = weekly();
    return w.quests.map(id => {
      const q = QUEST_POOL.find(x => x.id === id);
      const base = (w.baseline && w.baseline[q.stat]) || 0;
      const done = Math.max(0, Math.min(q.target, statFor(q.stat) - base));
      return { quest: q, done, target: q.target,
               complete: done >= q.target, claimed: w.claimed.includes(id) };
    });
  }

  function claimQuest(id) {
    const w = weekly();
    const entry = weeklyQuests().find(e => e.quest.id === id);
    if (!entry || !entry.complete || entry.claimed) return false;
    w.claimed.push(id);
    data.stats.questsDone = (data.stats.questsDone || 0) + 1;
    addCoins(entry.quest.coins, true);
    addXP(Math.round(entry.quest.xp * xpMultiplier()));
    return true;
  }

  /* ── export / import ─────────────────────────────────────────
     localStorage is per-device, and students change phones. */
  function exportSave() { return JSON.stringify(data, null, 2); }

  /**
   * Replace the save file and freeze all further writes.
   *
   * The naive version of this — write, then location.reload() — destroys the
   * import. The reload fires `pagehide`, `pagehide` fires the debounced-save
   * flush, and the flush writes the OLD in-memory state straight back over the
   * file that was just imported. From the outside the import silently does
   * nothing at all.
   *
   * So: merge against the current DEFAULT shape (a save from an older version
   * gains new fields rather than blanking them), write once, and latch `frozen`
   * so nothing — not pagehide, not a debounce already in flight — can write
   * again before the reload lands.
   */
  function replaceSave(obj) {
    clearTimeout(saveTimer);
    saveTimer = null;
    data = deepMerge(DEFAULT(), obj);
    try { localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (e) { return { ok: false, error: "Could not write the save file." }; }
    frozen = true;
    return { ok: true };
  }

  function importSave(json) {
    let parsed;
    try { parsed = JSON.parse(json); }
    catch (e) { return { ok: false, error: "Couldn't read that file — is it valid JSON?" }; }
    if (!parsed || typeof parsed !== "object" || typeof parsed.xp !== "number") {
      return { ok: false, error: "That doesn't look like a MathQuest save file." };
    }
    return replaceSave(parsed);
  }

  const isFrozen = () => frozen;

  function reset() {
    data = DEFAULT();
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    emit();
  }

  return {
    load, save, flush, onChange, emit,
    get data() { return data; },
    xpNeeded, levelTitle, addXP, addCoins, spendCoins, MAX_LEVEL,
    difficulty, xpMultiplier, canPrestige, doPrestige, masteryTier,
    applyCourse, setCourse,
    weekly, weeklyQuests, claimQuest, weekKey, QUEST_POOL,
    touchStreak, streakBonus,
    recordAnswer, noteStreak, bump, markMode, recordScore,
    dueReviews, reviewEntry, isSpacedRecovery, calibration,
    toggleBookmark, isBookmarked,
    mastery, overallAccuracy,
    usePowerup, grantPowerup, ownsTheme, ownsAvatar,
    cardState, reviewCard, dueCards, dueCardReviews, cardXpEligible, markCardXp,
    checkAchievements, achievementStats,
    daily, dailySpec, progressDaily, claimDaily,
    exportSave, importSave, replaceSave, isFrozen, reset
  };
})();

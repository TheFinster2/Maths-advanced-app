/* ═══════════════════════════════════════════════════════════════
   The ONE place the Advanced / Extension 1 decision lives.

   TWO decisions, actually, and they are different things:

     MQ.DATA.BUILD_TIERS   what this build SHIPS.  Edit the line below.
     MQ.DATA.TIERS         what the player is CURRENTLY studying, chosen in
                           Settings → Course and stored in the save file.

   BUILD_TIERS is the outer bound: TIERS is always a subset of it, so an
   Advanced-only build can never expose an Extension course the questions for
   which it did not ship. When BUILD_TIERS is ["MA"] there is only one course
   to pick and the toggle hides itself entirely.

   Every topic code is prefixed MA- or ME-, and Bank.all() filters on TIERS,
   so flipping it is the entire change. What follows from that:

   · The questions-me-*.js banks are simply not listed in index.html or in
     sw.js PRECACHE for an Advanced-only build — and then BUILD_TIERS must
     be ["MA"] to match, or the app would offer a course with no questions.
   · Game modes are SHARED. Extension 1 content flows through the same
     Proof Builder, Calculation Crunch and so on. Only Vector Lab, the
     Induction Builder and the sixth boss are Extension-only, and they
     self-hide via MQ.DATA.hasExt() rather than living on separate screens.
   · Achievements referencing ME- topics are filtered out too — a player on
     the Advanced course who can see permanently unobtainable achievements
     is a small thing that feels awful.
   · tests/validate.js asserts BOTH configurations pass, so an
     Advanced-only build can never reference an ME- id it isn't shipping.
     That check is the only thing stopping this toggle from rotting.

   ── THE CACHE RULE ──────────────────────────────────────────────
   Because TIERS now changes at RUNTIME, every module that memoises a
   tier-filtered list must drop that cache when it changes. They register
   through MQ.DATA.onTierChange() at the bottom of their own file, next to
   the cache they own — a central list of things to invalidate would be a
   list nobody remembers to add to. If you write a new `let cached = null`
   over a tier-filtered array, register it the same way or the toggle will
   half-apply, which is worse than not applying at all.

   Changing BUILD_TIERS changes the precached file list, so bump CACHE in
   sw.js when you change that line. Changing courses at runtime does not.
   ═══════════════════════════════════════════════════════════════ */
window.MQ = window.MQ || {};
MQ.DATA = MQ.DATA || {};

/** What this build ships. ["MA"] for an Advanced-only build. */
MQ.DATA.BUILD_TIERS = ["MA", "ME"];

/** What the player is studying right now. Always a subset of BUILD_TIERS. */
MQ.DATA.TIERS = MQ.DATA.BUILD_TIERS.slice();

MQ.DATA.TIER_META = {
  MA: { id: "MA", name: "Mathematics Advanced", short: "Advanced", chip: "ADV" },
  ME: { id: "ME", name: "Mathematics Extension 1", short: "Extension 1", chip: "EXT" }
};

/* The courses a student can actually be enrolled in. Extension 1 is taken
   ALONGSIDE Advanced, never instead of it — there is no "Extension only"
   course in NSW, and offering one would hide two thirds of the app behind a
   toggle nobody wants. So the choice is "Advanced" or "Advanced + Ext 1",
   which is why this is a list of presets and not a checkbox per tier. */
MQ.DATA.COURSES = [
  { id: "advanced",  icon: "📘", name: "Advanced",
    sub: "Mathematics Advanced",
    desc: "The Advanced syllabus only. Extension 1 questions, decks, proofs and modes are hidden.",
    tiers: ["MA"] },
  { id: "extension", icon: "📗", name: "Advanced + Ext 1",
    sub: "Advanced and Extension 1",
    desc: "Everything: adds vectors, induction, combinatorics, inverse trig and the sixth boss.",
    tiers: ["MA", "ME"] }
];

/** True when the Extension 1 tier is part of the CURRENT course. */
MQ.DATA.hasExt = () => MQ.DATA.TIERS.indexOf("ME") >= 0;

/** True when this build shipped the Extension 1 banks at all. */
MQ.DATA.buildHasExt = () => MQ.DATA.BUILD_TIERS.indexOf("ME") >= 0;

/** The tier a topic code belongs to: "MA-C2" → "MA". */
MQ.DATA.tierOf = code => String(code || "").split("-")[0];

/** Is this topic code part of the current course? */
MQ.DATA.tierEnabled = code => MQ.DATA.TIERS.indexOf(MQ.DATA.tierOf(code)) >= 0;

/** The courses this build can offer. One entry means: do not show a toggle. */
MQ.DATA.availableCourses = () =>
  MQ.DATA.COURSES.filter(c => c.tiers.every(t => MQ.DATA.BUILD_TIERS.indexOf(t) >= 0));

/** The course matching the active tiers, falling back to the widest available. */
MQ.DATA.course = function () {
  const want = MQ.DATA.TIERS.slice().sort().join(",");
  const list = MQ.DATA.availableCourses();
  return list.find(c => c.tiers.slice().sort().join(",") === want) ||
         list[list.length - 1] || MQ.DATA.COURSES[0];
};

/* ── change notification ────────────────────────────────────────
   Listeners run in registration order, which is script order, which means
   every data bank has dropped its cache before any screen redraws. */
const tierListeners = [];

/**
 * Register a callback to run whenever the active tiers change. Data modules
 * use this to drop memoised, tier-filtered lists. Returns an unsubscribe.
 */
MQ.DATA.onTierChange = function (fn) {
  tierListeners.push(fn);
  return () => {
    const i = tierListeners.indexOf(fn);
    if (i >= 0) tierListeners.splice(i, 1);
  };
};

/**
 * Set the active tiers. Anything outside BUILD_TIERS is dropped, "MA" is
 * always kept (every course includes it), and the result is ordered to match
 * BUILD_TIERS so the per-tier headings on Play and Progress stay stable.
 *
 * Returns true when the value actually changed — callers use that to decide
 * whether a redraw and a toast are warranted.
 */
MQ.DATA.setTiers = function (list) {
  const want = (Array.isArray(list) ? list : []).map(String);
  let next = MQ.DATA.BUILD_TIERS.filter(t => want.indexOf(t) >= 0);
  // Never leave the player with nothing: an empty or nonsense selection is
  // the Advanced course, not a blank app.
  if (next.indexOf("MA") < 0) next = ["MA"].concat(next);
  next = MQ.DATA.BUILD_TIERS.filter(t => next.indexOf(t) >= 0);

  if (next.join(",") === MQ.DATA.TIERS.join(",")) return false;
  MQ.DATA.TIERS = next;
  tierListeners.forEach(fn => { try { fn(next); } catch (e) { console.warn("tier listener failed", e); } });
  return true;
};

/** Set the active tiers from a course id. Unknown ids are ignored. */
MQ.DATA.setCourse = function (id) {
  const c = MQ.DATA.availableCourses().find(x => x.id === id);
  return c ? MQ.DATA.setTiers(c.tiers) : false;
};

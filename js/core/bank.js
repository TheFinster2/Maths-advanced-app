/* Question bank: aggregation, TIER FILTERING and the adaptive draw.

   Bank.all() is where MQ.DATA.TIERS is enforced. Nothing else in the app
   needs to know which tier is enabled — filter once, here. */
window.MQ = window.MQ || {};

MQ.Bank = (function () {
  const U = MQ.U;
  let ALL = null;
  let INDEX = null;

  /** Every question bank registers itself here, so adding a file is one line. */
  const SOURCES = [];
  function register(arr) { SOURCES.push(arr); ALL = null; }

  function all() {
    if (!ALL) {
      // The single point where the Advanced / Extension 1 toggle takes effect.
      ALL = shipped().filter(q => MQ.DATA.tierEnabled(q.topic));
      INDEX = new Map(ALL.map(q => [q.id, q]));
    }
    return ALL;
  }

  /**
   * Every question this BUILD ships, before the course filter. Only Settings
   * uses it — to say how many questions each course would give you, which it
   * cannot ask all() for without switching course to find out.
   */
  const shipped = () => [].concat.apply([], SOURCES.filter(Boolean));

  const byId = id => { all(); return INDEX.get(id); };

  /* Topic codes follow NESA. `group` collects codes into the five boss
     domains and the Topic Drill headings. */
  const TOPICS = [
    { id:"MA-F1",   name:"Working with Functions",              short:"Functions",        group:"Functions",  tier:"MA" },
    { id:"MA-T1",   name:"Trigonometry & Measure of Angles",    short:"Trig & Radians",   group:"Trig",       tier:"MA" },
    { id:"MA-T2",   name:"Trigonometric Functions & Identities",short:"Trig Functions",   group:"Trig",       tier:"MA" },
    { id:"MA-C1",   name:"Introduction to Differentiation",     short:"Intro Calculus",   group:"Calculus",   tier:"MA" },
    { id:"MA-C2",   name:"Differential Calculus",               short:"Differentiation",  group:"Calculus",   tier:"MA" },
    { id:"MA-C3",   name:"Applications of Differentiation",     short:"Curve Sketching",  group:"Calculus",   tier:"MA" },
    { id:"MA-C4",   name:"Integral Calculus",                   short:"Integration",      group:"Integration",tier:"MA" },
    { id:"MA-E1",   name:"Logarithms and Exponentials",         short:"Logs & Exponentials", group:"Functions", tier:"MA" },
    { id:"MA-M1",   name:"Modelling Financial Situations",      short:"Financial Maths",  group:"Financial",  tier:"MA" },
    { id:"MA-S1",   name:"Probability & Discrete Random Variables", short:"Probability",  group:"Statistics", tier:"MA" },
    { id:"MA-S2",   name:"Descriptive Statistics & Bivariate Data", short:"Statistics",   group:"Statistics", tier:"MA" },
    { id:"MA-S3",   name:"Random Variables",                    short:"Normal Distribution", group:"Statistics", tier:"MA" },

    { id:"ME-F1",   name:"Further Work with Functions",         short:"Further Functions",group:"Functions",  tier:"ME" },
    { id:"ME-F2",   name:"Polynomials",                         short:"Polynomials",      group:"Functions",  tier:"ME" },
    { id:"ME-T1",   name:"Inverse Trigonometric Functions",     short:"Inverse Trig",     group:"Trig",       tier:"ME" },
    { id:"ME-T2",   name:"Further Trigonometric Identities",    short:"Further Identities",group:"Trig",      tier:"ME" },
    { id:"ME-T3",   name:"Trigonometric Equations",             short:"Trig Equations",   group:"Trig",       tier:"ME" },
    { id:"ME-A1",   name:"Working with Combinatorics",          short:"Combinatorics",    group:"Statistics", tier:"ME" },
    { id:"ME-C1",   name:"Rates of Change",                     short:"Rates of Change",  group:"Calculus",   tier:"ME" },
    { id:"ME-C2",   name:"Further Calculus Skills",             short:"Further Calculus", group:"Integration",tier:"ME" },
    { id:"ME-C3",   name:"Applications of Calculus",            short:"Volumes & DEs",    group:"Integration",tier:"ME" },
    { id:"ME-P1",   name:"Proof by Mathematical Induction",     short:"Induction",        group:"Proof",      tier:"ME" },
    { id:"ME-V1",   name:"Vectors",                             short:"Vectors",          group:"Vectors",    tier:"ME" },
    { id:"ME-S1",   name:"The Binomial Distribution",           short:"Binomial",         group:"Statistics", tier:"ME" }
  ];

  /** Only the topics this build ships. */
  const topics = () => TOPICS.filter(t => MQ.DATA.TIERS.indexOf(t.tier) >= 0);

  const topicName = id => (TOPICS.find(t => t.id === id) || {}).short || id;
  const topicFull = id => (TOPICS.find(t => t.id === id) || {}).name || id;
  const topicMeta = id => TOPICS.find(t => t.id === id) || { id, short: id, name: id, group: "", tier: "MA" };

  /** Topic codes belonging to a boss / drill group, tier-filtered. */
  const groupTopics = group => topics().filter(t => t.group === group).map(t => t.id);

  function filter(opts) {
    const o = opts || {};
    let pool = all();
    if (o.topics && o.topics.length) pool = pool.filter(q => o.topics.includes(q.topic));
    if (o.group) pool = pool.filter(q => topicMeta(q.topic).group === o.group);
    if (o.tier) pool = pool.filter(q => MQ.DATA.tierOf(q.topic) === o.tier);
    if (o.maxDiff) pool = pool.filter(q => q.diff <= o.maxDiff);
    if (o.minDiff) pool = pool.filter(q => q.diff >= o.minDiff);
    if (o.exclude) pool = pool.filter(q => !o.exclude.has(q.id));
    return pool;
  }

  /** Weight for the adaptive draw: due reviews first, then weak topics. */
  function weightFor(q, queue, topicAcc) {
    let w = 1;
    const rec = queue.get(q.id);
    if (rec) {
      /* Due beats not-due by a lot, but a not-due entry still outranks a
         question never seen — it is known-shaky either way. Scheduling it
         EARLY would undo the spacing, so the boost is small until it is due. */
      w += rec.due ? 3.5 : 0.75;
      // Hypercorrection: a confident miss is the most correctable error there is.
      if (rec.hiConf) w += 1.5;
      w += Math.min(2, (rec.misses || 1) - 1) * 0.5;
    }
    const acc = topicAcc[q.topic];
    if (acc !== undefined && acc < 0.7) w += (0.7 - acc) * 4;
    return w;
  }

  /* ── interleaving ────────────────────────────────────────────
     Rohrer, Dedrick, Hartwig & Cheung (2020) ran interleaved against blocked
     maths practice across four months and 787 students: 61% against 38% on an
     unannounced test a month later, d = 0.83. Their operationalisation is the
     specific thing that matters, and it is simple enough to just implement —
     "no two consecutive problems require the same strategy".

     The key is the SUB-SKILL, not the topic. Inside a single-topic drill every
     question shares a topic, and blocking eight product-rule questions in a
     row is exactly the pattern the trial beat; alternating product, quotient
     and chain rule is what makes the student decide WHICH rule applies, which
     is the part a real exam tests and blocked practice never trains.

     Take from the LARGEST remaining skill group that is not the one just
     placed. Taking merely the first different one — the obvious greedy move —
     leaves the commonest skill stacked up at the end with nothing to separate
     it, and lands about one repeat above optimal on a fifteen-question drill.
     Draining the biggest group first is what keeps the run alternating all the
     way to the last question, and it provably hits the best any arrangement of
     that multiset can do: max(0, 2m-n-1) repeats for m copies of the
     commonest skill among n questions.

     Within a group the order is left alone, so the adaptive weighting above
     still decides WHICH product-rule question you get; this only decides when.
     When every remaining question shares the last skill it places a repeat
     rather than dropping one — a shorter run is a worse trade than an
     imperfect alternation. */
  const skillOf = q => q.topic + "·" + (q.sub || "");

  function interleave(list) {
    const groups = new Map();
    list.forEach(q => {
      const k = skillOf(q);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(q);
    });

    const out = [];
    let last = null;
    while (out.length < list.length) {
      let pick = null;
      groups.forEach((items, k) => {
        if (!items.length || k === last) return;
        if (!pick || items.length > groups.get(pick).length) pick = k;
      });
      // Only the just-placed skill is left: place it rather than lose it.
      if (pick === null) groups.forEach((items, k) => { if (items.length) pick = k; });
      out.push(groups.get(pick).shift());
      last = pick;
    }
    return out;
  }

  /**
   * Draw n questions with options already shuffled and `a` remapped.
   * opts: { topics, group, tier, maxDiff, minDiff, adaptive (default true), shuffleChoices }
   */
  function draw(n, opts) {
    const o = opts || {};
    let pool = filter(o);
    if (!pool.length) pool = all();

    let chosen;
    if (o.adaptive === false) {
      chosen = U.sample(pool, n);
    } else {
      const st = MQ.State.data;
      /* id -> { due, hiConf, misses }. Built once per draw rather than per
         question: the queue holds up to 150 entries and the pool can be the
         whole bank. */
      const today = MQ.U.dayKey();
      const queue = new Map((st.mistakes || []).map(m => [m.id, {
        due: !m.due || MQ.U.daysBetween(m.due, today) >= 0,
        hiConf: !!m.hiConf, misses: m.misses
      }]));
      const topicAcc = {};
      for (const [k, v] of Object.entries(st.topics || {})) {
        if (v.seen >= 4) topicAcc[k] = v.correct / v.seen;
      }
      const bag = pool.map(q => ({ q, w: weightFor(q, queue, topicAcc) * (0.5 + Math.random()) }));
      bag.sort((a, b) => b.w - a.w);
      chosen = U.shuffle(bag.slice(0, n).map(x => x.q));
    }

    // Order is a teaching decision, so it is applied to every draw — including
    // the un-adaptive ones, which are still sat one after another.
    if (o.interleave !== false) chosen = interleave(chosen);

    return chosen.map(q => (o.shuffleChoices === false ? clone(q) : shuffleChoices(q)));
  }

  function clone(q) { return Object.assign({}, q, { choices: q.choices.slice() }); }

  /** Shuffle the options so the key isn't always in the same slot. */
  function shuffleChoices(q) {
    const pairs = q.choices.map((text, i) => ({ text, correct: i === q.a }));
    const mixed = U.shuffle(pairs);
    return Object.assign({}, q, {
      choices: mixed.map(p => p.text),
      a: mixed.findIndex(p => p.correct)
    });
  }

  /**
   * Questions in the review queue. `dueOnly` restricts to the ones whose
   * spaced interval has elapsed — which is what Review Queue draws first, and
   * what the Progress screen counts.
   */
  function reviewQuestions(dueOnly, limit) {
    const src = dueOnly ? MQ.State.dueReviews() : (MQ.State.data.mistakes || []);
    let qs = src.map(m => byId(m.id)).filter(Boolean);
    /* TAKE THE TOP N FIRST, THEN interleave. Interleaving regroups by
       sub-skill and drains the largest group first, so it only preserves
       order WITHIN a group — run it over the whole queue and then slice, and
       the scheduler's ranking (overdue, then confident errors, then
       most-missed) is gone by the time the session is cut to fifteen.
       Measured before this fix: 15 of the top 15 ranked entries became 8. */
    if (limit) qs = qs.slice(0, limit);
    return interleave(qs).map(shuffleChoices);
  }

  /** Kept as the old name for anything still asking for "mistakes". */
  const mistakeQuestions = () => reviewQuestions(false);

  function bookmarkedQuestions() {
    // Interleaved like every other run. Starring ten trig-calculus questions
    // and playing them back to back is blocked practice inside a review mode.
    return interleave((MQ.State.data.bookmarks || []).map(byId).filter(Boolean))
      .map(shuffleChoices);
  }

  function statsByTopic() {
    const st = MQ.State.data;
    return topics().map(t => {
      const rec = st.topics[t.id] || { seen: 0, correct: 0 };
      return Object.assign({}, t, {
        seen: rec.seen, correct: rec.correct,
        total: all().filter(q => q.topic === t.id).length,
        mastery: MQ.State.mastery(t.id),
        accuracy: U.pct(rec.correct, rec.seen)
      });
    });
  }

  /** The weakest topic the player has actually attempted — powers "Drill my weak spot". */
  function weakestTopic() {
    const seen = statsByTopic().filter(t => t.seen >= 5);
    if (!seen.length) return null;
    return seen.sort((a, b) => a.mastery - b.mastery)[0];
  }

  /* The active tiers can change at runtime (Settings → Course), and ALL is
     the app-wide cache of the filter. Drop it, and the id index with it. */
  MQ.DATA.onTierChange(() => { ALL = null; INDEX = null; });

  return { register, all, shipped, byId, TOPICS, topics, topicName, topicFull, topicMeta, groupTopics,
           filter, draw, shuffleChoices, interleave, skillOf,
           reviewQuestions, mistakeQuestions, bookmarkedQuestions,
           statsByTopic, weakestTopic };
})();

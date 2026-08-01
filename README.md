# MathQuest — HSC Mathematics Advanced + Extension 1

A game-based study app for NSW HSC Mathematics. Zero dependencies, no build
step, no npm, no account, no backend. Clone it, open `index.html`, and it works
— including on a train with no signal once you have opened it once online.

Built from `MATHS-BRIEF-ADVANCED-EXT1.md` and its addendum, using
[MoleQuest](https://github.com/TheFinster2/Study-App/tree/claude/hsc-chemistry-study-app-04o2ri)
(HSC Chemistry) as the reference implementation.

---

## What's in it

| | |
|---|---|
| **629 multiple-choice questions** | 424 Advanced, 205 Extension 1, every one with a worked explanation |
| **137 flashcards** | 92 Advanced, 45 Extension 1, on a 5-box Leitner schedule |
| **75 procedural generators** | Calculation Crunch never repeats and never runs out |
| **20 proof puzzles** | 12 derivations and 8 inductions |
| **84 achievements** | Extension-only ones hide themselves on an Advanced build |
| **124 formulas** | Flat, searchable, and each one labelled with whether NESA prints it on the exam reference sheet |
| **17 reference sheets** | The long-form tables, with the same labelling per row |
| **13 game modes + 6 bosses + 3 arcade games** | |
| **A toolbelt in every mode** | The formula sheet and a working-out pad, without leaving the question |

### Game modes

| Mode | What it is |
|---|---|
| ⚡ **Rapid Fire** | Two minutes, endless questions, streak multipliers to ×3 |
| 🎯 **Topic Drill** | 15 adaptive questions from one topic, no clock |
| 🔁 **Equivalence Engine** | Rearrange an expression; the app checks it NUMERICALLY, so any correct form counts — `2sin(x)cos(x)` is accepted for `sin(2x)` |
| 🃏 **Match Pairs** | Concentration: function ↔ derivative, expression ↔ factored form, identity ↔ equivalent |
| 📈 **Read the Curve** | A drawn graph and four candidate equations, or the reverse. Canvas-rendered, so infinitely generatable |
| 🔢 **Calculation Crunch** | 75 generators across every topic. Type exact forms: `pi/4`, `sqrt(2)`, `3/8`, `ln(3)`, `e^2` |
| ⏱️ **Table Panic** | Fill the unit circle, the derivative table or the log laws against the clock |
| 📐 **Calculus Lab** | Drag a tangent onto a curve, or the bounds of a shaded area — then compute it exactly |
| 🪜 **Proof Builder** | Assemble a proof from shuffled step cards. Some cards are plausible and wrong |
| 🎯 **Vector Lab** *(Ext 1)* | Set an angle and speed to hit a target, then compute range, flight time or apex |
| ⛓️ **Induction Builder** *(Ext 1)* | Base case → assumption → inductive step → conclusion, in order |
| 💀 **Survival** | One life, tightening clock, escalating difficulty |
| 🩹 **Mistake Rehab** / 🔖 **Starred** | Only what you got wrong, or what you starred |

Six Exam Bosses, each with a gimmick — The Asymptote heals a proportion of the
gap every third question and so never quite reaches full health; Radian rotates
the answer options while you read them; Lord Leibniz doubles the cost of being
wrong; The Integrator hides the topic label; Sigma randomises which power-ups
you may use; and The Inductor *(Ext 1)* runs three phases, where failing one
restarts **that phase**, not the fight. Beat all of them to unlock **The Final
Paper**, a mixed 25-question gauntlet.

---

## The formula sheet, and the thing nobody tells you about it

In the exam you are handed the NESA *Mathematics Advanced / Extension 1 /
Extension 2 Reference Sheet*. Everything printed on it is free. Everything
**not** on it you have to carry in your head — and the gap between the two is
the actual revision task. Students memorise the quadratic formula (printed, so
free) and then lose a question because they assumed the annuity formulas were
printed too. They are not. Neither are the exact-value triangles, the log laws,
the projectile equations, the vector projections, or the double-angle formulas.

So every formula in this app carries a flag:

| | |
|---|---|
| ✅ **HSC sheet** | Printed. Look it up in the exam, do not burn memory on it. |
| 🧠 **Memorise** | Not printed. Nobody is giving you this one. |

It shows up in three places:

- **📄 Formula Sheet** (`#/formulas`) — 124 formulas, flat and searchable,
  filterable to just the printed ones or just the ones you have to learn.
- **📖 Reference Library** (`#/reference`) — the 17 long-form teaching tables,
  with the marker on each individual row.
- **The in-play toolbelt** — the same list, over the top of whatever you are
  playing.

`js/data/formulas.js` is the single source of truth for the flags, and its
header says plainly that NESA revises the sheet and that a wrong ✅ is worse
than no label at all. The app repeats that warning on screen. If you are
updating it, open the current PDF — do not trust memory.

## The toolbelt

Every game mode mounts two buttons in the bottom-right corner.

**📄 Formulas** opens the formula sheet as a bottom sheet over the question.
Formulas on the NESA sheet are visible immediately and cost nothing, because
that is exactly what happens in the exam. Formulas *not* on the sheet are
behind a **Tap to reveal**, and revealing one drops the run to **80% XP** —
priced like every other crutch in the app, and it **latches**: closing the
sheet does not refund it. That asymmetry is the whole design. Outside a run,
on `#/formulas`, everything is free and nothing is hidden.

**✏️ Working** opens a scribble canvas and a notes field. Draw with a finger
or a stylus, undo, four pen colours, three widths; or type. It is free and
always will be — working out is not a crutch, it is the subject. Strokes are
stored as normalised coordinates so rotating the phone redraws the working
instead of scrambling it; typed notes persist to the save file (capped at 4 kB).

---

## Running it

```bash
git clone <this repo>
cd Study-App
open index.html          # or just double-click it
```

That is genuinely all. There is no install step because there is nothing to
install.

### On a phone

**GitHub → Settings → Pages → Deploy from a branch → this branch → `/ (root)`.**
It goes live at `https://<user>.github.io/<repo>/` in about a minute.

> An agent cannot enable Pages for you — that switch is a manual step in the
> repository settings.

Then **iOS/Safari:** *Share → Add to Home Screen*. **Android/Chrome:**
*⋮ → Add to home screen*. Open it once while online so the precache completes,
and after that it works with no signal.

A LAN alternative is `python3 -m http.server 8000`, but note that service
workers do not register over plain HTTP to a LAN IP, so that route gives you
the app without the offline caching.

Progress lives in `localStorage`, so it is per-device. **Settings → Export
save** writes a JSON file you can import on another phone.

#### Reading it on a phone

The layout gets **bigger** below 560 px, not smaller — question text, answer
choices, formulas, reference tables and worked explanations all step up, and it
is the decorative chrome that gives way. Every tap target clears ~44 px, and
the results modal docks to the bottom of the screen rather than floating in the
middle, where the buttons are out of thumb reach.

**Settings → Text size** offers Normal / Large / Largest on top of that, with a
live sample so you can see what you are choosing. It scales the surfaces you
read and deliberately leaves the game boards alone: a blanket zoom reflows every
card in the app and pushes the answer buttons off a 360 px screen.

`tests/smoke.js` checks every screen for horizontal overflow at both 390 px and
360 px, which catches the whole class of "a nested fraction pushed the page
wider than the phone" regressions.

---

## Advanced only, or Advanced + Extension 1

One line, in `js/data/tiers.js`:

```js
MQ.DATA.TIERS = ["MA", "ME"];   // Advanced + Extension 1  (current)
// MQ.DATA.TIERS = ["MA"];      // Advanced only
```

Every topic code is prefixed `MA-` or `ME-` and `Bank.all()` filters on this
array, so flipping it is most of the change. For a clean Advanced-only build
also remove the five `questions-me-*.js` lines from `index.html` and from
`PRECACHE` in `sw.js`, and bump `CACHE`.

Extension 1 is **additive, not a difficulty ladder**. Advanced content is never
gated behind Extension progress. What the toggle changes:

- the `ME-` question banks, flashcards, proofs, generators and reference sheets
- Vector Lab, the Induction Builder and the sixth boss, which hide themselves
- Extension achievements, which are filtered out rather than shown as
  permanently unobtainable

`tests/validate.js` asserts **both** configurations pass, which is the only
thing stopping the toggle from rotting.

---

## Testing

```bash
node tests/validate.js     # 137 checks — content, no browser needed, run this constantly
node tests/smoke.js        #  65 checks — every screen and mode, zero console errors
node tests/align.js        #  15 checks — where the maths actually lands on the line
node tests/exploit.js      #  30 checks — the farming bot AND the honest player
node tests/arcade.js       #  27 checks — the arcade provably earns nothing
node tests/offline.js      #  32 checks — subpath, offline, and PWA update handling
```

The browser tests need `playwright-core`:

```bash
npm install --no-save playwright-core
```

Chromium is expected at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`;
change `EXECUTABLE` in `tests/harness.js` if yours lives elsewhere.

### Why there is an alignment test

`tests/align.js` measures where every stacked construct lands relative to the
**maths axis** — the height of the centre of a `+`, which is where TeX puts a
fraction bar and where the eye expects one.

It exists because all of them were wrong, in the same direction, by about an
em, and nothing caught it. A column inline-flex box takes its baseline from its
*first* item, so a fraction's anchor is the **numerator's** baseline; the
stylesheet then pushed it further down with `vertical-align:-0.46em`, and the
bar ended up 0.68 em *below* the text baseline instead of 0.34 em above it. The
whole fraction hung off the bottom of the line. "Looks a bit off" is not
something a test suite catches — unless it measures.

The `vertical-align` lengths in `styles.css` cannot be derived: they depend on
the font's descent and on the line-heights the stylesheet sets, neither of
which CSS exposes. They are measured values. If you change the font stack, the
line-heights, or the renderer's markup, run this test — it will tell you where
things actually landed rather than where you hoped.

### `BREAK` mode

The single most valuable habit here, and it takes under a minute each time:

```bash
BREAK=answer-first node tests/validate.js
```

This deletes a specific guard with a regex, checks the patched file still
parses, and then asserts the suite **fails**. A test that passes with its fix
removed is worthless. Seven guards are covered:

| `BREAK=` | The guard it deletes |
|---|---|
| `answer-first` | Generators derive the answer independently of `make()` |
| `tier-filter` | The question bank filters on the tier toggle |
| `escape` | The renderer escapes HTML *before* substituting |
| `domain` | Equivalence checking respects a declared domain |
| `minclean` | Equivalence requires enough defined sample points |
| `curve-dupe` | Read the Curve never offers the same curve twice |
| `nesa-flag` | The ✅/🧠 labels are what NESA actually prints |

---

## How it is built

```
index.html              shell + script order (the script order IS the dependency graph)
manifest.webmanifest    PWA metadata, relative start_url/scope so a subpath works
sw.js                   service worker, cache-first, versioned CACHE
css/styles.css          design system, 10 themes, and the maths render components
js/data/tiers.js        the MA / ME toggle
js/data/*.js            content — questions, flashcards, proofs, generators, reference
js/core/util.js         DOM helpers + THE MATHS RENDERER
js/core/expr.js         expression parser, evaluator, equivalence check
js/core/draw.js         canvas: plots, curves, shading, trapezoids, vectors, normal curves
js/core/audio.js        ~90 synthesised sound effects — no audio files at all
js/core/fx.js           canvas particles, confetti, floating XP
js/core/state.js        the save file
js/core/bank.js         question aggregation, tier filtering, adaptive draw
js/core/ui.js           hash router, modals, THE REWARD PIPELINE
js/core/arcade.js       ticket economy
js/games/*.js           one file per mode
js/screens/*.js         one file per screen
js/app.js               routes, bootstrap, service-worker update handling
```

### Two conventions hold it together

**Every reward flows through `UI.award()`.** Level-ups, achievement checks,
toasts, confetti, the XP multiplier and the anti-farm accuracy gate all happen
in exactly one function. No mode can forget them and no mode can bypass the
anti-cheat — which is what makes "the arcade earns nothing" structural rather
than aspirational: arcade code simply never calls it, and `validate.js` asserts
that textually.

**Every game gets its chrome from `UI.gameShell()` and registers teardown with
`UI.onLeave()`.** The router runs `onLeave` before swapping screens. It is the
only thing stopping `setInterval` timers and `requestAnimationFrame` loops
leaking between modes, and an app full of animated graphs has a lot of them.

### Rendering maths without a library

No MathJax, no KaTeX. A small inline mini-language and a ~200-line renderer in
`util.js`:

| You write | Renders as |
|---|---|
| `x^2`, `x^{n+1}` | x², x<sup>n+1</sup> |
| `\frac{a}{b}` | a stacked fraction (nests three deep — Extension 1 needs it to) |
| `\sqrt{x}` | √ with an overbar |
| `\int_a^b`, `\sum_{n=1}^{k}`, `\lim_{x->0}` | the operator with stacked limits |
| `pi`, `theta`, `>=`, `->`, `inf` | π, θ, ≥, →, ∞ |
| `d/dx`, `dy/dx` | stacked fractions |
| `\vec{a}`, `nCr(n,k)` | **a̲**, ⁿCₖ |

Input is **HTML-escaped before any substitution happens**. That ordering is
load-bearing — reverse it and the whole app is one XSS hole, since every
question, distractor and explanation goes through it. `validate.js` asserts it
directly, and `BREAK=escape` proves the assertion works.

### Marking algebra without a CAS

`js/core/expr.js` is a recursive-descent parser and evaluator. To check a
student's expression against a target it evaluates **both at eight
pseudo-random values**, seeded from the question id so a failure in the wild
reproduces exactly in a test. That is why `2sin(x)cos(x)` is accepted for
`sin(2x)` — no string comparison ever will be.

It never calls `eval()` or `new Function()` on student input. Not as safety
theatre: the parser gives strictly better errors. *"Unmatched bracket — opened
at character 3"* beats *"Unexpected token )"*.

Four failure modes are handled and tested individually — domain restrictions,
branch cuts, poles, and coincidental agreement. See §6.5 of the brief and the
`Equivalence` section of `validate.js`.

### Generated questions pick the answer first

Every generator has two independent code paths: `make()` builds the question
**backwards from a chosen answer**, and `solve()` works **forwards from the
inputs**. The validator runs 500 samples of each and asserts they agree — a
stored answer that was never re-derived by a second path is an assertion, not a
fact.

This is what stops unanswerable questions. Quadratics pick integer roots then
expand. Integrals pick the antiderivative then differentiate it. Right triangles
pick a Pythagorean triple. `nCr` picks its magnitude band first, because
randomising n and r gives you either 6 or 2.7×10¹⁴ and nothing between.
Projectiles pick the landing point, then derive the launch velocity — otherwise
the target lands off-canvas.

Writing these two paths caught two real bugs on the first run: a quotient-rule
generator that could place its evaluation point exactly on a pole, and a
log-equation generator whose contract promised an integer solution it did not
always deliver.

---

## The anti-farming design

The reference app's original design paid XP for correct answers with no penalty
for wrong ones. Mashing any option and finishing the run earned **35,097
XP/hour**. The user found it, not the tests.

- The completion bonus is **withheld entirely** below 50% accuracy, not scaled
  down — and it happens inside `UI.award()` where no mode can skip it.
- Wrong answers **subtract** XP from the run's pool, floored at zero.
- Answers faster than **1,200 ms** pay nothing. Nobody reads a question that fast.
- **No XP floors anywhere.** "At least 50 XP for finishing" is a farm, and so is
  `Math.max(15, score)` per item — flailing does eventually solve everything.
- Completion bonuses are gated on **efficiency** (ideal moves ÷ moves spent),
  not on "got there in the end".
- The Proof Builder's **restart button carries its cost**: the moves already
  spent stay on the clock, so "probe, restart, run it clean" is never cheaper.
- Optional crutches — the Equivalence Engine's live check, the Calculus Lab's
  gradient readout, revealing an off-sheet formula in the toolbelt — **latch on
  first use** and are never refunded. Switching one off before submitting used
  to refund the cost, which made it free and therefore mandatory.
- The toolbelt's formula crutch is priced the way the exam prices it: formulas
  NESA prints are free to read, formulas it does not print cost 20% of the run.
  Charged inside `UI.award()`, so no mode can forget it, and reported on the
  results screen by the shell rather than by each mode — a crutch nobody
  mentions is a crutch nobody notices paying for.
- Table Panic scores **net** (right − wrong), gives no time bonus below 75%
  accuracy, and re-draws any board where one answer holds more than 40% of the
  cells — an accidentally uniform board makes "tap the same thing sixteen
  times" a perfect score.
- Flashcards pay **once per card per day**, only when genuinely due, and only
  after `MIN_READ_MS` — and report *paid ÷ deck size* as accuracy, never the
  self-reported figure.
- The **arcade pays nothing at all**: no XP, no Primes, no achievements. A game
  that paid would beat studying.

`tests/exploit.js` measures both directions, because an anti-cheat that also
breaks honest play is not a fix. The bot is deterministic and adversarial
rather than random — a random clicker sometimes stumbles onto the right answer,
which is optimal play and is *supposed* to pay, so it cannot distinguish the
bug from the fix.

---

## Progression

- **XP:** `10 × difficulty` per correct answer, times a streak multiplier
  (×1 → ×3 in half-steps every 5 correct).
- **Levels:** `xpNeeded(n) = round(130 × n^1.5)`, 60 levels with themed titles.
  Level 20 is ~87,000 XP; level 60 about 1.42 M. A whole-HSC-year progression,
  deliberately.
- **Ascension:** at level 60, reset level and XP, keep every unlock and
  statistic, gain a permanent **+12% XP** that stacks.
- **Primes 🔢:** payouts scale to 60% so they stay scarce. Spend on 7 power-ups,
  10 themes, 22 avatars, 3 crate tiers and arcade playtime.
- **Difficulty:** Standard / Hard (×1.45 XP, −25% time) / Nightmare (×2.1 XP,
  −45% time, no 50/50 or Skip). **Separate from the tier toggle** — harder
  scoring, not more syllabus.
- **Daily challenge** derived from the date, so it is identical for everyone.
  **Weekly quests**, 3 from a 12-quest pool. **Streaks** up to +60 XP.
- **Spaced repetition:** 5-box Leitner, 1/2/4/8/16 days.
- **Adaptive draw:** ×3.5 weight on previously-missed questions, plus a bonus
  scaled to how weak the topic is.
- **Mastery** is confidence-weighted: `accuracy × min(1, seen/25)`, so a perfect
  3-question run does not read as mastered.

---

## Notes for whoever works on this next

- **Bump `CACHE` in `sw.js` on every change to a precached file**, and keep
  `MQ.VERSION` in step. `validate.js` fails the build if they drift. Shipping a
  fix without bumping means anyone already installed keeps serving the old code
  and the fix can never reach them.
- **Verify the NESA topic codes** before writing another 400 questions. They are
  correct as of the last syllabus revision the author is aware of, but codes get
  renumbered and checking now is much cheaper than re-tagging later.
- **Re-check the ✅ / 🧠 flags against the current reference sheet** whenever
  NESA revises it. `js/data/formulas.js` holds them, and the reference tables
  mark the same thing with a leading `*` on the row's first cell (strip it with
  `MQ.Reference.cells()`, test it with `MQ.Reference.isNesa()`). A formula
  wrongly marked ✅ teaches a student not to learn something nobody is going to
  give them, which is worse than shipping no label at all. `BREAK=nesa-flag`
  proves the spot-checks that cover this actually fail when a flag is wrong.
- **Indices are `<sup>`/`<sub>`, never Unicode.** The renderer used to swap
  single characters for `²` and `ⁿ` and fall back to tags for anything longer;
  the Unicode glyphs come from whatever fallback font the device has, at that
  font's own size and baseline, so `sin⁻¹x` sat visibly higher than `sin² x` on
  the same line. All the index positioning lives in the `sub,sup` rule in
  `styles.css` now. `mathText()` converts back to Unicode for plain-text and
  aria use, where alignment does not exist.
- **Distractors must differ in what the student SEES.** Read the Curve
  deduplicated its options by label and shipped two identical graphs, because a
  fallback distractor invented a new equation string and reused the correct
  answer's parameters. `sameCurve()` now samples both functions across the
  plotting window and rejects any pair that draws the same picture — including
  the case where they are undefined in the same places.
- `MQ.__current` is a documented test hook holding the current answer, so
  `exploit.js` can drive an honest player as well as a farming one. It is not a
  security hole — anyone with a console can already call `State.addXP()`, and
  there is no leaderboard. The anti-farm measures exist to stop *lazy in-app*
  farming, which is the behaviour a student actually drifts into.
- Settings has a **Force refresh** that unregisters every worker, deletes every
  cache and reloads with a cache-buster. iOS does not clear website data when a
  home-screen PWA is deleted, so without it a student can be stranded on a stale
  build with no way out.

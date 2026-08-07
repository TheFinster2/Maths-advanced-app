/* 🧮 THE SCIENTIFIC CALCULATOR.

   NESA gives you a calculator in the exam, so this one is free: no latch, no
   XP cost, no accuracy gate. It is not a crutch, it is standard equipment.
   (Contrast the formula sheet in toolbelt.js, where the off-sheet formulas do
   cost, because those are the ones NESA does NOT hand you.)

   ── THE KEYBOARD PROBLEM ────────────────────────────────────────────────────
   The single most important design decision in this file: THERE IS NO INPUT
   ELEMENT. The display is a <div>.

   The obvious way to build a calculator is an <input> showing the expression,
   with the buttons appending to its value. On a phone that is unusable: the
   input takes focus, the soft keyboard slides up over the bottom half of the
   screen, and the keypad you were trying to press is underneath it. Every
   variant of "blur it afterwards" fights the platform and loses — iOS in
   particular re-raises the keyboard on the next tap, and the keyboard's own
   animation races yours.

   The fix is to have nothing focusable to raise a keyboard for. The calculator
   keeps its own token list; the display renders it; no element in here can
   receive text input. On top of that:

     · every key calls preventDefault() on pointerdown, so pressing one never
       moves focus at all — including back to the question's answer field,
       which WOULD raise the keyboard;
     · opening the calculator blurs whatever was focused, so if the keyboard
       was already up for the answer field it goes away;
     · "→ Answer" writes to the answer field and dispatches an input event
       WITHOUT focusing it, for the same reason.

   tests/calc.js asserts all four of those, because they are invisible when
   they work and the whole feature is unusable when they do not.

   ── the token list ──────────────────────────────────────────────────────────
   Keys push {ins, show} pairs rather than appending to a string: `ins` is
   MQ.Expr syntax, `show` is what the student reads. That keeps "×" on screen
   and "*" in the parser, and it makes DEL delete `sin(` as one unit the way a
   real calculator does, instead of leaving a stray `si`.

   Nothing here calls eval(). MQ.Expr is a real parser and it is right there. */
window.MQ = window.MQ || {};

MQ.Calc = (function () {
  const U = MQ.U;

  /* Session state. Survives closing the sheet — a calculator that forgets Ans
     the moment you look at the question is not much of a calculator — but not
     a reload, which is what a student expects of the physical thing too. */
  let tokens = [];
  let ans = 0;
  let mem = 0;
  let deg = true;          // HSC questions are mixed; degrees is the safer default
  let second = false;
  let lastError = "";

  const src = () => tokens.map(t => t.ins).join("");
  const shown = () => tokens.map(t => t.show).join("");

  /** Evaluate the current expression. Returns {ok, value} or {ok:false, why}. */
  function result() {
    const s = src();
    if (!s.trim()) return { ok: false, why: "" };
    /* Auto-close brackets so a half-typed expression still previews. This is
       preview only — pressing = closes them for real, so what you saw is what
       you get. */
    const open = (s.match(/\(/g) || []).length - (s.match(/\)/g) || []).length;
    const closed = s + ")".repeat(Math.max(0, open));
    const parsed = MQ.Expr.tryParse(closed);
    if (!parsed.ok) return { ok: false, why: parsed.error };
    const v = MQ.Expr.evaluate(parsed.ast, { ans, mem, Ans: ans, M: mem });
    if (typeof v !== "number" || !isFinite(v)) {
      return { ok: false, why: Number.isNaN(v) ? "undefined" : "too large" };
    }
    return { ok: true, value: v };
  }

  /** Calculator-style number formatting: exact when it can be, short when not. */
  function fmt(n) {
    if (!isFinite(n)) return "—";
    if (Object.is(n, -0)) n = 0;
    if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
    const abs = Math.abs(n);
    if (abs !== 0 && (abs < 1e-6 || abs >= 1e12)) return n.toExponential(6).replace(/e([+-])/, " ×10^$1");
    /* 10 significant figures is what a school calculator shows, and trimming
       the trailing zeros stops 0.5 rendering as 0.5000000000. */
    return String(parseFloat(n.toPrecision(10)));
  }

  /* ── the keypad ───────────────────────────────────────────────
     Each key: [primary, secondary]. A key is {label, ins, show, act, cls}.
     `act` is for keys that do something other than insert. */
  const K = (label, ins, show, cls) => ({ label, ins, show: show || ins, cls });
  const ACT = (label, act, cls) => ({ label, act, cls });

  function layout() {
    const t = (name) => (deg ? name + "d" : name);
    const rows = [
      [
        ACT("2nd", "second", second ? "on accent" : "fn"),
        ACT(deg ? "DEG" : "RAD", "angle", "fn"),
        K("(", "(", "("),
        K(")", ")", ")"),
        ACT("DEL", "del", "warn"),
        ACT("AC", "clear", "warn")
      ],
      second ? [
        K("sin⁻¹", t("asin") + "(", "sin⁻¹(", "fn"),
        K("cos⁻¹", t("acos") + "(", "cos⁻¹(", "fn"),
        K("tan⁻¹", t("atan") + "(", "tan⁻¹(", "fn"),
        K("x³", "^3", "³", "fn"),
        K("∛", "cbrt(", "∛(", "fn"),
        K("÷", "/", "÷", "op")
      ] : [
        K("sin", t("sin") + "(", "sin(", "fn"),
        K("cos", t("cos") + "(", "cos(", "fn"),
        K("tan", t("tan") + "(", "tan(", "fn"),
        K("x²", "^2", "²", "fn"),
        K("√", "sqrt(", "√(", "fn"),
        K("÷", "/", "÷", "op")
      ],
      second ? [
        K("eˣ", "exp(", "e^(", "fn"),
        K("10ˣ", "10^(", "10^(", "fn"),
        K("π", "pi", "π", "fn"),
        K("e", "e", "e", "fn"),
        K("logₐ", "logb(", "log(", "fn"),
        K("×", "*", "×", "op")
      ] : [
        K("ln", "ln(", "ln(", "fn"),
        K("log", "log(", "log(", "fn"),
        K("π", "pi", "π", "fn"),
        K("e", "e", "e", "fn"),
        K("xʸ", "^", "^", "fn"),
        K("×", "*", "×", "op")
      ],
      [
        K("7", "7"), K("8", "8"), K("9", "9"),
        K("x!", "!", "!", "fn"),
        K("1/x", "^(-1)", "⁻¹", "fn"),
        K("−", "-", "−", "op")
      ],
      [
        K("4", "4"), K("5", "5"), K("6", "6"),
        second ? K("nPr", "npr(", "P(", "fn") : K("nCr", "ncr(", "C(", "fn"),
        K("%", "%", "%", "fn"),
        K("+", "+", "+", "op")
      ],
      [
        K("1", "1"), K("2", "2"), K("3", "3"),
        ACT("±", "negate", "fn"),
        K("Ans", "ans", "Ans", "fn"),
        ACT("=", "equals", "eq")
      ],
      [
        K("0", "0"), K(".", "."),
        K(",", ",", ",", "fn"),
        second ? ACT("MC", "memclear", "fn") : ACT("M+", "memplus", "fn"),
        K("MR", "mem", "M", "fn"),
        ACT("→ Answer", "toAnswer", "send")
      ]
    ];
    return rows;
  }

  /* ── actions ─────────────────────────────────────────────── */
  function press(key, redraw) {
    lastError = "";
    if (key.act) {
      switch (key.act) {
        case "second": second = !second; break;
        case "angle":  deg = !deg; break;
        case "del":    tokens.pop(); break;
        case "clear":  tokens = []; break;
        case "negate": {
          /* Wrap the whole expression rather than inserting a stray minus:
             that is what ± does on a calculator, and "-" is already on the
             keypad for the other meaning. */
          if (!tokens.length) break;
          tokens = [{ ins: "-(", show: "−(" }].concat(tokens, [{ ins: ")", show: ")" }]);
          break;
        }
        case "equals": {
          const r = result();
          if (r.ok) {
            ans = r.value;
            tokens = [{ ins: String(r.value), show: fmt(r.value) }];
          } else {
            lastError = r.why || "not a complete expression";
          }
          break;
        }
        case "memplus": { const r = result(); if (r.ok) mem += r.value; break; }
        case "memclear": mem = 0; break;
        case "toAnswer": sendToAnswer(); break;
      }
    } else {
      tokens.push({ ins: key.ins, show: key.show });
      /* 2nd is a one-shot modifier, like the real thing. */
      if (second) second = false;
    }
    redraw();
  }

  /**
   * Put the current value into the question's answer field.
   *
   * Deliberately does NOT focus the field. Focusing it raises the soft
   * keyboard over the calculator, which is the exact failure this whole file
   * is built to avoid. Setting .value and dispatching "input" is enough for
   * every live-preview and validation listener in the app.
   */
  function sendToAnswer() {
    const input = U.$("#view .numin:not(:disabled)");
    if (!input) { lastError = "no answer box on this screen"; return; }
    const r = result();
    if (!r.ok) { lastError = r.why || "nothing to send"; return; }
    ans = r.value;
    input.value = fmt(r.value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    MQ.UI.toast({ icon: "🧮", ms: 1600, text: "Sent <b>" + fmt(r.value) + "</b> to the answer box" });
  }

  /* ── the panel ───────────────────────────────────────────── */
  function panel() {
    const wrap = U.el("div", { class: "calc" });

    const exprLine = U.el("div", { class: "calc-expr" });
    const resultLine = U.el("div", { class: "calc-result" });
    const modeChip = U.el("span", { class: "calc-mode" });
    const display = U.el("div", { class: "calc-display" }, [
      U.el("div", { class: "calc-display-top" }, [exprLine, modeChip]),
      resultLine
    ]);

    const pad = U.el("div", { class: "calc-pad" });

    function redraw() {
      exprLine.textContent = shown() || "0";
      /* Keep the tail of a long expression in view — that is the end you are
         typing at. scrollLeft is set after layout. */
      requestAnimationFrame(() => { exprLine.scrollLeft = exprLine.scrollWidth; });

      modeChip.textContent = deg ? "DEG" : "RAD";
      modeChip.className = "calc-mode" + (deg ? "" : " rad");

      const r = result();
      if (lastError) {
        resultLine.textContent = lastError;
        resultLine.className = "calc-result bad";
      } else if (r.ok) {
        resultLine.textContent = "= " + fmt(r.value);
        resultLine.className = "calc-result";
      } else {
        resultLine.textContent = tokens.length ? "…" : "";
        resultLine.className = "calc-result dim";
      }
      if (mem) {
        resultLine.textContent += "   M " + fmt(mem);
      }
      drawPad();
    }

    function drawPad() {
      pad.innerHTML = "";
      layout().forEach(row => row.forEach(key => {
        const b = U.el("button", {
          type: "button", class: "calc-key " + (key.cls || ""), text: key.label
        });
        /* THE line that stops the soft keyboard appearing. Without it the
           press moves focus — to the button, or back to the answer field the
           student came from — and the phone raises its keyboard over the
           keypad. There is nothing focusable in this panel by design; this
           makes sure the press does not reach outside it either. */
        b.addEventListener("pointerdown", e => e.preventDefault());
        b.addEventListener("mousedown", e => e.preventDefault());
        b.addEventListener("click", () => { MQ.Sound.tick && MQ.Sound.tick(); press(key, redraw); });
        pad.appendChild(b);
      }));
    }

    wrap.appendChild(display);
    wrap.appendChild(pad);
    wrap.appendChild(U.el("p", { class: "tiny muted", style: "margin:8px 0 0", text:
      "Free — NESA gives you a calculator too. Exact answers still have to be typed " +
      "exactly: this gives you 0.7071…, not 1/√2." }));
    redraw();
    return wrap;
  }

  /** Reset the session. Called when a run ends. */
  function reset() { tokens = []; lastError = ""; second = false; }

  return { panel, reset, fmt, result,
           /* for tests */
           get state() { return { deg, second, ans, mem, tokens: tokens.slice() }; } };
})();

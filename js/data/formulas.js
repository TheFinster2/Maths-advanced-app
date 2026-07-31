/* THE FORMULA SHEET — a flat, searchable, lookup-shaped list of every formula
   the course uses, with one extra bit of information that the syllabus does
   not give you and the textbook does not either:

       whether the formula is PRINTED ON THE NESA REFERENCE SHEET.

   That single flag is the point of this file. In the exam you are handed the
   "Mathematics Advanced / Extension 1 / Extension 2 Reference Sheet". Anything
   on it is free. Anything NOT on it you must carry in your head, and the
   difference between the two lists is the actual revision task — students lose
   marks every year memorising the quadratic formula (printed, free) while
   never noticing that the annuity formulas, the projectile equations, the
   exact-value triangles and the vector projections are not.

   So: `nesa:true` means "printed, look it up in the exam". `nesa:false` means
   "MEMORISE — nobody is giving you this one." The app labels both everywhere
   it shows a formula, and the in-play Toolbelt makes the memorise-only ones
   cost XP to reveal, because that is exactly the cost they carry in the exam.

   ── on accuracy ────────────────────────────────────────────────────────────
   The flags below were set against the reference sheet as published by NESA
   for the current Advanced / Extension 1 syllabus. NESA does revise the sheet.
   The app says so, out loud, on the Formula Sheet screen — a wrong `nesa:true`
   is worse than no flag at all, because it teaches a student not to learn
   something. If you are updating this file, open the current PDF from the
   NESA site and check; do not trust memory, including mine.

   `tex` is the maths mini-language from js/core/util.js, not LaTeX. It is a
   deliberate subset — see the renderer's header comment. */
window.MQ = window.MQ || {};
MQ.DATA = MQ.DATA || {};

/* Group order is display order. Each group is one accordion section. */
MQ.DATA.formulaGroups = [
  { id: "measure",  name: "Measurement",                 icon: "📏" },
  { id: "funcs",    name: "Functions and graphs",         icon: "📈" },
  { id: "series",   name: "Sequences, series and finance", icon: "💰" },
  { id: "logs",     name: "Logarithms and exponentials",  icon: "🔟" },
  { id: "trig",     name: "Trigonometry",                 icon: "📐" },
  { id: "ident",    name: "Trigonometric identities",     icon: "🔁" },
  { id: "diff",     name: "Differentiation",              icon: "📉" },
  { id: "integ",    name: "Integration",                  icon: "∫"  },
  { id: "stats",    name: "Statistics and probability",   icon: "📊" },
  { id: "comb",     name: "Combinatorics",                icon: "🎲" },
  { id: "vect",     name: "Vectors and projectiles",      icon: "➡️" },
  { id: "proof",    name: "Proof",                        icon: "🪜" }
];

MQ.DATA.formulas = [

/* ══════════════ Measurement ══════════════ */
{id:"f-arc",       g:"measure", tier:"MA", nesa:true,  name:"Arc length",
 tex:"l = rtheta", hint:"theta in RADIANS. In degrees it is l = \\frac{theta}{360} \\times 2pi r."},
{id:"f-sector",    g:"measure", tier:"MA", nesa:true,  name:"Area of a sector",
 tex:"A = \\frac{1}{2}r^2 theta", hint:"Radians again. Half of r squared theta — not r theta squared."},
{id:"f-sectordeg", g:"measure", tier:"MA", nesa:true,  name:"Sector area in degrees",
 tex:"A = \\frac{theta}{360} \\times pi r^2", hint:"The fraction of the full circle you have swept."},
{id:"f-trapz",     g:"measure", tier:"MA", nesa:true,  name:"Trapezoidal rule",
 tex:"\\int_{a}^{b} f(x) dx ~= \\frac{b-a}{2n}[f(a) + f(b) + 2(f(x_1)+...+f(x_{n-1}))]",
 hint:"The interior values are doubled; the two endpoints are not. n is the number of SUBINTERVALS."},
{id:"f-sphere-sa", g:"measure", tier:"MA", nesa:true,  name:"Surface area of a sphere",
 tex:"A = 4pi r^2", hint:""},
{id:"f-cone-sa",   g:"measure", tier:"MA", nesa:true,  name:"Surface area of a cone",
 tex:"A = pi r^2 + pi r l", hint:"l is the SLANT height, not the perpendicular height."},
{id:"f-cone-v",    g:"measure", tier:"MA", nesa:true,  name:"Volume of a cone or pyramid",
 tex:"V = \\frac{1}{3}Ah", hint:"A is the area of the base, h the perpendicular height."},
{id:"f-sphere-v",  g:"measure", tier:"MA", nesa:true,  name:"Volume of a sphere",
 tex:"V = \\frac{4}{3}pi r^3", hint:""},
{id:"f-cyl",       g:"measure", tier:"MA", nesa:false, name:"Volume and surface area of a cylinder",
 tex:"V = pi r^2 h, \\quad A = 2pi r^2 + 2pi r h",
 hint:"NOT printed. The curved surface is the rectangle 2pi r by h unrolled."},
{id:"f-simpson",   g:"measure", tier:"MA", nesa:false, name:"Area under a curve, by counting",
 tex:"A ~= \\sum (\\text{strip width}) \\times (\\text{height})",
 hint:"Not printed and not examinable as a named rule in Advanced — but a sanity check on any numerical answer."},

/* ══════════════ Functions and graphs ══════════════ */
{id:"f-quad",      g:"funcs", tier:"MA", nesa:true,  name:"Quadratic formula",
 tex:"x = \\frac{-b +- \\sqrt{b^2 - 4ac}}{2a}", hint:"Printed. Do not waste memory on it."},
{id:"f-circle",    g:"funcs", tier:"MA", nesa:true,  name:"Circle, centre (h, k)",
 tex:"(x-h)^2 + (y-k)^2 = r^2", hint:"Complete the square in x and in y to get here from the expanded form."},
{id:"f-cubicroots",g:"funcs", tier:"MA", nesa:true,  name:"Roots of a cubic",
 tex:"alpha+beta+gamma = -\\frac{b}{a}, \\quad alpha beta + alpha gamma + beta gamma = \\frac{c}{a}, \\quad alpha beta gamma = -\\frac{d}{a}",
 hint:"Printed for the CUBIC. The quadratic version is not — see below."},
{id:"f-quadroots", g:"funcs", tier:"MA", nesa:false, name:"Sum and product of quadratic roots",
 tex:"alpha + beta = -\\frac{b}{a}, \\quad alpha beta = \\frac{c}{a}",
 hint:"NOT printed, even though the cubic version is. Learn it."},
{id:"f-disc",      g:"funcs", tier:"MA", nesa:false, name:"Discriminant",
 tex:"\\Delta = b^2 - 4ac",
 hint:"NOT printed as a named result. \\Delta>0 two roots, =0 one, <0 none."},
{id:"f-vertex",    g:"funcs", tier:"MA", nesa:false, name:"Vertex and axis of a parabola",
 tex:"x = -\\frac{b}{2a}, \\quad y = a(x-h)^2 + k \\text{ has vertex } (h,k)",
 hint:"NOT printed. Completing the square gives it every time."},
{id:"f-dist",      g:"funcs", tier:"MA", nesa:false, name:"Distance, midpoint, gradient",
 tex:"d = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}, \\quad M = (\\frac{x_1+x_2}{2}, \\frac{y_1+y_2}{2}), \\quad m = \\frac{y_2-y_1}{x_2-x_1}",
 hint:"NOT printed. Assumed from Stage 5."},
{id:"f-perp",      g:"funcs", tier:"MA", nesa:false, name:"Parallel and perpendicular lines",
 tex:"m_1 = m_2 \\text{ (parallel)}, \\quad m_1 m_2 = -1 \\text{ (perpendicular)}",
 hint:"NOT printed."},
{id:"f-transform", g:"funcs", tier:"MA", nesa:false, name:"Transformations of y = f(x)",
 tex:"y = af(b(x-h)) + k",
 hint:"NOT printed. Inside the bracket acts on x and does the OPPOSITE of what it reads; outside acts on y and does what it reads."},
{id:"f-oddeven",   g:"funcs", tier:"MA", nesa:false, name:"Odd and even functions",
 tex:"\\text{even: } f(-x) = f(x), \\quad \\text{odd: } f(-x) = -f(x)",
 hint:"NOT printed. Even is symmetric in the y-axis; odd has rotational symmetry about the origin."},
{id:"f-inv",       g:"funcs", tier:"MA", nesa:false, name:"Inverse functions",
 tex:"f(f^{-1}(x)) = x, \\quad y = f^{-1}(x) \\text{ reflects } y = f(x) \\text{ in } y = x",
 hint:"NOT printed. Swap x and y, then solve for y."},

/* ══════════════ Sequences, series and finance ══════════════ */
{id:"f-ap-t",  g:"series", tier:"MA", nesa:true,  name:"Arithmetic: nth term",
 tex:"T_n = a + (n-1)d", hint:""},
{id:"f-ap-s",  g:"series", tier:"MA", nesa:true,  name:"Arithmetic: sum of n terms",
 tex:"S_n = \\frac{n}{2}[2a + (n-1)d] = \\frac{n}{2}(a + l)",
 hint:"Use the second form when you already know the last term."},
{id:"f-gp-t",  g:"series", tier:"MA", nesa:true,  name:"Geometric: nth term",
 tex:"T_n = ar^{n-1}", hint:"n-1, not n. Check against T_1 = a every time."},
{id:"f-gp-s",  g:"series", tier:"MA", nesa:true,  name:"Geometric: sum of n terms",
 tex:"S_n = \\frac{a(r^n - 1)}{r - 1} = \\frac{a(1 - r^n)}{1 - r}, \\quad r != 1",
 hint:"Use whichever form keeps the denominator positive."},
{id:"f-gp-inf",g:"series", tier:"MA", nesa:true,  name:"Geometric: limiting sum",
 tex:"S_inf = \\frac{a}{1-r}, \\quad |r| < 1",
 hint:"The condition is part of the formula. Without |r|<1 there is no limiting sum."},
{id:"f-ci",    g:"series", tier:"MA", nesa:true,  name:"Compound interest",
 tex:"A = P(1+r)^n",
 hint:"r is the rate PER COMPOUNDING PERIOD. 12% p.a. compounded monthly means r = 0.01 and n = months."},
{id:"f-fv",    g:"series", tier:"MA", nesa:false, name:"Future value of an annuity",
 tex:"FV = M\\frac{(1+r)^n - 1}{r}",
 hint:"NOT printed. This is the one students assume is on the sheet and lose the question over."},
{id:"f-pv",    g:"series", tier:"MA", nesa:false, name:"Present value of an annuity",
 tex:"PV = M\\frac{1 - (1+r)^{-n}}{r}",
 hint:"NOT printed. Also PV = FV(1+r)^{-n}, which is easier to reconstruct under pressure."},
{id:"f-loan",  g:"series", tier:"MA", nesa:false, name:"Reducing-balance loan",
 tex:"A_n = A_{n-1}(1+r) - M",
 hint:"NOT printed. Build the recurrence, expand a few terms, spot the GP."},
{id:"f-depr",  g:"series", tier:"MA", nesa:false, name:"Declining-balance depreciation",
 tex:"S = V_0(1-r)^n", hint:"NOT printed. Compound interest with the sign flipped."},

/* ══════════════ Logarithms and exponentials ══════════════ */
{id:"f-loginv", g:"logs", tier:"MA", nesa:true,  name:"Logarithm as inverse",
 tex:"log_a a^x = x = a^{log_a x}",
 hint:"Printed. This is the line that unlocks most log equations."},
{id:"f-logbase",g:"logs", tier:"MA", nesa:true,  name:"Change of base",
 tex:"log_a x = \\frac{log_b x}{log_b a}",
 hint:"Printed. Use base e or 10 so a calculator can finish it."},
{id:"f-expbase",g:"logs", tier:"MA", nesa:true,  name:"Any exponential as base e",
 tex:"a^x = e^{x ln a}",
 hint:"Printed. This is why the derivative of a^x carries a factor of ln a."},
{id:"f-logprod",g:"logs", tier:"MA", nesa:false, name:"Log laws: product, quotient, power",
 tex:"log(xy) = log x + log y, \\quad log\\frac{x}{y} = log x - log y, \\quad log x^n = n log x",
 hint:"NOT printed. These three are pure memory — and they are on every paper."},
{id:"f-logdom", g:"logs", tier:"MA", nesa:false, name:"Domain of a logarithm",
 tex:"log_a x \\text{ requires } x > 0, \\quad a > 0, \\quad a != 1",
 hint:"NOT printed. Always check log-equation solutions back in the ORIGINAL equation."},
{id:"f-index",  g:"logs", tier:"MA", nesa:false, name:"Index laws",
 tex:"a^m a^n = a^{m+n}, \\quad \\frac{a^m}{a^n} = a^{m-n}, \\quad (a^m)^n = a^{mn}, \\quad a^{-n} = \\frac{1}{a^n}, \\quad a^{\\frac{m}{n}} = \\sqrt[n]{a^m}",
 hint:"NOT printed. Assumed knowledge."},
{id:"f-growth", g:"logs", tier:"MA", nesa:false, name:"Exponential growth and decay",
 tex:"\\frac{dN}{dt} = kN \\implies N = N_0 e^{kt}",
 hint:"NOT printed. k>0 growth, k<0 decay."},
{id:"f-newton", g:"logs", tier:"ME", nesa:false, name:"Growth toward a limit",
 tex:"\\frac{dN}{dt} = k(N - P) \\implies N = P + Ae^{kt}",
 hint:"NOT printed. Extension 1. Verify by differentiating your answer — that is the expected working."},

/* ══════════════ Trigonometry ══════════════ */
{id:"f-sohcah", g:"trig", tier:"MA", nesa:true,  name:"Right-angled trigonometry",
 tex:"sin A = \\frac{opp}{hyp}, \\quad cos A = \\frac{adj}{hyp}, \\quad tan A = \\frac{opp}{adj}",
 hint:"Printed, believe it or not."},
{id:"f-areatri",g:"trig", tier:"MA", nesa:true,  name:"Area of a triangle",
 tex:"A = \\frac{1}{2}ab sin C",
 hint:"C is the angle BETWEEN sides a and b."},
{id:"f-sine",   g:"trig", tier:"MA", nesa:true,  name:"Sine rule",
 tex:"\\frac{a}{sin A} = \\frac{b}{sin B} = \\frac{c}{sin C}",
 hint:"Watch the ambiguous case: given two sides and a non-included angle there may be two triangles."},
{id:"f-cos",    g:"trig", tier:"MA", nesa:true,  name:"Cosine rule",
 tex:"c^2 = a^2 + b^2 - 2ab cos C, \\quad cos C = \\frac{a^2+b^2-c^2}{2ab}",
 hint:"Both directions are printed."},
{id:"f-exact",  g:"trig", tier:"MA", nesa:false, name:"Exact trigonometric values",
 tex:"sin\\frac{pi}{6} = \\frac{1}{2}, \\quad sin\\frac{pi}{4} = \\frac{1}{\\sqrt{2}}, \\quad sin\\frac{pi}{3} = \\frac{\\sqrt{3}}{2}",
 hint:"NOT printed — no exact-value table appears on the sheet. Reconstruct from the 1-1-\\sqrt{2} and 1-\\sqrt{3}-2 triangles."},
{id:"f-quad4",  g:"trig", tier:"MA", nesa:false, name:"ASTC and related angles",
 tex:"\\text{All, Sine, Tangent, Cosine} \\quad (0, \\frac{pi}{2}, pi, \\frac{3pi}{2})",
 hint:"NOT printed. Reduce to the acute related angle, evaluate, then attach the quadrant's sign."},
{id:"f-radians",g:"trig", tier:"MA", nesa:false, name:"Radians and degrees",
 tex:"pi \\text{ rad} = 180 deg",
 hint:"NOT printed. Every calculus result for sin and cos assumes RADIANS."},
{id:"f-genstrig",g:"trig", tier:"MA", nesa:false, name:"General solutions",
 tex:"sin x = k \\implies x = n pi + (-1)^n alpha, \\quad cos x = k \\implies x = 2n pi +- alpha, \\quad tan x = k \\implies x = n pi + alpha",
 hint:"NOT printed. In Advanced you are usually asked for a stated domain instead — solve, then list every solution inside it."},
{id:"f-sinegraph",g:"trig", tier:"MA", nesa:false, name:"Amplitude, period, shift",
 tex:"y = a sin(b(x-c)) + d: \\quad \\text{amplitude } |a|, \\quad \\text{period } \\frac{2pi}{b}, \\quad \\text{centre } y = d",
 hint:"NOT printed. Period of tan is pi/b, not 2pi/b."},

/* ══════════════ Trigonometric identities ══════════════ */
{id:"f-recip",  g:"ident", tier:"MA", nesa:true,  name:"Reciprocal ratios",
 tex:"sec A = \\frac{1}{cos A}, \\quad cosec A = \\frac{1}{sin A}, \\quad cot A = \\frac{cos A}{sin A}",
 hint:"Printed, with their domain restrictions."},
{id:"f-pyth",   g:"ident", tier:"MA", nesa:true,  name:"Pythagorean identity",
 tex:"cos^2 A + sin^2 A = 1",
 hint:"Printed. The other two are not — divide this one by cos^2 or sin^2 to get them."},
{id:"f-pyth2",  g:"ident", tier:"MA", nesa:false, name:"The other two Pythagorean identities",
 tex:"1 + tan^2 A = sec^2 A, \\quad 1 + cot^2 A = cosec^2 A",
 hint:"NOT printed. Divide cos^2+sin^2=1 by cos^2 (or sin^2) — ten seconds, no memory needed."},
{id:"f-tandef", g:"ident", tier:"MA", nesa:false, name:"Tangent as a ratio",
 tex:"tan A = \\frac{sin A}{cos A}",
 hint:"NOT printed in this direction — only cot A = cos A / sin A is. Same fact upside down."},
{id:"f-compound",g:"ident",tier:"ME", nesa:true,  name:"Compound angles",
 tex:"sin(A+-B) = sin A cos B +- cos A sin B, \\quad cos(A+-B) = cos A cos B -+ sin A sin B, \\quad tan(A+-B) = \\frac{tan A +- tan B}{1 -+ tan A tan B}",
 hint:"Printed. Watch the flipped sign on cos and on the tan denominator."},
{id:"f-double", g:"ident", tier:"ME", nesa:false, name:"Double angles",
 tex:"sin 2A = 2 sin A cos A, \\quad cos 2A = cos^2 A - sin^2 A = 2cos^2 A - 1 = 1 - 2sin^2 A, \\quad tan 2A = \\frac{2 tan A}{1 - tan^2 A}",
 hint:"NOT printed as such — but they are the compound-angle formulas with B = A, and those ARE printed. Derive rather than memorise."},
{id:"f-tform",  g:"ident", tier:"ME", nesa:true,  name:"The t-formulae",
 tex:"t = tan\\frac{A}{2}: \\quad sin A = \\frac{2t}{1+t^2}, \\quad cos A = \\frac{1-t^2}{1+t^2}, \\quad tan A = \\frac{2t}{1-t^2}",
 hint:"Printed. Turns any rational trig equation into a rational equation in t."},
{id:"f-prod",   g:"ident", tier:"ME", nesa:true,  name:"Products to sums",
 tex:"cos A cos B = \\frac{1}{2}[cos(A-B) + cos(A+B)], \\quad sin A sin B = \\frac{1}{2}[cos(A-B) - cos(A+B)], \\quad sin A cos B = \\frac{1}{2}[sin(A+B) + sin(A-B)]",
 hint:"Printed. The route to integrating a product of two trig functions."},
{id:"f-halfsq", g:"ident", tier:"ME", nesa:true,  name:"Squared forms",
 tex:"sin^2 nx = \\frac{1}{2}(1 - cos 2nx), \\quad cos^2 nx = \\frac{1}{2}(1 + cos 2nx)",
 hint:"Printed. This is how you integrate sin^2 and cos^2 — there is no other way."},
{id:"f-aux",    g:"ident", tier:"ME", nesa:false, name:"Auxiliary angle",
 tex:"a sin x + b cos x = R sin(x + alpha), \\quad R = \\sqrt{a^2+b^2}, \\quad tan alpha = \\frac{b}{a}",
 hint:"NOT printed. Expand R sin(x+alpha) and match coefficients if you forget it."},
{id:"f-invtrig",g:"ident", tier:"ME", nesa:false, name:"Inverse trig domains and ranges",
 tex:"sin^{-1}: [-1,1] \\to [-\\frac{pi}{2}, \\frac{pi}{2}], \\quad cos^{-1}: [-1,1] \\to [0, pi], \\quad tan^{-1}: \\reals \\to (-\\frac{pi}{2}, \\frac{pi}{2})",
 hint:"NOT printed. The RANGES are the whole topic — every 'why is the answer not x?' question turns on them."},
{id:"f-invsum", g:"ident", tier:"ME", nesa:false, name:"Complementary inverse trig",
 tex:"sin^{-1}x + cos^{-1}x = \\frac{pi}{2}",
 hint:"NOT printed. Also tan^{-1}x + tan^{-1}\\frac{1}{x} = \\frac{pi}{2} for x>0."},

/* ══════════════ Differentiation ══════════════ */
{id:"f-dpower", g:"diff", tier:"MA", nesa:true,  name:"Power of a function",
 tex:"y = [f(x)]^n \\implies \\frac{dy}{dx} = n f'(x)[f(x)]^{n-1}",
 hint:"Printed. Covers x^n as the case f(x) = x."},
{id:"f-dprod",  g:"diff", tier:"MA", nesa:true,  name:"Product rule",
 tex:"y = uv \\implies \\frac{dy}{dx} = u'v + uv'", hint:"Printed."},
{id:"f-dquot",  g:"diff", tier:"MA", nesa:true,  name:"Quotient rule",
 tex:"y = \\frac{u}{v} \\implies \\frac{dy}{dx} = \\frac{u'v - uv'}{v^2}",
 hint:"Printed. The order in the numerator matters — it is not symmetric."},
{id:"f-dchain", g:"diff", tier:"MA", nesa:true,  name:"Chain rule",
 tex:"y = g(u) \\text{ where } u = f(x) \\implies \\frac{dy}{dx} = \\frac{dy}{du} \\cdot \\frac{du}{dx}",
 hint:"Printed."},
{id:"f-dsin",   g:"diff", tier:"MA", nesa:true,  name:"Derivative of sin, cos, tan",
 tex:"\\frac{d}{dx}sin f(x) = f'(x)cos f(x), \\quad \\frac{d}{dx}cos f(x) = -f'(x)sin f(x), \\quad \\frac{d}{dx}tan f(x) = f'(x)sec^2 f(x)",
 hint:"Printed. Radians only."},
{id:"f-dexp",   g:"diff", tier:"MA", nesa:true,  name:"Derivative of e and a to a power",
 tex:"\\frac{d}{dx}e^{f(x)} = f'(x)e^{f(x)}, \\quad \\frac{d}{dx}a^{f(x)} = (ln a)f'(x)a^{f(x)}",
 hint:"Printed."},
{id:"f-dlog",   g:"diff", tier:"MA", nesa:true,  name:"Derivative of a logarithm",
 tex:"\\frac{d}{dx}ln f(x) = \\frac{f'(x)}{f(x)}, \\quad \\frac{d}{dx}log_a f(x) = \\frac{f'(x)}{f(x) ln a}",
 hint:"Printed."},
{id:"f-dinv",   g:"diff", tier:"ME", nesa:true,  name:"Derivative of inverse trig",
 tex:"\\frac{d}{dx}sin^{-1}f(x) = \\frac{f'(x)}{\\sqrt{1-[f(x)]^2}}, \\quad \\frac{d}{dx}cos^{-1}f(x) = \\frac{-f'(x)}{\\sqrt{1-[f(x)]^2}}, \\quad \\frac{d}{dx}tan^{-1}f(x) = \\frac{f'(x)}{1+[f(x)]^2}",
 hint:"Printed. Note the minus sign on cos^{-1} and nothing else different."},
{id:"f-firstp", g:"diff", tier:"MA", nesa:false, name:"Differentiation from first principles",
 tex:"f'(x) = \\lim_{h to 0} \\frac{f(x+h) - f(x)}{h}",
 hint:"NOT printed. Examinable, and asked in words as often as in symbols."},
{id:"f-stat",   g:"diff", tier:"MA", nesa:false, name:"Stationary points",
 tex:"f'(x) = 0; \\quad f''(x) > 0 \\text{ min}, \\quad f''(x) < 0 \\text{ max}, \\quad f''(x) = 0 \\text{ inconclusive}",
 hint:"NOT printed. When f''=0 you must test the sign of f' either side — the second derivative test says nothing."},
{id:"f-inflect",g:"diff", tier:"MA", nesa:false, name:"Points of inflection",
 tex:"f''(x) = 0 \\text{ AND } f'' \\text{ changes sign}",
 hint:"NOT printed. f''=0 alone is not enough — y = x^4 at the origin."},
{id:"f-tangent",g:"diff", tier:"MA", nesa:false, name:"Tangent and normal",
 tex:"y - y_1 = m(x - x_1), \\quad m_{tangent} = f'(x_1), \\quad m_{normal} = -\\frac{1}{f'(x_1)}",
 hint:"NOT printed."},
{id:"f-rates",  g:"diff", tier:"MA", nesa:false, name:"Related rates",
 tex:"\\frac{dA}{dt} = \\frac{dA}{dr} \\cdot \\frac{dr}{dt}",
 hint:"NOT printed. Write down what you have, what you want, and chain between them."},
{id:"f-motion", g:"diff", tier:"MA", nesa:false, name:"Motion in a straight line",
 tex:"v = \\frac{dx}{dt}, \\quad a = \\frac{dv}{dt} = \\frac{d^2x}{dt^2}",
 hint:"NOT printed. Extension 1 adds a = v\\frac{dv}{dx} = \\frac{d}{dx}(\\frac{1}{2}v^2)."},
{id:"f-vdvdx",  g:"diff", tier:"ME", nesa:false, name:"Acceleration in terms of x",
 tex:"a = v\\frac{dv}{dx} = \\frac{d}{dx}(\\frac{1}{2}v^2)",
 hint:"NOT printed. Extension 1. Use it whenever acceleration is given as a function of position."},

/* ══════════════ Integration ══════════════ */
{id:"f-ipower", g:"integ", tier:"MA", nesa:true,  name:"Reverse chain rule, power",
 tex:"\\int f'(x)[f(x)]^n dx = \\frac{1}{n+1}[f(x)]^{n+1} + c, \\quad n != -1",
 hint:"Printed. Covers \\int x^n dx as the case f(x) = x."},
{id:"f-ilog",   g:"integ", tier:"MA", nesa:true,  name:"Integral giving a logarithm",
 tex:"\\int \\frac{f'(x)}{f(x)} dx = ln|f(x)| + c",
 hint:"Printed. The absolute value is not decoration — drop it and you lose a mark."},
{id:"f-iexp",   g:"integ", tier:"MA", nesa:true,  name:"Integral of an exponential",
 tex:"\\int f'(x)e^{f(x)} dx = e^{f(x)} + c, \\quad \\int f'(x)a^{f(x)} dx = \\frac{a^{f(x)}}{ln a} + c",
 hint:"Printed."},
{id:"f-itrig",  g:"integ", tier:"MA", nesa:true,  name:"Integrals of trig functions",
 tex:"\\int f'(x)cos f(x) dx = sin f(x) + c, \\quad \\int f'(x) sin f(x) dx = -cos f(x) + c, \\quad \\int f'(x)sec^2 f(x) dx = tan f(x) + c",
 hint:"Printed. Only sin picks up the minus sign."},
{id:"f-iasin",  g:"integ", tier:"ME", nesa:true,  name:"Integral giving inverse sine",
 tex:"\\int \\frac{f'(x)}{\\sqrt{a^2 - [f(x)]^2}} dx = sin^{-1}\\frac{f(x)}{a} + c",
 hint:"Printed. a^2 MINUS the square, under a root."},
{id:"f-iatan",  g:"integ", tier:"ME", nesa:true,  name:"Integral giving inverse tangent",
 tex:"\\int \\frac{a f'(x)}{a^2 + [f(x)]^2} dx = tan^{-1}\\frac{f(x)}{a} + c",
 hint:"Printed. Note the factor of a in the NUMERATOR of the printed form."},
{id:"f-ilinear",g:"integ", tier:"MA", nesa:false, name:"Integral of a linear power",
 tex:"\\int (ax+b)^n dx = \\frac{(ax+b)^{n+1}}{a(n+1)} + c",
 hint:"Special case of the printed rule — but the 1/a is what people forget, so learn this shape."},
{id:"f-fund",   g:"integ", tier:"MA", nesa:false, name:"Fundamental theorem",
 tex:"\\int_{a}^{b} f(x) dx = F(b) - F(a) \\text{ where } F' = f",
 hint:"NOT printed."},
{id:"f-area",   g:"integ", tier:"MA", nesa:false, name:"Area between curves",
 tex:"A = \\int_{a}^{b} (y_{top} - y_{bottom}) dx",
 hint:"NOT printed. Split at every crossing point, or the parts cancel and you get a wrong, smaller answer."},
{id:"f-isub",   g:"integ", tier:"ME", nesa:false, name:"Integration by substitution",
 tex:"\\int f(g(x))g'(x) dx = \\int f(u) du, \\quad u = g(x)",
 hint:"NOT printed. Change the LIMITS too when the integral is definite."},
{id:"f-isquare",g:"integ", tier:"ME", nesa:false, name:"Integrating sin squared and cos squared",
 tex:"\\int sin^2 x dx = \\frac{x}{2} - \\frac{sin 2x}{4} + c, \\quad \\int cos^2 x dx = \\frac{x}{2} + \\frac{sin 2x}{4} + c",
 hint:"NOT printed — but the squared-form identities that produce them ARE. Convert first, then integrate."},

/* ══════════════ Statistics and probability ══════════════ */
{id:"f-z",      g:"stats", tier:"MA", nesa:true,  name:"z-score",
 tex:"z = \\frac{x - mu}{sigma}", hint:"Printed."},
{id:"f-outlier",g:"stats", tier:"MA", nesa:true,  name:"Outliers",
 tex:"x < Q_1 - 1.5 \\times IQR \\quad \\text{or} \\quad x > Q_3 + 1.5 \\times IQR",
 hint:"Printed. 1.5, not 2."},
{id:"f-empir",  g:"stats", tier:"MA", nesa:true,  name:"The empirical rule",
 tex:"~68% \\text{ within } 1sigma, \\quad ~95% \\text{ within } 2sigma, \\quad ~99.7% \\text{ within } 3sigma",
 hint:"Printed. Enough for almost every Advanced normal-distribution question."},
{id:"f-ev",     g:"stats", tier:"MA", nesa:true,  name:"Expected value and variance",
 tex:"E(X) = mu, \\quad Var(X) = E[(X-mu)^2] = E(X^2) - mu^2",
 hint:"Printed."},
{id:"f-cont",   g:"stats", tier:"MA", nesa:true,  name:"Continuous random variables",
 tex:"P(X <= r) = \\int_{a}^{r} f(x) dx, \\quad P(s <= X <= t) = \\int_{s}^{t} f(x) dx",
 hint:"Printed. The total area under a probability density function is 1."},
{id:"f-padd",   g:"stats", tier:"MA", nesa:true,  name:"Addition rule",
 tex:"P(A \\union B) = P(A) + P(B) - P(A \\inter B)",
 hint:"Printed (in the Extension 1 probability block, but the sheet is one document)."},
{id:"f-pcond",  g:"stats", tier:"MA", nesa:true,  name:"Conditional probability",
 tex:"P(A|B) = \\frac{P(A \\inter B)}{P(B)}, \\quad P(B) != 0", hint:"Printed."},
{id:"f-pind",   g:"stats", tier:"MA", nesa:true,  name:"Independence",
 tex:"P(A \\inter B) = P(A)P(B)", hint:"Printed. This is the TEST for independence, not an always-true rule."},
{id:"f-linear", g:"stats", tier:"MA", nesa:false, name:"Linear change of a random variable",
 tex:"E(aX+b) = aE(X)+b, \\quad Var(aX+b) = a^2 Var(X)",
 hint:"NOT printed. Note the a SQUARED, and that b disappears from the variance."},
{id:"f-lsq",    g:"stats", tier:"MA", nesa:false, name:"Least-squares regression",
 tex:"\\text{the line passes through } (\\bar{x}, \\bar{y})",
 hint:"NOT printed. In Advanced you get the line from technology — but this fact is examinable."},
{id:"f-corr",   g:"stats", tier:"MA", nesa:false, name:"Correlation coefficient",
 tex:"-1 <= r <= 1",
 hint:"NOT printed. r near 0 rules out a LINEAR relationship, not any relationship."},
{id:"f-mean",   g:"stats", tier:"MA", nesa:false, name:"Mean and standard deviation of data",
 tex:"\\bar{x} = \\frac{\\sum x}{n}",
 hint:"NOT printed. Know the difference between the population and sample standard deviation keys on your calculator."},
{id:"f-binom",  g:"stats", tier:"ME", nesa:true,  name:"Binomial probability",
 tex:"P(X = r) = nCr(n,r)p^r(1-p)^{n-r}, \\quad r = 0, 1, ..., n", hint:"Printed."},
{id:"f-binomev",g:"stats", tier:"ME", nesa:true,  name:"Binomial mean and variance",
 tex:"E(X) = np, \\quad Var(X) = np(1-p)", hint:"Printed."},
{id:"f-prop",   g:"stats", tier:"MA", nesa:false, name:"Sample proportions",
 tex:"E(\\hat{p}) = p, \\quad Var(\\hat{p}) = \\frac{p(1-p)}{n}",
 hint:"NOT printed. Advanced MA-S3. The standard deviation is the square root of that."},
{id:"f-normapp",g:"stats", tier:"ME", nesa:false, name:"Normal approximation to the binomial",
 tex:"X ~= N(np, np(1-p)) \\text{ when } np >= 5 \\text{ and } n(1-p) >= 5",
 hint:"NOT printed."},

/* ══════════════ Combinatorics ══════════════ */
{id:"f-npr",   g:"comb", tier:"ME", nesa:true,  name:"Permutations",
 tex:"nPr(n,r) = \\frac{n!}{(n-r)!}", hint:"Printed. Order matters."},
{id:"f-ncr",   g:"comb", tier:"ME", nesa:true,  name:"Combinations",
 tex:"nCr(n,r) = \\frac{n!}{r!(n-r)!} = \\frac{1}{r!} \\times nPr(n,r)",
 hint:"Printed. Order does not matter."},
{id:"f-binexp",g:"comb", tier:"ME", nesa:true,  name:"Binomial expansion",
 tex:"(x+a)^n = x^n + nCr(n,1)x^{n-1}a + ... + nCr(n,r)x^{n-r}a^r + ... + a^n",
 hint:"Printed. The general term is nCr(n,r)x^{n-r}a^r — index it from r = 0."},
{id:"f-circperm",g:"comb",tier:"ME", nesa:false, name:"Circular arrangements",
 tex:"(n-1)!",
 hint:"NOT printed. Fix one object to kill the rotational symmetry, then arrange the rest."},
{id:"f-repeat",g:"comb", tier:"ME", nesa:false, name:"Arrangements with repeats",
 tex:"\\frac{n!}{p! q! ...}",
 hint:"NOT printed. Divide by the factorial of each repeated group's size."},
{id:"f-pascal",g:"comb", tier:"ME", nesa:false, name:"Pascal's identity and symmetry",
 tex:"nCr(n,r) = nCr(n,n-r), \\quad nCr(n,r) = nCr(n-1,r-1) + nCr(n-1,r)",
 hint:"NOT printed."},
{id:"f-sumcoef",g:"comb",tier:"ME", nesa:false, name:"Sum of binomial coefficients",
 tex:"\\sum_{r=0}^{n} nCr(n,r) = 2^n",
 hint:"NOT printed. Substitute x = a = 1 into the printed expansion."},
{id:"f-pigeon",g:"comb", tier:"ME", nesa:false, name:"Pigeonhole principle",
 tex:"n+1 \\text{ objects in } n \\text{ boxes} \\implies \\text{some box holds } >= 2",
 hint:"NOT printed. Generalised: kn+1 objects force some box to hold at least k+1."},

/* ══════════════ Vectors and projectiles ══════════════ */
{id:"f-vmag",  g:"vect", tier:"ME", nesa:true,  name:"Magnitude of a vector",
 tex:"|\\vec{u}| = |x\\vec{i} + y\\vec{j}| = \\sqrt{x^2 + y^2}", hint:"Printed."},
{id:"f-vdot",  g:"vect", tier:"ME", nesa:true,  name:"Dot product",
 tex:"\\vec{u} \\cdot \\vec{v} = |\\vec{u}||\\vec{v}|cos theta = x_1x_2 + y_1y_2",
 hint:"Printed in both forms — setting them equal is how you find the angle."},
{id:"f-vline", g:"vect", tier:"ME", nesa:true,  name:"Vector equation of a line",
 tex:"\\vec{r} = \\vec{a} + lambda \\vec{b}", hint:"Printed. a is a point on the line, b its direction."},
{id:"f-vunit", g:"vect", tier:"ME", nesa:false, name:"Unit vector",
 tex:"\\hat{u} = \\frac{\\vec{u}}{|\\vec{u}|}", hint:"NOT printed."},
{id:"f-vperp", g:"vect", tier:"ME", nesa:false, name:"Perpendicular and parallel vectors",
 tex:"\\vec{u} \\cdot \\vec{v} = 0 \\text{ (perpendicular)}, \\quad \\vec{u} = k\\vec{v} \\text{ (parallel)}",
 hint:"NOT printed."},
{id:"f-vproj", g:"vect", tier:"ME", nesa:false, name:"Projection of a vector",
 tex:"\\text{scalar: } \\frac{\\vec{u} \\cdot \\vec{v}}{|\\vec{v}|}, \\quad \\text{vector: } \\frac{\\vec{u} \\cdot \\vec{v}}{|\\vec{v}|^2}\\vec{v}",
 hint:"NOT printed, and it is asked most years. The vector projection squares the magnitude in the denominator."},
{id:"f-proj-x",g:"vect", tier:"ME", nesa:false, name:"Projectile displacement",
 tex:"x = Vt cos theta, \\quad y = Vt sin theta - \\frac{1}{2}gt^2",
 hint:"NOT printed. You are expected to DERIVE these from \\ddot{x} = 0 and \\ddot{y} = -g by integrating twice."},
{id:"f-proj-v",g:"vect", tier:"ME", nesa:false, name:"Projectile velocity",
 tex:"\\dot{x} = V cos theta, \\quad \\dot{y} = V sin theta - gt",
 hint:"NOT printed. Horizontal velocity is constant; only the vertical component changes."},
{id:"f-proj-r",g:"vect", tier:"ME", nesa:false, name:"Time of flight, range, maximum height",
 tex:"T = \\frac{2V sin theta}{g}, \\quad R = \\frac{V^2 sin 2theta}{g}, \\quad H = \\frac{V^2 sin^2 theta}{2g}",
 hint:"NOT printed, and only valid for launch and landing at the SAME height. Derive instead of trusting them."},

/* ══════════════ Proof ══════════════ */
{id:"f-induct", g:"proof", tier:"ME", nesa:false, name:"Proof by induction",
 tex:"\\text{base } n = n_0; \\quad \\text{assume } n = k; \\quad \\text{prove } n = k+1; \\quad \\therefore \\text{ true for all } n >= n_0",
 hint:"NOT printed. The base case is not a formality — without it the implication proves nothing."},
{id:"f-remain", g:"proof", tier:"ME", nesa:false, name:"Remainder and factor theorems",
 tex:"P(x) \\div (x-a) \\text{ leaves } P(a); \\quad (x-a) \\text{ is a factor} \\iff P(a) = 0",
 hint:"NOT printed."},
{id:"f-double-root",g:"proof",tier:"ME",nesa:false, name:"Repeated roots",
 tex:"x = a \\text{ is a double root} \\iff P(a) = 0 \\text{ and } P'(a) = 0",
 hint:"NOT printed."},
{id:"f-ineq",   g:"proof", tier:"ME", nesa:false, name:"AM–GM for two numbers",
 tex:"\\frac{a+b}{2} >= \\sqrt{ab}, \\quad a, b >= 0",
 hint:"NOT printed. It falls straight out of (\\sqrt{a} - \\sqrt{b})^2 >= 0."},
{id:"f-contra", g:"proof", tier:"ME", nesa:false, name:"Proof by contradiction",
 tex:"\\text{assume } \\lnot P; \\quad \\text{derive a contradiction}; \\quad \\therefore P",
 hint:"NOT printed. State the assumption explicitly — the marks are in the structure."}
];

/* ── access ─────────────────────────────────────────────────────
   Tier-filtered exactly like every other bank, through MQ.DATA.tierEnabled,
   so an Advanced-only build never shows an Extension 1 formula. */
MQ.Formulas = (function () {
  let cached = null;

  function all() {
    if (!cached) cached = MQ.DATA.formulas.filter(f => MQ.DATA.TIERS.indexOf(f.tier) >= 0);
    return cached;
  }

  const byId = id => all().find(f => f.id === id);

  /** Formulas printed on the NESA reference sheet. */
  const onSheet = () => all().filter(f => f.nesa);
  /** Formulas you have to carry in your head. */
  const mustLearn = () => all().filter(f => !f.nesa);

  /**
   * Search names, formulas and hints.
   * `filter` is "all" | "sheet" | "learn".
   */
  function search(term, filter) {
    const t = String(term || "").trim().toLowerCase();
    let list = all();
    if (filter === "sheet") list = list.filter(f => f.nesa);
    else if (filter === "learn") list = list.filter(f => !f.nesa);
    if (!t) return list;
    return list.filter(f => {
      const group = MQ.DATA.formulaGroups.find(g => g.id === f.g);
      return (f.name + " " + f.tex + " " + (f.hint || "") + " " + (group ? group.name : ""))
        .toLowerCase().includes(t);
    });
  }

  /** Search results bucketed into display groups, empty groups dropped. */
  function grouped(term, filter) {
    const found = search(term, filter);
    return MQ.DATA.formulaGroups
      .map(g => ({ group: g, items: found.filter(f => f.g === g.id) }))
      .filter(sec => sec.items.length);
  }

  return { all, byId, onSheet, mustLearn, search, grouped };
})();

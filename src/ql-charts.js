/*! ql-charts.js v1.0.1 - zero-dependency SVG stock chart widgets. MIT License. https://github.com/quotelinks/stock-charts
 *  Data: supplied by the host page only (data-src URL, inline JSON, or JS API).
 *  Usage:
 *    <div class="ql-chart" data-type="analyst-gauge" data-src="/data/acme-gauge.json"></div>
 *    <script src="ql-charts.js" defer></script>
 *  or QLCharts.render(element, "price-target", dataObject, {theme:"dark"})
 */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var CREDIT_URL = "https://www.quotelinks.com/";

  /* ---------- formatting ---------- */
  function money(v, cur) {
    if (v == null || isNaN(v)) return "—";
    var abs = Math.abs(v), d = abs >= 1000 ? 0 : 2;
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: cur || "USD", minimumFractionDigits: 0, maximumFractionDigits: d }).format(v);
    } catch (e) { return "$" + v.toFixed(d); }
  }
  function pct(v, d) {
    if (v == null || isNaN(v)) return "—";
    return (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(d == null ? 2 : d) + "%";
  }
  function cls(v) { return v > 0 ? "up" : v < 0 ? "dn" : ""; }
  var MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  function pd(s) { var p = String(s).split("-"); return new Date(Date.UTC(+p[0], (+p[1] || 1) - 1, +p[2] || 1)); }
  function monYr(d) { return MON[d.getUTCMonth()] + " " + d.getUTCFullYear(); }
  function dayStr(d) { return MON[d.getUTCMonth()] + " " + d.getUTCDate() + ", " + d.getUTCFullYear(); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* nice ticks */
  function ticks(lo, hi, n) {
    if (hi <= lo) { hi = lo + 1; }
    var step = (hi - lo) / (n || 5), mag = Math.pow(10, Math.floor(Math.log10(step))), r = step / mag;
    step = (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag;
    var a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, out = [];
    for (var v = a; v <= b + step / 2; v += step) out.push(+v.toFixed(10));
    return out;
  }

  /* ---------- svg helpers ---------- */
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, s, attrs) {
    var t = el("text", Object.assign({ x: x, y: y }, attrs || {}), parent);
    t.textContent = s; return t;
  }

  /* ---------- styles ---------- */
  var CSS = [
    ":host{display:block;max-width:100%;font:14px/1.4 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}",
    ".w{--bg:#fff;--fg:#111827;--fg2:#374151;--mut:#6b7280;--grid:#f3f4f6;--bd:#e5e7eb;--s1:#1d4ed8;--up:#047857;--dn:#c2410c;--track:#d1d5db;--chip:#eff4ff;--ups:#ecfdf5;--dns:#fff4ed;",
    "--g1:#c2410c;--g2:#fb923c;--g3:#9ca3af;--g4:#10b981;--g5:#047857;--gt1:#fff;--gt2:#111827;--gt3:#111827;--gt4:#fff;--gt5:#fff;--tipbg:#111827;--tipfg:#fff;",
    "background:var(--bg);color:var(--fg);border:1px solid var(--bd);border-radius:12px;padding:16px;box-sizing:border-box;position:relative;overflow:hidden}",
    ".w.dark{--bg:#111827;--fg:#f3f4f6;--fg2:#d1d5db;--mut:#9ca3af;--grid:#1f2937;--bd:#374151;--s1:#60a5fa;--up:#34d399;--dn:#fb923c;--track:#4b5563;--chip:#1e293b;--ups:#064e3b;--dns:#431407;",
    "--g1:#f97316;--g2:#fdba74;--g3:#6b7280;--g4:#6ee7b7;--g5:#10b981;--gt1:#111827;--gt2:#111827;--gt3:#fff;--gt4:#111827;--gt5:#111827;--tipbg:#f3f4f6;--tipfg:#111827}",
    ".w.flat{border:0;padding:0;background:transparent}",
    "h3{margin:0 0 10px;font-size:17px;font-weight:700}",
    ".hd{display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:10px}",
    ".hd h3{margin:0}.sub{color:var(--fg2);font-size:13px}",
    ".big{font-size:19px;font-weight:600;text-align:center;margin:0 0 4px}",
    ".cons{font-size:19px;font-weight:600;text-align:center;margin:8px 0 0}",
    ".up{color:var(--up)}.dn{color:var(--dn)}",
    "svg{display:block;width:100%;height:auto;overflow:visible}",
    "svg text{fill:var(--mut);font-size:11px;font-family:inherit}",
    "table{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px;font-variant-numeric:tabular-nums}",
    "th,td{padding:6px 4px;text-align:right;border-bottom:1px solid var(--grid)}th:first-child,td:first-child{text-align:left}",
    "th{font-weight:600;color:var(--fg2)}tr:last-child td{border-bottom:0}@media (max-width:420px){table{font-size:12px}th,td{padding:6px 2px}}",
    ".seg{display:inline-flex;background:var(--grid);border:1px solid var(--bd);border-radius:8px;padding:2px;gap:2px}",
    ".seg button{all:unset;cursor:pointer;padding:3px 10px;font-size:12px;color:var(--mut);border-radius:6px}",
    ".seg button[aria-pressed=true]{background:var(--bg);color:var(--s1);font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.08)}",
    ".seg button:focus-visible{outline:2px solid var(--s1);outline-offset:-2px}",
    ".tip{position:absolute;pointer-events:none;background:var(--tipbg);color:var(--tipfg);font-size:12px;padding:6px 8px;border-radius:6px;white-space:nowrap;opacity:0;transition:opacity .1s;z-index:2;font-variant-numeric:tabular-nums}",
    ".tip b{font-weight:600}",
    ".lg{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:12px;color:var(--fg2);margin-top:8px}",
    ".lg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}",
    ".rows{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;gap:6px 10px;align-items:center;font-size:13px;margin-top:12px;font-variant-numeric:tabular-nums}",
    ".rows .c{text-align:right;color:var(--fg2)}",
    ".stats{display:flex;gap:18px;flex-wrap:wrap;font-size:13px;color:var(--fg2);margin-bottom:8px}.stats b{color:var(--fg);font-weight:600}",
    ".err{color:var(--mut);font-size:13px;text-align:center;padding:24px 0}",
    "@media (prefers-reduced-motion:reduce){.tip{transition:none}}"
  ].join("");

  /* ---------- base ---------- */
  function Base(host, data, opts) {
    this.host = host; this.data = data; this.o = opts || {};
    var root = host.shadowRoot || host.attachShadow({ mode: "open" });
    root.innerHTML = "";
    var st = document.createElement("style"); st.textContent = CSS; root.appendChild(st);
    this.w = document.createElement("div"); this.w.className = "w"; root.appendChild(this.w);
    var th = this.o.theme || "light";
    var dark = th === "dark" || (th === "auto" && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) this.w.classList.add("dark");
    if (this.o.frame === "none") this.w.classList.add("flat");
    this.body = document.createElement("div"); this.w.appendChild(this.body);
    this.tipEl = document.createElement("div"); this.tipEl.className = "tip"; this.tipEl.setAttribute("role", "status"); this.w.appendChild(this.tipEl);
    var slot = document.createElement("slot"); slot.name = "credit"; this.w.appendChild(slot);
    root.appendChild(document.createElement("slot")); // default slot kept empty
  }
  Base.prototype.width = function () { return Math.max(240, Math.round(this.body.clientWidth || this.host.clientWidth || 360)); };
  Base.prototype.tip = function (html, x, y) {
    var t = this.tipEl;
    if (html == null) { t.style.opacity = 0; return; }
    t.innerHTML = html; t.style.opacity = 1;
    var wr = this.w.getBoundingClientRect(), tw = t.offsetWidth, th = t.offsetHeight;
    var lx = x + 12; if (lx + tw > wr.width - 4) lx = x - tw - 12; if (lx < 4) lx = 4;
    var ly = y - th - 10; if (ly < 4) ly = y + 14;
    t.style.left = lx + "px"; t.style.top = ly + "px";
  };
  /* position of an svg-local point relative to the widget box */
  Base.prototype.rel = function (svg, ev) {
    var r = this.w.getBoundingClientRect(), s = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
    var k = vb.width / s.width;
    return { x: ev.clientX - r.left, y: ev.clientY - r.top, sx: (ev.clientX - s.left) * k, sy: (ev.clientY - s.top) * k };
  };

  /* ---------- 1. analyst gauge ---------- */
  var RATING = ["Strong Sell", "Sell", "Hold", "Buy", "Strong Buy"];
  function scoreOf(c) {
    if (typeof c === "number") return Math.min(5, Math.max(1, c));
    var i = RATING.map(function (s) { return s.toLowerCase(); }).indexOf(String(c || "").toLowerCase());
    return i < 0 ? 3 : i + 1;
  }
  function labelOf(s) { return RATING[Math.min(4, Math.max(0, Math.round(s) - 1))]; }

  function gauge(b) {
    var d = b.data, sc = scoreOf(d.consensus), lab = typeof d.consensus === "string" ? d.consensus : labelOf(sc);
    var up = d.target != null && d.price ? (d.target / d.price - 1) * 100 : null;
    var h = "";
    if (d.target != null) h += '<p class="big">12-month target <span class="' + cls(up) + '">' + money(d.target, d.currency) + "</span>" + (up != null ? '<br><span class="sub ' + cls(up) + '" style="font-size:14px;font-weight:600">' + pct(up, 1) + (up >= 0 ? " upside" : " downside") + "</span>" : "") + "</p>";
    b.body.innerHTML = h;
    var svg = el("svg", { viewBox: "0 0 300 175", role: "img", "aria-label": "Analyst consensus " + lab + ", score " + sc.toFixed(2) + " of 5" }, b.body);
    var cx = 150, cy = 158, R = 135, r = 82;
    function pt(a, rad) { a = a * Math.PI / 180; return [cx + rad * Math.cos(a), cy - rad * Math.sin(a)]; }
    for (var i = 0; i < 5; i++) {
      var a0 = 180 - 36 * i, a1 = 180 - 36 * (i + 1), p0 = pt(a0, R), p1 = pt(a1, R), q1 = pt(a1, r), q0 = pt(a0, r);
      var seg = el("path", { d: "M" + p0 + "A" + R + " " + R + " 0 0 1 " + p1 + "L" + q1 + "A" + r + " " + r + " 0 0 0 " + q0 + "Z", fill: "var(--g" + (i + 1) + ")", stroke: "var(--bg)", "stroke-width": 2 }, svg);
      el("title", {}, seg).textContent = RATING[i];
    }
    txt(svg, cx - (R + r) / 2, cy + 15, "Bearish", { "text-anchor": "middle" });
    txt(svg, cx + (R + r) / 2, cy + 15, "Bullish", { "text-anchor": "middle" });
    var ang = 180 - (sc - 1) / 4 * 180, tip = pt(ang, r + 18), n1 = pt(ang + 90, 6), n2 = pt(ang - 90, 6);
    var needle = el("g", {}, svg);
    el("path", { d: "M" + n1 + "L" + tip + "L" + n2 + "Z", fill: "var(--fg2)" }, needle);
    el("circle", { cx: cx, cy: cy, r: 10, fill: "var(--fg2)" }, needle);
    var c = document.createElement("p"); c.className = "cons";
    c.innerHTML = "Wall Street rating: <span class=\"" + (sc >= 3.5 ? "up" : sc < 2.5 ? "dn" : "") + "\">" + esc(lab) + "</span>";
    b.body.appendChild(c);
    if (d.analysts) { var s = document.createElement("p"); s.className = "sub"; s.style.cssText = "text-align:center;margin:2px 0 0"; s.textContent = "From " + d.analysts + " analyst ratings" + (d.asOf ? " · updated " + dayStr(pd(d.asOf)) : ""); b.body.appendChild(s); }
  }

  /* ---------- 2. price target forecast ---------- */
  function priceTarget(b) {
    var d = b.data, P = (d.prices || []).map(function (p) { return [pd(p[0]), +p[1]]; });
    var cur = d.currency, price = d.price != null ? d.price : (P.length ? P[P.length - 1][1] : null);
    var hz = d.horizonMonths || 12;
    b.body.innerHTML = '<div class="hd"><h3>' + esc(d.title || "Analyst Price Forecast") + "</h3>" + (d.symbol ? '<span class="sub">' + esc(d.symbol) + "</span>" : "") + "</div>";
    var W = b.width(), H = Math.round(Math.min(320, Math.max(220, W * 0.52)));
    var L = 46, Rr = W < 420 ? 64 : 84, T = 30, B = 26, pw = W - L - Rr, ph = H - T - B;
    var mid = L + pw * 0.5;
    var vals = P.map(function (p) { return p[1]; }).concat([d.low, d.high, d.average].filter(function (v) { return v != null; }));
    var tk = ticks(Math.min.apply(null, vals), Math.max.apply(null, vals), 5);
    var y0 = tk[0], y1 = tk[tk.length - 1];
    function Y(v) { return T + ph - (v - y0) / (y1 - y0) * ph; }
    var t0 = P.length ? +P[0][0] : 0, t1 = P.length ? +P[P.length - 1][0] : 1;
    function X(t) { return L + (t - t0) / Math.max(1, t1 - t0) * (mid - L); }
    var end = L + pw;
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Price history and " + hz + "-month analyst price targets: low " + money(d.low, cur) + ", average " + money(d.average, cur) + ", high " + money(d.high, cur) }, b.body);
    tk.forEach(function (v) {
      el("line", { x1: L, x2: end, y1: Y(v), y2: Y(v), stroke: "var(--grid)" }, svg);
      txt(svg, L - 6, Y(v) + 4, money(v, cur).replace(/\.00$/, ""), { "text-anchor": "end" });
    });
    el("line", { x1: mid, x2: mid, y1: T - 22, y2: T + ph, stroke: "var(--grid)" }, svg);
    el("line", { x1: end, x2: end, y1: T, y2: T + ph, stroke: "var(--grid)" }, svg);
    txt(svg, mid - 8, T - 10, W < 420 ? "History" : "Last " + hz + " months", { "text-anchor": "end", style: "font-weight:600;fill:var(--fg2);font-size:12px" });
    txt(svg, mid + 8, T - 10, W < 420 ? "Outlook" : "Next " + hz + " months", { style: "font-weight:600;fill:var(--fg2);font-size:12px" });
    // x labels
    if (P.length) {
      // one fixed month step across both halves, anchored at the last close, so labels are evenly spaced
      var k = W >= 640 ? 3 : W >= 420 ? 6 : hz, lastD = P[P.length - 1][0], fw = (end - mid) / hz;
      for (var j = -Math.floor(120 / k); j * k <= hz; j++) {
        var dt = new Date(lastD); dt.setUTCMonth(dt.getUTCMonth() + j * k);
        var xx = j <= 0 ? X(+dt) : mid + j * k * fw;
        if (xx < L + 24) continue;
        txt(svg, xx, H - 6, monYr(dt), { "text-anchor": "middle" });
        el("line", { x1: xx, x2: xx, y1: T + ph, y2: T + ph + 4, stroke: "var(--bd)" }, svg);
      }
    }
    // forecast lines
    var lx = mid, ly = Y(price);
    var F = [["high", "Highest", "var(--up)"], ["average", "Mean", "var(--fg2)"], ["low", "Lowest", "var(--dn)"]].filter(function (f) { return d[f[0]] != null; });
    F.forEach(function (f) { el("line", { x1: lx, y1: ly, x2: end, y2: Y(d[f[0]]), stroke: f[2], "stroke-width": 2, "stroke-dasharray": "5 5" }, svg); });
    // price line
    if (P.length) el("polyline", { points: P.map(function (p) { return X(+p[0]).toFixed(1) + "," + Y(p[1]).toFixed(1); }).join(" "), fill: "none", stroke: "var(--s1)", "stroke-width": 2, "stroke-linejoin": "round" }, svg);
    el("circle", { cx: lx, cy: ly, r: 5, fill: "var(--s1)", stroke: "var(--bg)", "stroke-width": 2 }, svg);
    // callouts with collision nudging
    var ys = F.map(function (f) { return Y(d[f[0]]); }), gap = 30;
    for (var k = 1; k < ys.length; k++) if (ys[k] - ys[k - 1] < gap) ys[k] = ys[k - 1] + gap;
    F.forEach(function (f, j) {
      var g = el("g", {}, svg), y = ys[j];
      txt(g, end + 8, y - 2, f[1], { style: "font-weight:600;font-size:12px;fill:" + f[2] });
      txt(g, end + 8, y + 12, money(d[f[0]], cur), { style: "font-weight:600;font-size:12px;fill:" + f[2] });
    });
    // hover
    var cross = el("line", { y1: T, y2: T + ph, stroke: "var(--mut)", "stroke-dasharray": "2 3", visibility: "hidden" }, svg);
    var dot = el("circle", { r: 4, fill: "var(--s1)", stroke: "var(--bg)", "stroke-width": 2, visibility: "hidden" }, svg);
    var hit = el("rect", { x: L, y: T, width: pw, height: ph, fill: "transparent" }, svg);
    hit.addEventListener("pointermove", function (ev) {
      var p = b.rel(svg, ev);
      if (p.sx <= mid && P.length) {
        var t = t0 + (p.sx - L) / (mid - L) * (t1 - t0), bi = 0;
        for (var i = 1; i < P.length; i++) if (Math.abs(+P[i][0] - t) < Math.abs(+P[bi][0] - t)) bi = i;
        var xx = X(+P[bi][0]);
        cross.setAttribute("x1", xx); cross.setAttribute("x2", xx); cross.setAttribute("visibility", "visible");
        dot.setAttribute("cx", xx); dot.setAttribute("cy", Y(P[bi][1])); dot.setAttribute("visibility", "visible");
        b.tip(dayStr(P[bi][0]) + "<br><b>" + money(P[bi][1], cur) + "</b>", p.x, p.y);
      } else {
        cross.setAttribute("visibility", "hidden"); dot.setAttribute("visibility", "hidden");
        b.tip(hz + "-month targets<br>" + F.map(function (f) { var u = (d[f[0]] / price - 1) * 100; return f[1] + ": <b>" + money(d[f[0]], cur) + "</b> (" + pct(u) + ")"; }).join("<br>"), p.x, p.y);
      }
    });
    hit.addEventListener("pointerleave", function () { cross.setAttribute("visibility", "hidden"); dot.setAttribute("visibility", "hidden"); b.tip(null); });
    // table
    var cols = [["low", "Lowest"], ["average", "Mean"], ["median", "Median"], ["high", "Highest"]].filter(function (c) { return d[c[0]] != null; });
    var tb = "<table><thead><tr><th>" + hz + "-mo target</th>" + cols.map(function (c) { return "<th>" + c[1] + "</th>"; }).join("") + "</tr></thead><tbody><tr><td>Price</td>" +
      cols.map(function (c) { return "<td>" + money(d[c[0]], cur) + "</td>"; }).join("") + "</tr><tr><td>vs. today</td>" +
      cols.map(function (c) { var u = (d[c[0]] / price - 1) * 100; return '<td class="' + cls(u) + '">' + pct(u, W < 420 ? 1 : 2) + "</td>"; }).join("") + "</tr></tbody></table>";
    b.body.insertAdjacentHTML("beforeend", tb);
  }

  /* ---------- 3. ratings breakdown ---------- */
  function ratings(b) {
    var d = b.data, keys = [["strongBuy", "Strong Buy", 5], ["buy", "Buy", 4], ["hold", "Hold", 3], ["sell", "Sell", 2], ["strongSell", "Strong Sell", 1]];
    var n = keys.reduce(function (s, k) { return s + (+d[k[0]] || 0); }, 0);
    b.body.innerHTML = '<div class="hd"><h3>' + esc(d.title || "Analyst Ratings") + '</h3><span class="sub">' + n + " analyst" + (n === 1 ? "" : "s") + "</span></div>";
    var W = b.width(), H = 22, svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": keys.map(function (k) { return k[1] + " " + (d[k[0]] || 0); }).join(", ") }, b.body);
    var x = 0;
    keys.forEach(function (k) {
      var v = +d[k[0]] || 0; if (!v) return;
      var w = v / n * W, r = el("rect", { x: x, y: 0, width: Math.max(1, w - 2), height: H, rx: 4, fill: "var(--g" + k[2] + ")" }, svg);
      r.addEventListener("pointermove", function (ev) { var p = b.rel(svg, ev); b.tip(k[1] + ": <b>" + v + "</b> (" + (v / n * 100).toFixed(0) + "%)", p.x, p.y); });
      r.addEventListener("pointerleave", function () { b.tip(null); });
      x += w;
    });
    var rows = '<div class="rows">';
    keys.forEach(function (k) {
      var v = +d[k[0]] || 0, p = n ? v / n * 100 : 0;
      rows += '<span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;background:var(--g' + k[2] + ')"></i>' + k[1] + "</span>" +
        '<span style="height:6px;border-radius:3px;background:var(--grid);overflow:hidden"><span style="display:block;height:100%;width:' + p + '%;background:var(--g' + k[2] + ');border-radius:3px"></span></span>' +
        '<span class="c">' + v + '</span><span class="c">' + p.toFixed(0) + "%</span>";
    });
    b.body.insertAdjacentHTML("beforeend", rows + "</div>");
  }

  /* ---------- 4. mini price chart ---------- */
  var RANGES = [["1M", 1], ["6M", 6], ["YTD", "ytd"], ["1Y", 12], ["5Y", 60], ["Max", 0]];
  function priceChart(b) {
    var d = b.data, all = (d.prices || []).map(function (p) { return [pd(p[0]), +p[1]]; }), cur = d.currency;
    if (!all.length) { b.body.innerHTML = '<p class="err">No data</p>'; return; }
    var last = all[all.length - 1][0], avail = RANGES.filter(function (r) {
      if (r[1] === 0 || r[1] === "ytd") return true;
      var c = new Date(last); c.setUTCMonth(c.getUTCMonth() - r[1]); return +all[0][0] <= +c + 864e5 * 20;
    });
    var sel = b.o.range || d.range || "1Y"; if (!avail.some(function (r) { return r[0] === sel; })) sel = avail[avail.length - 1][0];
    function draw() {
      var r = RANGES.filter(function (x) { return x[0] === sel; })[0], from;
      if (r[1] === 0) from = all[0][0];
      else if (r[1] === "ytd") from = new Date(Date.UTC(last.getUTCFullYear(), 0, 1));
      else { from = new Date(last); from.setUTCMonth(from.getUTCMonth() - r[1]); }
      var P = all.filter(function (p) { return +p[0] >= +from; }); if (P.length < 2) P = all.slice(-2);
      var ch = (P[P.length - 1][1] / P[0][1] - 1) * 100, col = ch >= 0 ? "var(--up)" : "var(--dn)";
      b.body.innerHTML = '<div class="hd"><div><h3>' + esc(d.symbol || "") + (d.name ? ' <span class="sub" style="font-weight:400">' + esc(d.name) + "</span>" : "") +
        '</h3><div><b style="font-size:20px">' + money(P[P.length - 1][1], cur) + '</b> <span class="' + cls(ch) + '">' + pct(ch) + " " + sel + "</span></div></div>" +
        '<div class="seg" role="group" aria-label="Range">' + avail.map(function (x) { return '<button type="button" aria-pressed="' + (x[0] === sel) + '">' + x[0] + "</button>"; }).join("") + "</div></div>";
      [].forEach.call(b.body.querySelectorAll(".seg button"), function (bt) { bt.onclick = function () { sel = bt.textContent; draw(); }; });
      var W = b.width(), H = Math.round(Math.min(260, Math.max(170, W * 0.42))), L = 4, Rr = 52, T = 6, B = 22, pw = W - L - Rr, ph = H - T - B;
      var vs = P.map(function (p) { return p[1]; }), tk = ticks(Math.min.apply(null, vs), Math.max.apply(null, vs), 4), y0 = tk[0], y1 = tk[tk.length - 1];
      var t0 = +P[0][0], t1 = +P[P.length - 1][0];
      function X(t) { return L + (t - t0) / Math.max(1, t1 - t0) * pw; } function Y(v) { return T + ph - (v - y0) / (y1 - y0) * ph; }
      var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": (d.symbol || "Price") + " " + sel + " chart, " + pct(ch) }, b.body);
      var gid = "g" + Math.random().toString(36).slice(2, 8), defs = el("defs", {}, svg), lg = el("linearGradient", { id: gid, x1: 0, x2: 0, y1: 0, y2: 1 }, defs);
      el("stop", { offset: 0, "stop-color": col, "stop-opacity": 0.22 }, lg); el("stop", { offset: 1, "stop-color": col, "stop-opacity": 0 }, lg);
      tk.forEach(function (v) { el("line", { x1: L, x2: L + pw, y1: Y(v), y2: Y(v), stroke: "var(--grid)" }, svg); txt(svg, L + pw + 6, Y(v) + 4, money(v, cur)); });
      var pts = P.map(function (p) { return X(+p[0]).toFixed(1) + "," + Y(p[1]).toFixed(1); });
      el("path", { d: "M" + pts.join("L") + "L" + X(t1) + "," + (T + ph) + "L" + X(t0) + "," + (T + ph) + "Z", fill: "url(#" + gid + ")" }, svg);
      el("polyline", { points: pts.join(" "), fill: "none", stroke: col, "stroke-width": 2, "stroke-linejoin": "round" }, svg);
      var nl = W < 420 ? 3 : 4;
      for (var i = 0; i < nl; i++) { var p = P[Math.round(i * (P.length - 1) / (nl - 1))]; txt(svg, X(+p[0]), H - 4, (t1 - t0 > 200 * 864e5 ? MON[p[0].getUTCMonth()] + " '" + String(p[0].getUTCFullYear()).slice(2) : MON[p[0].getUTCMonth()] + " " + p[0].getUTCDate()), { "text-anchor": i === 0 ? "start" : i === nl - 1 ? "end" : "middle" }); }
      var cross = el("line", { y1: T, y2: T + ph, stroke: "var(--mut)", "stroke-dasharray": "2 3", visibility: "hidden" }, svg);
      var dot = el("circle", { r: 4, fill: col, stroke: "var(--bg)", "stroke-width": 2, visibility: "hidden" }, svg);
      var hit = el("rect", { x: L, y: T, width: pw, height: ph, fill: "transparent" }, svg);
      hit.addEventListener("pointermove", function (ev) {
        var q = b.rel(svg, ev), t = t0 + (q.sx - L) / pw * (t1 - t0), lo = 0, hi = P.length - 1;
        while (hi - lo > 1) { var m = (lo + hi) >> 1; if (+P[m][0] < t) lo = m; else hi = m; }
        var bi = Math.abs(+P[lo][0] - t) < Math.abs(+P[hi][0] - t) ? lo : hi, xx = X(+P[bi][0]);
        cross.setAttribute("x1", xx); cross.setAttribute("x2", xx); cross.setAttribute("visibility", "visible");
        dot.setAttribute("cx", xx); dot.setAttribute("cy", Y(P[bi][1])); dot.setAttribute("visibility", "visible");
        b.tip(dayStr(P[bi][0]) + "<br><b>" + money(P[bi][1], cur) + "</b> " + pct((P[bi][1] / P[0][1] - 1) * 100), q.x, q.y);
      });
      hit.addEventListener("pointerleave", function () { cross.setAttribute("visibility", "hidden"); dot.setAttribute("visibility", "hidden"); b.tip(null); });
    }
    draw();
  }

  /* ---------- 5. 52-week range + performance ---------- */
  function rangePerf(b) {
    var d = b.data, cur = d.currency, sym = d.symbol || "Stock", bm = d.benchmark || null;
    var h = '<div class="hd"><h3>' + esc(d.title || "52-Week Range") + "</h3>" + (d.symbol ? '<span class="sub">' + esc(d.symbol) + "</span>" : "") + "</div>";
    b.body.innerHTML = h;
    var W = b.width();
    if (d.low52 != null && d.high52 != null) {
      var pos = (d.price - d.low52) / Math.max(1e-9, d.high52 - d.low52), svg = el("svg", { viewBox: "0 0 " + W + " 54", role: "img", "aria-label": "52-week low " + money(d.low52, cur) + ", high " + money(d.high52, cur) + ", current " + money(d.price, cur) }, b.body);
      el("rect", { x: 0, y: 22, width: W, height: 8, rx: 4, fill: "var(--grid)" }, svg);
      el("rect", { x: 0, y: 22, width: Math.max(8, pos * W), height: 8, rx: 4, fill: "var(--s1)", "fill-opacity": 0.35 }, svg);
      var px = Math.min(W - 7, Math.max(7, pos * W));
      el("circle", { cx: px, cy: 26, r: 7, fill: "var(--s1)", stroke: "var(--bg)", "stroke-width": 2 }, svg);
      txt(svg, Math.min(W - 30, Math.max(30, px)), 12, money(d.price, cur), { "text-anchor": "middle", style: "fill:var(--fg);font-weight:600;font-size:12px" });
      txt(svg, 0, 50, "Low " + money(d.low52, cur)); txt(svg, W, 50, "High " + money(d.high52, cur), { "text-anchor": "end" });
      b.body.insertAdjacentHTML("beforeend", '<div class="stats"><span>From high <b>' + pct((d.price / d.high52 - 1) * 100, 1) + "</b></span><span>From low <b>" + pct((d.price / d.low52 - 1) * 100, 1) + "</b></span></div>");
    }
    var R = d.returns || {}, keys = Object.keys(R);
    if (!keys.length) return;
    b.body.insertAdjacentHTML("beforeend", '<h3 style="margin-top:14px">Performance' + (bm ? " vs " + esc(bm.name) : "") + "</h3>");
    var vals = keys.map(function (k) { return R[k]; }).concat(bm ? keys.map(function (k) { return bm.returns[k]; }) : []).filter(function (v) { return v != null; });
    var mx = Math.max(1, Math.max.apply(null, vals.map(Math.abs)));
    var rowH = 26, Lw = 40, Vw = 62, H = keys.length * rowH, pw = W - Lw - Vw;
    var vmin = Math.min(0, Math.min.apply(null, vals)), vmax = Math.max(0, Math.max.apply(null, vals)), rng = Math.max(1e-9, vmax - vmin);
    var zx = Lw + pw * (-vmin / rng), span = pw; mx = rng;
    var svg2 = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Returns: " + keys.map(function (k) { return k + " " + pct(R[k], 1); }).join(", ") }, b.body);
    el("line", { x1: zx, x2: zx, y1: 0, y2: H, stroke: "var(--bd)" }, svg2);
    keys.forEach(function (k, i) {
      var v = R[k], y = i * rowH, w = Math.abs(v) / mx * span, x = v >= 0 ? zx : zx - w;
      txt(svg2, 0, y + 17, k, { style: "fill:var(--fg2);font-size:12px" });
      el("rect", { x: x, y: y + 6, width: Math.max(2, w), height: 14, rx: 4, fill: v >= 0 ? "var(--up)" : "var(--dn)" }, svg2);
      if (bm && bm.returns[k] != null) { var bx = zx + (bm.returns[k] >= 0 ? 1 : -1) * Math.abs(bm.returns[k]) / mx * span; el("line", { x1: bx, x2: bx, y1: y + 2, y2: y + 24, stroke: "var(--fg)", "stroke-width": 2 }, svg2); }
      txt(svg2, W, y + 17, pct(v, 1), { "text-anchor": "end", style: "fill:var(--fg);font-size:12px;font-weight:600" });
      var hr = el("rect", { x: 0, y: y, width: W, height: rowH, fill: "transparent" }, svg2);
      hr.addEventListener("pointermove", function (ev) { var p = b.rel(svg2, ev); b.tip(esc(k) + "<br>" + esc(sym) + ": <b>" + pct(v) + "</b>" + (bm && bm.returns[k] != null ? "<br>" + esc(bm.name) + ": <b>" + pct(bm.returns[k]) + "</b>" : ""), p.x, p.y); });
      hr.addEventListener("pointerleave", function () { b.tip(null); });
    });
    if (bm) b.body.insertAdjacentHTML("beforeend", '<div class="lg"><span><i style="background:var(--up)"></i><i style="background:var(--dn);margin-left:-3px"></i>' + esc(sym) + '</span><span><i style="width:2px;background:var(--fg);border-radius:0"></i>' + esc(bm.name) + "</span></div>");
  }

  /* ---------- 6. dividend history ---------- */
  function dividends(b) {
    var d = b.data, A = d.annual || [], cur = d.currency;
    var n = A.length, cagr = null;
    var full = A.filter(function (a) { return !a[2]; });
    if (full.length >= 6) cagr = (Math.pow(full[full.length - 1][1] / full[full.length - 6][1], 1 / 5) - 1) * 100;
    b.body.innerHTML = '<div class="hd"><h3>' + esc(d.title || "Dividend History") + "</h3>" + (d.symbol ? '<span class="sub">' + esc(d.symbol) + "</span>" : "") + "</div>" +
      '<div class="stats">' + (d.yield != null ? "<span>Yield <b>" + d.yield.toFixed(2) + "%</b></span>" : "") + (d.growthYears != null ? "<span>Growth streak <b>" + d.growthYears + " yrs</b></span>" : "") + (cagr != null ? "<span>5Y growth <b>" + pct(cagr, 1) + "/yr</b></span>" : "") + "</div>";
    if (!n) return;
    var W = b.width(), H = 170, T = 18, B = 20, ph = H - T - B, mx = Math.max.apply(null, A.map(function (a) { return a[1]; })), slot = W / n, bw = Math.max(4, Math.min(36, slot - 4));
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Dividends per share by year: " + A.map(function (a) { return a[0] + " " + money(a[1], cur); }).join(", ") }, b.body);
    el("line", { x1: 0, x2: W, y1: T + ph, y2: T + ph, stroke: "var(--bd)" }, svg);
    A.forEach(function (a, i) {
      var h = a[1] / mx * ph, x = i * slot + (slot - bw) / 2, y = T + ph - h;
      var pth = "M" + x + "," + (T + ph) + "V" + (y + 4) + "Q" + x + "," + y + " " + (x + 4) + "," + y + "H" + (x + bw - 4) + "Q" + (x + bw) + "," + y + " " + (x + bw) + "," + (y + 4) + "V" + (T + ph) + "Z";
      var bar = el("path", { d: pth, fill: "var(--s1)", "fill-opacity": a[2] ? 0.45 : 1 }, svg);
      if (n <= 12 || i % Math.ceil(n / 8) === 0 || i === n - 1) txt(svg, x + bw / 2, H - 4, a[2] ? "TTM" : String(a[0]).slice(n > 8 ? 2 : 0).replace(/^(\d\d)$/, "'$1"), { "text-anchor": "middle" });
      if (i === n - 1) txt(svg, x + bw / 2, y - 5, money(a[1], cur), { "text-anchor": "middle", style: "fill:var(--fg);font-weight:600" });
      var hr = el("rect", { x: i * slot, y: T, width: slot, height: ph, fill: "transparent" }, svg);
      hr.addEventListener("pointermove", function (ev) { var p = b.rel(svg, ev), prev = A[i - 1]; b.tip((a[2] ? "Trailing 12 months" : esc(a[0])) + "<br><b>" + money(a[1], cur) + "</b> per share" + (prev && !a[2] ? "<br>" + pct((a[1] / prev[1] - 1) * 100, 1) + " vs " + esc(prev[0]) : ""), p.x, p.y); });
      hr.addEventListener("pointerleave", function () { b.tip(null); });
    });
  }

  /* ---------- 7. earnings surprise ---------- */
  function earnings(b) {
    var d = b.data, Q = d.quarters || [], cur = d.currency;
    var beats = Q.filter(function (q) { return q.actual != null && q.actual >= q.estimate; }).length, rep = Q.filter(function (q) { return q.actual != null; }).length;
    b.body.innerHTML = '<div class="hd"><h3>' + esc(d.title || "EPS vs. Estimates") + "</h3>" + '<span class="sub">' + (d.symbol ? esc(d.symbol) + " · " : "") + "Topped " + beats + " of last " + rep + "</span></div>";
    if (!Q.length) return;
    var W = b.width(), H = 190, L = 44, T = 10, B = 38, pw = W - L - 6, ph = H - T - B;
    var vs = []; Q.forEach(function (q) { if (q.estimate != null) vs.push(q.estimate); if (q.actual != null) vs.push(q.actual); });
    var lo0 = Math.min.apply(null, vs), hi0 = Math.max.apply(null, vs), pad = (hi0 - lo0) * 0.12 || 0.1;
    var tk = ticks(lo0 - pad, hi0 + pad, 4), y0 = tk[0], y1 = tk[tk.length - 1];
    function Y(v) { return T + ph - (v - y0) / (y1 - y0) * ph; }
    var slot = pw / Q.length;
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "EPS actual vs estimate, beat " + beats + " of " + rep + " quarters" }, b.body);
    tk.forEach(function (v) { el("line", { x1: L, x2: L + pw, y1: Y(v), y2: Y(v), stroke: "var(--grid)" }, svg); txt(svg, L - 6, Y(v) + 4, (v < 0 ? "\u2212" : "") + "$" + Math.abs(v).toFixed(2), { "text-anchor": "end" }); });
    Q.forEach(function (q, i) {
      var cx = L + slot * (i + 0.5);
      txt(svg, cx, H - 20, q.period, { "text-anchor": "middle" });
      if (q.actual != null) {
        var s = q.estimate ? (q.actual - q.estimate) / Math.abs(q.estimate) * 100 : null, beat = q.actual >= q.estimate;
        txt(svg, cx, H - 5, beat ? "Above" : "Below", { "text-anchor": "middle", style: "font-weight:600;fill:" + (beat ? "var(--up)" : "var(--dn)") });
      } else txt(svg, cx, H - 5, q.date ? "Due " + MON[pd(q.date).getUTCMonth()] + " " + pd(q.date).getUTCDate() : "Upcoming", { "text-anchor": "middle" });
      if (q.estimate != null) el("circle", { cx: cx, cy: Y(q.estimate), r: 7, fill: "var(--bg)", stroke: "var(--mut)", "stroke-width": 2, "stroke-dasharray": q.actual == null ? "3 2" : null }, svg);
      if (q.actual != null) {
        var y = Y(q.actual), up = q.actual >= q.estimate, s2 = 8;
        el("path", { d: up ? "M" + cx + "," + (y - s2) + "L" + (cx + s2) + "," + (y + s2 * 0.7) + "L" + (cx - s2) + "," + (y + s2 * 0.7) + "Z" : "M" + cx + "," + (y + s2) + "L" + (cx + s2) + "," + (y - s2 * 0.7) + "L" + (cx - s2) + "," + (y - s2 * 0.7) + "Z", fill: up ? "var(--up)" : "var(--dn)", stroke: "var(--bg)", "stroke-width": 1.5, "stroke-linejoin": "round" }, svg);
      }
      var hr = el("rect", { x: cx - slot / 2, y: T, width: slot, height: ph, fill: "transparent" }, svg);
      hr.addEventListener("pointermove", function (ev) {
        var p = b.rel(svg, ev), s = q.actual != null && q.estimate ? (q.actual - q.estimate) / Math.abs(q.estimate) * 100 : null;
        b.tip("<b>" + esc(q.period) + "</b>" + (q.date ? " · " + esc(q.date) : "") + "<br>Consensus: " + money(q.estimate, cur) + (q.actual != null ? "<br>Reported: <b>" + money(q.actual, cur) + "</b><br>Difference: " + pct(s, 1) : "<br>Report due"), p.x, p.y);
      });
      hr.addEventListener("pointerleave", function () { b.tip(null); });
    });
    b.body.insertAdjacentHTML("beforeend", '<div class="lg"><span><i style="background:var(--bg);border:2px solid var(--mut);border-radius:50%;box-sizing:border-box"></i>Consensus estimate</span><span><span class="up">▲</span> Reported, above</span><span><span class="dn">▼</span> Reported, below</span></div>');
  }

  /* ---------- 8. target range (ladder: one row per figure, bar diverging from today's price) ---------- */
  function targetRange(b) { return targetLadder(b); }

  function trHead(b, d) {
    var up = d.average != null && d.price ? (d.average / d.price - 1) * 100 : null;
    return '<div class="hd"><h3>' + esc(d.title || "Analyst Price Targets") + "</h3>" + (d.symbol ? '<span class="sub">' + esc(d.symbol) + "</span>" : "") + "</div>" +
      '<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin:-2px 0 6px"><span class="sub">Mean target</span><b style="font-size:22px">' + money(d.average, d.currency) + "</b>" +
      (up != null ? '<span class="' + cls(up) + '" style="font-weight:600;font-size:13px;padding:1px 7px;border-radius:999px;background:' + (up >= 0 ? "var(--ups)" : "var(--dns)") + '">' + (up >= 0 ? "▲ " : "▼ ") + pct(Math.abs(up), 1).replace("+", "") + (up >= 0 ? " upside" : " downside") + "</span>" : "") + "</div>";
  }
  function trFoot(b, d) {
    var foot = [];
    if (d.analysts) foot.push("Based on <b>" + d.analysts + "</b> analysts");
    if (d.asOf) foot.push("Updated " + dayStr(pd(d.asOf)));
    if (foot.length) b.body.insertAdjacentHTML("beforeend", '<div class="stats" style="margin:10px 0 0">' + foot.map(function (f) { return "<span>" + f + "</span>"; }).join("") + "</div>");
  }

  /* B. ladder: one row per figure, bar diverging from today's price */
  function targetLadder(b) {
    var d = b.data, cur = d.currency;
    b.body.innerHTML = trHead(b, d);
    var R = [["Highest", d.high], ["Mean", d.average, 1], ["Median", d.median], ["Today", d.price, 2], ["Lowest", d.low]].filter(function (r) { return r[1] != null; });
    R.sort(function (a, c) { return c[1] - a[1]; });
    var ups = R.map(function (r) { return (r[1] / d.price - 1) * 100; });
    var mn = Math.min(0, Math.min.apply(null, ups)), mx = Math.max(0, Math.max.apply(null, ups)), rg = Math.max(1e-9, mx - mn);
    var W = b.width(), LW = 62, VW = W >= 340 ? 74 : 64, PW = 58, bw = W - LW - VW - PW - 8, rowH = 30, H = R.length * rowH;
    var zx = LW + VW + bw * (-mn / rg);
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": R.map(function (r, i) { return r[0] + " " + money(r[1], cur) + " " + pct(ups[i], 1); }).join(", ") }, b.body);
    R.forEach(function (r, i) {
      var y = i * rowH, u = ups[i], w = Math.abs(u) / rg * bw, x = u >= 0 ? zx : zx - w, today = r[2] === 2, mean = r[2] === 1;
      if (i) el("line", { x1: 0, x2: W, y1: y, y2: y, stroke: "var(--grid)" }, svg);
      txt(svg, 0, y + 19, r[0], { style: "font-size:12px;fill:" + (mean ? "var(--s1)" : "var(--fg2)") + (mean || today ? ";font-weight:700" : "") });
      txt(svg, LW + VW - 8, y + 19, money(r[1], cur), { "text-anchor": "end", style: "font-size:13px;font-weight:" + (mean || today ? 700 : 600) + ";fill:var(--fg)" });
      if (!today) el("rect", { x: x, y: y + 8, width: Math.max(2, w), height: 14, rx: 4, fill: mean ? "var(--s1)" : u >= 0 ? "var(--up)" : "var(--dn)", "fill-opacity": mean ? 1 : 0.85 }, svg);
      txt(svg, W, y + 19, today ? "—" : pct(u, 1), { "text-anchor": "end", style: "font-size:12px;font-weight:600;fill:" + (today ? "var(--mut)" : u >= 0 ? "var(--up)" : "var(--dn)") });
    });
    el("line", { x1: zx, x2: zx, y1: 0, y2: H, stroke: "var(--fg)", "stroke-width": 1.5, "stroke-dasharray": "3 3" }, svg);
    trFoot(b, d);
  }

  /* ---------- 8. target range (low / current / average / high) ---------- */
  /* ---------- 9. recommendations trend (stacked columns by month) ---------- */
  function ratingsTrend(b) {
    var d = b.data, M = d.periods || [];
    var keys = [["strongBuy", "Strong Buy", 5, "#fff"], ["buy", "Buy", 4, "#fff"], ["hold", "Hold", 3, "#141414"], ["sell", "Sell", 2, "#fff"], ["strongSell", "Strong Sell", 1, "#fff"]];
    if (d.labels) keys.forEach(function (k) { if (d.labels[k[0]]) k[1] = esc(d.labels[k[0]]); });
    b.body.innerHTML = '<div class="hd"><h3>' + esc(d.title || "Analyst Recommendations") + "</h3>" + (d.symbol ? '<span class="sub">' + esc(d.symbol) + "</span>" : "") + "</div>";
    if (!M.length) return;
    var W = b.width(), side = W >= 380, LW = side ? 116 : 0, H = 200, T = 22, B = 22, ph = H - T - B, pw = W - LW - 8;
    var tot = M.map(function (m) { return keys.reduce(function (s, k) { return s + (+m[k[0]] || 0); }, 0); }), mx = Math.max.apply(null, tot);
    var slot = pw / M.length, bw = Math.min(46, slot - 10);
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Analyst recommendations by period: " + M.map(function (m, i) { return m.period + " " + tot[i] + " analysts"; }).join(", ") }, b.body);
    M.forEach(function (m, i) {
      var x = i * slot + (slot - bw) / 2, y = T + ph;
      for (var j = keys.length - 1; j >= 0; j--) {
        var k = keys[j], v = +m[k[0]] || 0; if (!v) continue;
        var h = v / mx * ph, top = y - h;
        el("rect", { x: x, y: top + 1, width: bw, height: Math.max(1, h - 2), rx: 4, fill: "var(--g" + k[2] + ")" }, svg);
        if (h >= 17) txt(svg, x + bw / 2, top + h / 2 + 5, String(v), { "text-anchor": "middle", style: "font-size:13px;font-weight:600;fill:var(--gt" + k[2] + ")" });
        y = top;
      }
      txt(svg, x + bw / 2, y - 6, String(tot[i]), { "text-anchor": "middle", style: "fill:var(--fg);font-weight:700;font-size:13px" });
      txt(svg, x + bw / 2, H - 4, m.period, { "text-anchor": "middle", style: "fill:var(--fg2);font-size:12px" });
      var hr = el("rect", { x: i * slot, y: T, width: slot, height: ph, fill: "transparent" }, svg);
      hr.addEventListener("pointermove", function (ev) {
        var p = b.rel(svg, ev);
        b.tip("<b>" + esc(m.period) + "</b> · " + tot[i] + " analysts<br>" + keys.map(function (k) { return k[1] + ": <b>" + (+m[k[0]] || 0) + "</b>"; }).join("<br>"), p.x, p.y);
      });
      hr.addEventListener("pointerleave", function () { b.tip(null); });
    });
    var lg = keys.map(function (k) { return '<span><i style="background:var(--g' + k[2] + ');border-radius:50%"></i>' + k[1] + "</span>"; }).join("");
    if (side) {
      var fo = el("foreignObject", { x: W - LW, y: T, width: LW, height: ph }, svg);
      var div = document.createElement("div"); div.className = "lg"; div.style.cssText = "flex-direction:column;gap:10px;margin:0;font-size:13px";
      div.innerHTML = lg; fo.appendChild(div);
    } else b.body.insertAdjacentHTML("beforeend", '<div class="lg">' + lg + "</div>");
  }

  /* ---------- registry / bootstrap ---------- */
  var TYPES = { "analyst-gauge": gauge, "price-target": priceTarget, "analyst-ratings": ratings, "price-chart": priceChart, "range-performance": rangePerf, "dividend-history": dividends, "earnings-surprise": earnings, "target-range": targetRange, "ratings-trend": ratingsTrend };

  function credit(host) {
    if (host.querySelector('[slot="credit"]') || host.getAttribute("data-credit") === "off") return;
    var p = document.createElement("div"); p.setAttribute("slot", "credit");
    p.style.cssText = "font-size:11px;color:#6b7280;text-align:right;margin-top:8px";
    p.innerHTML = 'Chart by <a href="' + CREDIT_URL + '" style="color:#2563eb;text-decoration:none">Quotelinks</a>';
    host.appendChild(p);
  }

  function render(host, type, data, opts) {
    var fn = TYPES[type];
    if (!fn) throw new Error("ql-charts: unknown type " + type);
    opts = opts || {};
    var b = new Base(host, data, opts);
    if (opts.credit !== false) credit(host);
    var go = function () { try { fn(b); } catch (e) { b.body.innerHTML = '<p class="err">Chart unavailable</p>'; if (window.console) console.error(e); } };
    go();
    host.__qlGo = go; // latest render() wins; the observer below always calls it
    if (window.ResizeObserver && !host.__qlRO) {
      // Width changes only, re-rendered on the next frame (never inside the observer callback,
      // which caused "ResizeObserver loop completed with undelivered notifications").
      // prev/last guard against a page scrollbar flipping the width back and forth.
      var last = host.clientWidth, prev = -1, at = 0, raf = 0;
      host.__qlRO = new ResizeObserver(function (entries) {
        var w = Math.round(entries[0].contentRect.width), now = Date.now();
        if (Math.abs(w - last) <= 8) return;
        if (Math.abs(w - prev) <= 1 && now - at < 400) return; // bounced straight back: scrollbar flip
        prev = last; last = w; at = now;
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () { raf = 0; host.__qlGo(); });
      });
      host.__qlRO.observe(host);
    }
    return b;
  }

  function boot(host) {
    if (host.__ql) return; host.__ql = 1;
    var type = host.getAttribute("data-type"), src = host.getAttribute("data-src");
    var opts = { theme: host.getAttribute("data-theme") || "light", frame: host.getAttribute("data-frame"), range: host.getAttribute("data-range"), credit: host.getAttribute("data-credit") !== "off" };
    var inline = host.querySelector('script[type="application/json"]');
    function fail() { var b = new Base(host, {}, opts); b.body.innerHTML = '<p class="err">Chart data unavailable</p>'; }
    if (inline) { try { render(host, type, JSON.parse(inline.textContent), opts); } catch (e) { fail(); } return; }
    if (!src) return fail();
    fetch(src, { credentials: "omit" }).then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (j) { render(host, type, j, opts); }).catch(fail);
  }

  function scan() { [].forEach.call(document.querySelectorAll(".ql-chart[data-type]"), boot); }
  window.QLCharts = { render: render, scan: scan, types: Object.keys(TYPES), version: "1.0.1" };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scan); else scan();
})();

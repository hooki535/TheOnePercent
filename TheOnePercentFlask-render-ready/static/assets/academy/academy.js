/* ======================================================= academy/academy.js
   The1% Academy screen, inside Learn.

   Routes (fragment, same pattern as the rest of Learn):
     #masterclasses                 catalog of every masterclass
     #mc/<course>                   course page with "Enroll for the course"
     #mc/<course>/<lesson>          lesson reader (enrolled learners)
     #mc/<course>/quiz              final quiz, 80% to pass
     #mc/<course>/certificate       certificate of completion

   learn.js owns the tab bar and hands any of these routes to
   AcademyUI.route(). Content is in assets/academy/catalog.js and
   assets/academy/courses/*.js; progress is in Store.academy.
   ====================================================================== */

window.AcademyUI = (() => {
  "use strict";

  const A = window.Academy;
  const F = window.Figures;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const IMG = (school) => "../assets/academy/img/" + ((A.school(school) || {}).img || "foundations") + ".webp";
  const COVER = (c) => (c.img ? "../assets/academy/img/" + c.img + ".webp" : IMG(c.school));

  /* A unique cover for every course without its own art: a candlestick
     motif seeded from the course id, tinted with the school accent and
     laid over the school image. Deterministic, so it never changes. */
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    return h >>> 0;
  }
  function motif(c) {
    const sc = A.school(c.school) || {};
    const acc = sc.accent || "#5b78ff";
    let s = hash(c.id);
    const rnd = () => ((s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0) / 4294967296);
    const n = 26;
    const drift = (rnd() - 0.35) * 2.2;
    let p = 50 + (rnd() - 0.5) * 20;
    const bars = [];
    for (let i = 0; i < n; i++) {
      const o = p;
      p += drift + (rnd() - 0.5) * 9 + Math.sin(i / (2 + rnd() * 3)) * 2.5;
      bars.push({ o, c: p, h: Math.max(o, p) + rnd() * 4, l: Math.min(o, p) - rnd() * 4 });
    }
    const lo = Math.min(...bars.map((b) => b.l));
    const hi = Math.max(...bars.map((b) => b.h));
    const Y = (v) => 18 + ((hi - v) / (hi - lo || 1)) * 124;
    const X = (i) => 14 + i * (292 / n);
    const zoneAt = bars[Math.floor(n * (0.25 + rnd() * 0.4))];
    const zy = Y(Math.max(zoneAt.o, zoneAt.c));
    let g = '<rect x="0" y="' + (zy - 6) + '" width="320" height="14" fill="' + acc + '" fill-opacity=".16"/>';
    bars.forEach((b, i) => {
      const up = b.c >= b.o;
      const col = up ? acc : "#e4e8f2";
      const op = up ? 1 : 0.5;
      g += '<line x1="' + (X(i) + 4) + '" x2="' + (X(i) + 4) + '" y1="' + Y(b.h) + '" y2="' + Y(b.l) + '" stroke="' + col + '" stroke-opacity="' + op + '"/>';
      g += '<rect x="' + (X(i) + 1) + '" y="' + Y(Math.max(b.o, b.c)) + '" width="6" height="' + Math.max(1.5, Math.abs(Y(b.o) - Y(b.c))) + '" fill="' + col + '" fill-opacity="' + op + '" rx="1"/>';
    });
    return '<svg class="ac-motif" viewBox="0 0 320 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + g + "</svg>";
  }
  function coverHTML(c) {
    return c.img
      ? '<img src="' + COVER(c) + '" alt="" loading="lazy">'
      : '<img class="dim" src="' + IMG(c.school) + '" alt="" loading="lazy">' + motif(c);
  }
  const filters = { q: "", school: "all", level: "all", mine: false };

  function root() {
    return $("#view-academy");
  }

  function st() {
    return window.Store.academy.get();
  }

  function toast(msg) {
    const t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (t.hidden = true), 2600);
  }

  function progress(c, s) {
    const total = A.isLive(c) ? c.content.lessons.length : 0;
    const done = total ? c.content.lessons.filter((l) => (s.done[c.id] || {})[l.id]).length : 0;
    const q = s.quiz[c.id] || {};
    const pct = total ? Math.round(((done + (q.passed ? 1 : 0)) / (total + 1)) * 100) : 0;
    return { total, done, pct, passed: !!q.passed, best: q.best || 0 };
  }

  function nextLesson(c, s) {
    if (!A.isLive(c)) return null;
    const d = s.done[c.id] || {};
    return c.content.lessons.find((l) => !d[l.id]) || null;
  }

  const levelChip = (lvl) => '<span class="level ' + esc(String(lvl).toLowerCase()) + '">' + esc(lvl) + "</span>";

  /* ------------------------------------------------------------- catalog */

  function card(c, s, big) {
    const enrolled = !!s.enrolled[c.id];
    const live = A.isLive(c);
    const p = progress(c, s);
    const n = A.lessonCount(c);
    const cta = enrolled
      ? '<a class="btn btn-quiet ac-cta" href="#mc/' + c.id + '">' + (p.passed ? "View certificate" : live ? "Continue" + (p.pct ? " · " + p.pct + "%" : "") : "Enrolled · view syllabus") + "</a>"
      : '<button class="btn btn-primary ac-cta" data-enroll="' + c.id + '">Enroll for the course</button>';
    return (
      '<article class="ac-card' + (big ? " big" : "") + '">' +
      '<a class="ac-cover" href="#mc/' + c.id + '" tabindex="-1" aria-hidden="true">' +
      coverHTML(c) +
      '<span class="ac-status ' + (live ? "live" : "soon") + '">' + (live ? "Full course" : "In production") + "</span>" +
      "</a>" +
      '<div class="ac-body">' +
      '<div class="ac-row">' + levelChip(c.level) + '<span class="ac-school">' + esc((A.school(c.school) || {}).title) + "</span></div>" +
      '<h3><a href="#mc/' + c.id + '">' + esc(c.title) + "</a></h3>" +
      "<p>" + esc(c.tagline) + "</p>" +
      '<div class="ac-meta"><span>' + n + " lessons</span><span>" + c.hours + " h</span>" + (live ? "<span>Quiz + certificate</span>" : "") + "</div>" +
      (enrolled && live ? '<div class="bar ac-bar"><span style="width:' + p.pct + '%"></span></div>' : "") +
      cta +
      "</div></article>"
    );
  }

  function matches(c) {
    if (filters.school !== "all" && c.school !== filters.school) return false;
    if (filters.level !== "all" && c.level !== filters.level) return false;
    if (filters.mine && !st().enrolled[c.id]) return false;
    if (filters.q) {
      const hay = (c.title + " " + c.tagline + " " + c.syllabus.map((m) => m.title + " " + m.lessons.join(" ")).join(" ")).toLowerCase();
      if (hay.indexOf(filters.q.toLowerCase()) < 0) return false;
    }
    return true;
  }

  function renderCatalog() {
    const s = st();
    const live = A.courses.filter(A.isLive).length;
    const mine = A.courses.filter((c) => s.enrolled[c.id]);
    const certs = A.courses.filter((c) => (s.quiz[c.id] || {}).passed).length;

    root().innerHTML =
      '<section class="ac-hero">' +
      '<img class="ac-hero-img" src="../assets/academy/img/academy-hero.webp" alt="">' +
      '<div class="ac-hero-in">' +
      '<span class="ac-kicker">' + esc(A.BRAND) + " Academy</span>" +
      "<h1>Every course a trader needs, in one place.</h1>" +
      "<p>" + A.courses.length + " masterclasses across " + A.schools.length + " schools, from your first trade to prop firm challenges. Enroll in a course, work through chart-based lessons, pass the final quiz and earn your " + esc(A.BRAND) + " certificate.</p>" +
      '<div class="ac-stats">' +
      "<div><b>" + A.courses.length + "</b><small>masterclasses</small></div>" +
      "<div><b>" + live + "</b><small>full courses live</small></div>" +
      "<div><b>" + mine.length + "</b><small>you are enrolled in</small></div>" +
      "<div><b>" + certs + "</b><small>certificates earned</small></div>" +
      "</div></div></section>" +
      (mine.length
        ? '<section class="ac-sec"><div class="ac-sec-head"><h2>My courses</h2><span>Pick up where you left off</span></div><div class="ac-grid">' +
          mine.map((c) => card(c, s)).join("") +
          "</div></section>"
        : "") +
      '<section class="ac-sec"><div class="ac-sec-head"><h2>Start here</h2><span>The core masterclasses every ' + esc(A.BRAND) + " trader takes first</span></div>" +
      '<div class="ac-grid feat">' + A.featured.map((id) => card(A.course(id), s, true)).join("") + "</div></section>" +
      '<section class="ac-sec"><div class="ac-sec-head"><h2>Then go deeper</h2><span>Full masterclasses on how price is delivered</span></div>' +
      '<div class="ac-grid feat">' + A.deeper.map((id) => card(A.course(id), s, true)).join("") + "</div></section>" +
      '<section class="ac-sec" id="ac-all"><div class="ac-sec-head"><h2>All masterclasses</h2><span id="ac-count"></span></div>' +
      '<div class="ac-filters">' +
      '<label class="fld ac-find"><span>Search courses</span><input id="ac-q" type="search" placeholder="liquidity, order blocks, gold…" value="' + esc(filters.q) + '"></label>' +
      '<label class="fld"><span>Level</span><select id="ac-level">' +
      ["all", "Beginner", "Intermediate", "Advanced"].map((l) => '<option value="' + l + '"' + (filters.level === l ? " selected" : "") + ">" + (l === "all" ? "All levels" : l) + "</option>").join("") +
      "</select></label>" +
      '<label class="ac-mine"><input type="checkbox" id="ac-mine"' + (filters.mine ? " checked" : "") + "> My courses only</label>" +
      "</div>" +
      '<div class="ac-chips" role="tablist" aria-label="Schools">' +
      [{ id: "all", title: "All schools" }].concat(A.schools).map((sc) => '<button role="tab" data-school="' + sc.id + '" aria-selected="' + (filters.school === sc.id) + '">' + esc(sc.title) + "</button>").join("") +
      "</div>" +
      '<div id="ac-list"></div></section>';

    renderList();

    $("#ac-q").addEventListener("input", (e) => {
      filters.q = e.target.value;
      renderList();
    });
    $("#ac-level").addEventListener("change", (e) => {
      filters.level = e.target.value;
      renderList();
    });
    $("#ac-mine").addEventListener("change", (e) => {
      filters.mine = e.target.checked;
      renderList();
    });
    $$(".ac-chips button").forEach((b) =>
      b.addEventListener("click", () => {
        filters.school = b.dataset.school;
        $$(".ac-chips button").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
        renderList();
      })
    );
  }

  function renderList() {
    const s = st();
    const list = A.courses.filter(matches);
    $("#ac-count").textContent = list.length + " of " + A.courses.length + " courses";
    if (!list.length) {
      $("#ac-list").innerHTML = '<div class="notice"><b>No course matches that search.</b> <small>Try a broader word, or clear the filters.</small></div>';
      return;
    }
    const groups = A.schools.filter((sc) => list.some((c) => c.school === sc.id));
    $("#ac-list").innerHTML = groups
      .map(
        (sc) =>
          '<div class="ac-school-block"><div class="ac-school-head"><img src="' + IMG(sc.id) + '" alt=""><div><h3>' + esc(sc.title) + "</h3><p>" + esc(sc.blurb) + "</p></div></div>" +
          '<div class="ac-grid">' + list.filter((c) => c.school === sc.id).map((c) => card(c, s)).join("") + "</div></div>"
      )
      .join("");
  }

  /* -------------------------------------------------------------- course */

  function renderCourse(c) {
    const s = st();
    const enrolled = !!s.enrolled[c.id];
    const live = A.isLive(c);
    const p = progress(c, s);
    const nx = nextLesson(c, s);
    const sc = A.school(c.school);
    const n = A.lessonCount(c);
    const outcomes = live ? c.content.outcomes : c.syllabus.map((m) => m.title + ": " + m.lessons.slice(0, 3).join(", ").toLowerCase());
    const doneMap = s.done[c.id] || {};
    const related = A.courses.filter((x) => x.school === c.school && x.id !== c.id).slice(0, 4);

    let cta;
    if (!enrolled) {
      cta =
        '<div class="ac-enroll"><button class="btn btn-primary btn-lg" data-enroll="' + c.id + '">Enroll for the course</button>' +
        "<small>Free while " + esc(A.BRAND) + " is in beta. Your progress is saved to your account on this device.</small></div>";
    } else if (!live) {
      cta =
        '<div class="ac-enroll"><span class="ac-enrolled">You are enrolled</span>' +
        "<small>Lessons for this masterclass are in production. It stays in My courses and the lessons appear here as they are released.</small></div>";
    } else if (p.passed) {
      cta =
        '<div class="ac-enroll"><a class="btn btn-primary btn-lg" href="#mc/' + c.id + '/certificate">View your certificate</a>' +
        '<small>Completed with a best quiz score of ' + p.best + "%.</small></div>";
    } else {
      cta =
        '<div class="ac-enroll"><a class="btn btn-primary btn-lg" href="#mc/' + c.id + "/" + (nx ? nx.id : "quiz") + '">' +
        (nx ? (p.done ? "Continue: " : "Start: ") + esc(nx.title) : "Take the final quiz") + "</a>" +
        '<div class="ac-prog"><div class="bar"><span style="width:' + p.pct + '%"></span></div><small>' + p.done + " of " + p.total + " lessons · " + p.pct + "% complete</small></div></div>";
    }

    let li = 0;
    const syllabus = c.syllabus
      .map((m, mi) => {
        const rows = m.lessons
          .map((t) => {
            const lesson = live ? c.content.lessons[li] : null;
            li++;
            const done = lesson && doneMap[lesson.id];
            const open = enrolled && live;
            const inner =
              '<span class="ac-ln">' + (done ? "✓" : String(li).padStart(2, "0")) + "</span>" +
              '<span class="ac-lt">' + esc(t) + (lesson ? "<small>" + esc(lesson.summary) + "</small>" : "") + "</span>" +
              '<span class="ac-lm">' + (lesson ? lesson.minutes + " min" : live ? "" : "soon") + (open ? "" : ' <span aria-label="locked" class="ac-lock">🔒</span>') + "</span>";
            return open
              ? '<li class="' + (done ? "done" : "") + '"><a href="#mc/' + c.id + "/" + lesson.id + '">' + inner + "</a></li>"
              : '<li class="locked"><div>' + inner + "</div></li>";
          })
          .join("");
        return '<div class="ac-mod"><div class="ac-mod-head"><b>Module ' + (mi + 1) + "</b><span>" + esc(m.title) + "</span></div><ol>" + rows + "</ol></div>";
      })
      .join("");

    const quizRow = live
      ? '<div class="ac-mod"><div class="ac-mod-head"><b>Final</b><span>Quiz and certificate</span></div><ol><li class="' + (enrolled ? "" : "locked") + '">' +
        (enrolled ? '<a href="#mc/' + c.id + '/quiz">' : "<div>") +
        '<span class="ac-ln">' + (p.passed ? "✓" : "Q") + '</span><span class="ac-lt">Final quiz: ' + c.content.quiz.length + " questions<small>Pass at " + Math.round(A.PASS_MARK * 100) + "% to earn your " + esc(A.BRAND) + ' certificate.</small></span><span class="ac-lm">' + (p.best ? "best " + p.best + "%" : "") + "</span>" +
        (enrolled ? "</a>" : "</div>") + "</li></ol></div>"
      : "";

    root().innerHTML =
      '<div class="crumb"><a href="#masterclasses">Masterclasses</a><span>/</span><a href="#masterclasses" data-school-link="' + c.school + '">' + esc(sc.title) + "</a></div>" +
      '<section class="ac-course-hero">' +
      '<div class="ac-course-cover">' + coverHTML(c) + "</div>" +
      '<div class="ac-course-in">' +
      '<div class="ac-row">' + levelChip(c.level) + '<span class="ac-status ' + (live ? "live" : "soon") + '">' + (live ? "Full course" : "In production") + "</span></div>" +
      "<h1>" + esc(c.title) + "</h1>" +
      '<p class="lead">' + esc(c.tagline) + "</p>" +
      '<div class="ac-meta"><span>' + n + " lessons</span><span>about " + c.hours + " hours</span>" + (live ? "<span>" + c.content.lessons.filter((l) => l.sections.some((x) => x.fig)).length + " lessons with charts</span><span>Certificate</span>" : "") + "</div>" +
      cta +
      "</div></section>" +
      '<div class="ac-course-grid"><div>' +
      '<section class="panel"><div class="panel-head"><h2>What you will learn</h2></div><div class="panel-body"><ul class="ac-outcomes">' +
      outcomes.map((o) => "<li>" + esc(o) + "</li>").join("") +
      "</ul></div></section>" +
      (!live ? '<div class="notice ac-soon"><b>Lessons in production.</b> <small>The syllabus below is final. Enroll now to keep your place. While you wait, these full masterclasses are ready: ' + A.courses.filter(A.isLive).map((x) => '<a href="#mc/' + x.id + '">' + esc(x.title.replace(/ Masterclass$/, "")) + "</a>").join(", ") + ".</small></div>" : "") +
      '<section class="ac-syllabus"><h2>Syllabus</h2>' + syllabus + quizRow + "</section>" +
      pdfPanel(c, enrolled) +
      "</div>" +
      '<aside class="ac-side">' +
      '<div class="side-card"><h3>This course includes</h3><ul class="ac-inc">' +
      "<li>" + n + " lessons" + (live ? " with annotated chart diagrams" : "") + "</li>" +
      (live ? "<li>Key takeaways and common mistakes in every lesson</li><li>A psychology check and a practice task per lesson</li><li>Links into the " + esc(A.BRAND) + " journal, charts and calculators</li><li>" + c.content.quiz.length + "-question final quiz</li><li>" + esc(A.BRAND) + " certificate of completion</li>" : "<li>Final quiz and certificate on release</li>") +
      "</ul></div>" +
      (enrolled ? '<div class="side-card"><h3>Enrolment</h3><p class="hint">Enrolled ' + new Date(s.enrolled[c.id]).toLocaleDateString() + '.</p><button class="btn btn-quiet sm" id="ac-leave">Leave this course</button></div>' : "") +
      readingCard(c) +
      (related.length ? '<div class="side-card"><h3>More in ' + esc(sc.title) + '</h3><ul class="ac-rel">' + related.map((r) => '<li><a href="#mc/' + r.id + '">' + esc(r.title) + "</a><small>" + esc(r.level) + " · " + A.lessonCount(r) + " lessons</small></li>").join("") + "</ul></div>" : "") +
      "</aside></div>";

    const leave = $("#ac-leave");
    if (leave)
      leave.addEventListener("click", () => {
        window.Store.academy.leave(c.id);
        toast("You left " + c.title + ". Your lesson progress is kept if you re-enroll.");
        renderCourse(c);
      });
    const sl = $("[data-school-link]");
    if (sl) sl.addEventListener("click", () => (filters.school = sl.dataset.schoolLink));
  }

  /* ---------------------------------------------------------------- pdfs */

  const PDF_ICON =
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>';

  function pdfPanel(c, enrolled) {
    const list = A.pdfs(c.id);
    if (!list.length) return "";
    return (
      '<section class="ac-pdfs"><h2>Course PDFs</h2><p class="hint">Original ' + esc(A.BRAND) + " study material for this masterclass. Read it online here or download it to study offline.</p>" +
      list
        .map(
          (d) =>
            '<div class="ac-pdf-row"><span class="ac-pdf-ic">' + PDF_ICON + "</span>" +
            '<div class="ac-pdf-tx"><b>' + esc(d.title) + '</b><small>' + esc(d.kind) + (d.pages ? " · " + d.pages + " pages" : "") + "</small><p>" + esc(d.desc) + "</p></div>" +
            '<div class="ac-pdf-act">' +
            (enrolled
              ? '<a class="btn btn-primary sm" href="#mc/' + c.id + "/read/" + d.id + '">Read online</a><a class="btn btn-quiet sm" href="' + d.file + '" download>Download</a>'
              : '<button class="btn btn-primary sm" data-enroll="' + c.id + '" data-then="stay">Enroll to read</button>') +
            "</div></div>"
        )
        .join("") +
      "</section>"
    );
  }

  function readingCard(c) {
    const r = A.reading(c.id);
    if (!r.length) return "";
    return (
      '<div class="side-card"><h3>Further reading</h3><ul class="ac-rel">' +
      r.map((b) => "<li><b>" + esc(b.title) + "</b><small>" + esc(b.author) + " · " + esc(b.why) + "</small></li>").join("") +
      '</ul><p class="hint">Published books, recommended to buy or borrow.</p></div>'
    );
  }

  /* PDF.js renders pages to canvas so the reader looks the same on every
     device (iOS Safari shows only the first page of an iframed PDF). If the
     library cannot load, the browser's own viewer is used instead. */
  const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
  let pdfjsReady = null;
  let readerScroll = null;
  function loadPdfjs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (pdfjsReady) return pdfjsReady;
    pdfjsReady = new Promise((res, rej) => {
      const sc = document.createElement("script");
      sc.src = PDFJS + "pdf.min.js";
      sc.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.js";
        res(window.pdfjsLib);
      };
      sc.onerror = () => {
        pdfjsReady = null;
        rej(new Error("pdf.js failed to load"));
      };
      document.head.appendChild(sc);
    });
    return pdfjsReady;
  }

  function renderReader(c, pid) {
    const d = A.pdfs(c.id).find((x) => x.id === pid);
    if (!d) return renderCourse(c);
    if (!st().enrolled[c.id]) return gate(c, "Enroll to read the " + d.kind.toLowerCase());
    const others = A.pdfs(c.id).filter((x) => x.id !== pid);
    root().innerHTML =
      '<div class="crumb"><a href="#masterclasses">Masterclasses</a><span>/</span><a href="#mc/' + c.id + '">' + esc(c.title) + "</a><span>/</span><span>" + esc(d.kind) + "</span></div>" +
      '<div class="ac-reader-head"><div><h1>' + esc(d.title) + '</h1><p class="lead">' + esc(d.desc) + "</p></div>" +
      '<div class="ac-reader-act"><a class="btn btn-quiet sm" href="' + d.file + '" download>Download PDF</a><a class="btn btn-quiet sm" href="' + d.file + '" target="_blank" rel="noopener">Open in new tab</a></div></div>' +
      '<div class="ac-reader-bar"><span id="ac-pg">Loading…</span><span class="ac-zoom"><button class="btn btn-quiet sm" data-z="-1" aria-label="Zoom out">−</button><button class="btn btn-quiet sm" data-z="0">Fit</button><button class="btn btn-quiet sm" data-z="1" aria-label="Zoom in">+</button></span></div>' +
      '<div class="ac-reader" id="ac-reader" tabindex="0" aria-label="' + esc(d.title) + '"><div class="ac-reader-sk"></div><div class="ac-reader-sk"></div></div>' +
      (others.length ? '<div class="ac-reader-more">Also in this course: ' + others.map((o) => '<a href="#mc/' + c.id + "/read/" + o.id + '">' + esc(o.title) + "</a>").join(" · ") + "</div>" : "") +
      '<div class="ac-reader-foot"><a class="btn btn-primary" href="#mc/' + c.id + '">Back to the course</a></div>';

    const box = $("#ac-reader");
    const pg = $("#ac-pg");
    let doc = null;
    let zoom = 1;

    const draw = async () => {
      const token = (box.dataset.t = String(Math.random()));
      box.innerHTML = "";
      const width = Math.min(box.clientWidth - 24, 980) * zoom;
      for (let i = 1; i <= doc.numPages; i++) {
        if (box.dataset.t !== token) return;
        const page = await doc.getPage(i);
        const v1 = page.getViewport({ scale: 1 });
        const scale = width / v1.width;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const vp = page.getViewport({ scale: scale * dpr });
        const cv = document.createElement("canvas");
        cv.width = vp.width;
        cv.height = vp.height;
        cv.style.width = Math.round(vp.width / dpr) + "px";
        cv.className = "ac-page";
        cv.setAttribute("aria-label", "Page " + i);
        box.appendChild(cv);
        await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
      }
    };
    const onScroll = () => {
      if (!doc) return;
      const pages = box.querySelectorAll(".ac-page");
      let cur = 1;
      pages.forEach((p, i) => {
        if (p.getBoundingClientRect().top < window.innerHeight * 0.4) cur = i + 1;
      });
      pg.textContent = "Page " + cur + " of " + doc.numPages;
    };

    loadPdfjs()
      .then((lib) => lib.getDocument(d.file).promise)
      .then((pdf) => {
        doc = pdf;
        pg.textContent = "Page 1 of " + pdf.numPages;
        return draw();
      })
      .catch(() => {
        pg.textContent = "Reading in your browser's PDF viewer";
        box.innerHTML = '<iframe class="ac-pdf-frame" src="' + d.file + '#view=FitH" title="' + esc(d.title) + '"></iframe>';
      });

    if (readerScroll) window.removeEventListener("scroll", readerScroll);
    readerScroll = onScroll;
    window.addEventListener("scroll", onScroll, { passive: true });
    document.querySelectorAll("[data-z]").forEach((b) =>
      b.addEventListener("click", () => {
        const z = +b.dataset.z;
        zoom = z === 0 ? 1 : Math.max(0.6, Math.min(2, zoom + z * 0.2));
        if (doc) draw();
      })
    );
  }

  /* -------------------------------------------------------------- lesson */

  function gate(c, why) {
    root().innerHTML =
      '<div class="crumb"><a href="#masterclasses">Masterclasses</a><span>/</span><a href="#mc/' + c.id + '">' + esc(c.title) + "</a></div>" +
      '<div class="ac-gate"><div class="ac-course-cover">' + coverHTML(c) + "</div><div><h2>" + esc(why) + "</h2><p>" + esc(c.tagline) + "</p>" +
      '<button class="btn btn-primary btn-lg" data-enroll="' + c.id + '" data-then="stay">Enroll for the course</button> <a class="btn btn-quiet btn-lg" href="#mc/' + c.id + '">See the syllabus</a></div></div>';
  }

  function renderLesson(c, lid) {
    const s = st();
    if (!s.enrolled[c.id]) return gate(c, "Enroll to open this lesson");
    const lessons = c.content.lessons;
    const i = lessons.findIndex((l) => l.id === lid);
    if (i < 0) return (location.hash = "#mc/" + c.id);
    const l = lessons[i];
    window.Store.academy.seen(c.id, l.id);
    const done = !!(s.done[c.id] || {})[l.id];
    const next = lessons[i + 1];
    const prev = lessons[i - 1];

    const sections = l.sections
      .map(
        (x) =>
          '<div class="sec">' +
          (x.h ? "<h2>" + esc(x.h) + "</h2>" : "") +
          (x.p || []).map((p) => "<p>" + esc(p) + "</p>").join("") +
          (x.fig && !x.figAfter ? F.render(x.fig) : "") +
          ((x.ul || []).length ? "<ul>" + x.ul.map((t) => "<li>" + esc(t) + "</li>").join("") + "</ul>" : "") +
          (x.note ? '<p class="note">' + esc(x.note) + "</p>" : "") +
          "</div>"
      )
      .join("");

    const list = lessons
      .map((x, k) => {
        const d = (s.done[c.id] || {})[x.id];
        return '<li class="' + (x.id === l.id ? "cur " : "") + (d ? "done" : "") + '"><a href="#mc/' + c.id + "/" + x.id + '"><span>' + (d ? "✓" : k + 1) + "</span>" + esc(x.title) + "</a></li>";
      })
      .join("");
    const p = progress(c, s);

    root().innerHTML =
      '<div class="reader">' +
      '<div class="lesson-main">' +
      '<div class="crumb"><a href="#masterclasses">Masterclasses</a><span>/</span><a href="#mc/' + c.id + '">' + esc(c.title) + "</a><span>/</span><span>Lesson " + (i + 1) + " of " + lessons.length + "</span></div>" +
      '<div class="ac-lesson-kicker">' + esc(l.module) + "</div>" +
      "<h1>" + esc(l.title) + "</h1>" +
      '<p class="lead">' + esc(l.summary) + "</p>" +
      '<div class="quiz-meta"><span>' + l.minutes + " min read</span><span>" + esc(c.level) + "</span><span>" + esc(A.BRAND) + " Academy</span></div>" +
      sections +
      '<div class="ac-boxes">' +
      '<div class="ac-box good"><h3>Key takeaways</h3><ul>' + l.takeaways.map((t) => "<li>" + esc(t) + "</li>").join("") + "</ul></div>" +
      '<div class="ac-box bad"><h3>Common mistakes</h3><ul>' + l.mistakes.map((t) => "<li>" + esc(t) + "</li>").join("") + "</ul></div>" +
      "</div>" +
      '<div class="ac-psych"><b>Psychology check</b><p>' + esc(l.psych) + "</p></div>" +
      '<div class="ac-practice"><b>Practice task</b><p>' + esc(l.practice) + "</p></div>" +
      (l.apply ? '<div class="apply"><div><b>' + esc(l.apply.label) + "</b><small>" + esc(l.apply.why) + '</small></div><a class="btn btn-primary" href="' + esc(l.apply.href) + '">Open it</a></div>' : "") +
      '<div class="lesson-foot">' +
      '<button class="btn ' + (done ? "btn-quiet" : "btn-primary") + '" id="ac-mark">' + (done ? "Completed · undo" : "Mark lesson complete") + "</button>" +
      (next ? '<a class="btn btn-quiet" href="#mc/' + c.id + "/" + next.id + '">Next: ' + esc(next.title) + "</a>" : '<a class="btn btn-quiet" href="#mc/' + c.id + '/quiz">On to the final quiz</a>') +
      '<span class="sp"></span>' +
      (prev ? '<a class="btn btn-quiet" href="#mc/' + c.id + "/" + prev.id + '">Previous</a>' : "") +
      "</div></div>" +
      '<aside class="lesson-side">' +
      '<div class="side-card"><h3>' + esc(c.title) + '</h3><div class="bar"><span style="width:' + p.pct + '%"></span></div><p class="hint">' + p.done + " of " + p.total + ' lessons complete</p><ol class="ac-toc">' + list + '</ol><a class="btn btn-quiet sm ac-toc-quiz" href="#mc/' + c.id + '/quiz">Final quiz</a>' +
      A.pdfs(c.id).map((d) => '<a class="ac-toc-pdf" href="#mc/' + c.id + "/read/" + d.id + '">' + PDF_ICON + "<span>" + esc(d.title) + "</span></a>").join("") +
      "</div>" +
      "</aside></div>";

    $("#ac-mark").addEventListener("click", () => {
      if (done) {
        window.Store.academy.unmark(c.id, l.id);
        toast("Marked as not complete.");
        renderLesson(c, l.id);
      } else {
        window.Store.academy.markDone(c.id, l.id);
        toast(next ? "Lesson complete. Next: " + next.title : "All lessons complete. The final quiz is open.");
        location.hash = next ? "#mc/" + c.id + "/" + next.id : "#mc/" + c.id + "/quiz";
      }
    });
  }

  /* ---------------------------------------------------------------- quiz */

  function renderQuiz(c) {
    const s = st();
    if (!s.enrolled[c.id]) return gate(c, "Enroll to take the final quiz");
    const p = progress(c, s);
    const crumb = '<div class="crumb"><a href="#masterclasses">Masterclasses</a><span>/</span><a href="#mc/' + c.id + '">' + esc(c.title) + "</a><span>/</span><span>Final quiz</span></div>";
    if (p.done < p.total) {
      const nx = nextLesson(c, s);
      root().innerHTML =
        crumb + '<div class="notice"><b>Finish the lessons first.</b> <small>You have completed ' + p.done + " of " + p.total + ' lessons. The final quiz opens when all of them are marked complete.</small> <a class="btn btn-primary" href="#mc/' + c.id + "/" + nx.id + '">Continue: ' + esc(nx.title) + "</a></div>";
      return;
    }
    const qs = c.content.quiz;
    root().innerHTML =
      crumb +
      '<div class="quiz ac-quiz"><h1>' + esc(c.title) + ": final quiz</h1>" +
      '<p class="lead">' + qs.length + " questions. Pass at " + Math.round(A.PASS_MARK * 100) + "% to earn your " + esc(A.BRAND) + " certificate. Wrong answers link back to the lesson that covers them." + (p.best ? " Your best so far: " + p.best + "%." : "") + "</p>" +
      '<form id="ac-qf">' +
      qs
        .map(
          (q, i) =>
            '<fieldset class="ac-q" data-i="' + i + '"><legend><span>' + (i + 1) + "</span>" + esc(q.q) + "</legend>" +
            q.options.map((o, k) => '<label><input type="radio" name="q' + i + '" value="' + k + '"> <span>' + esc(o) + "</span></label>").join("") +
            '<div class="ac-why" hidden></div></fieldset>'
        )
        .join("") +
      '<div class="lesson-foot"><button class="btn btn-primary btn-lg" type="submit">Submit answers</button><span class="hint" id="ac-left"></span></div></form></div>';

    const form = $("#ac-qf");
    const left = () => {
      const n = qs.filter((_, i) => form.querySelector('input[name="q' + i + '"]:checked')).length;
      $("#ac-left").textContent = n + " of " + qs.length + " answered";
    };
    left();
    form.addEventListener("change", left);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const unanswered = qs.filter((_, i) => !form.querySelector('input[name="q' + i + '"]:checked')).length;
      if (unanswered) {
        toast("Answer all " + qs.length + " questions first (" + unanswered + " left).");
        return;
      }
      let right = 0;
      qs.forEach((q, i) => {
        const pick = +form.querySelector('input[name="q' + i + '"]:checked').value;
        const fs = form.querySelector('.ac-q[data-i="' + i + '"]');
        const ok = pick === q.a;
        if (ok) right++;
        fs.classList.add(ok ? "ok" : "bad");
        $$("input", fs).forEach((inp) => (inp.disabled = true));
        const lesson = c.content.lessons.find((l) => l.id === q.lesson);
        const why = $(".ac-why", fs);
        why.hidden = false;
        why.innerHTML =
          "<b>" + (ok ? "Correct." : "Not quite. The answer is: " + esc(q.options[q.a]) + ".") + "</b> " + esc(q.why) +
          (!ok && lesson ? ' <a href="#mc/' + c.id + "/" + lesson.id + '">Review: ' + esc(lesson.title) + "</a>" : "");
      });
      const pct = Math.round((right / qs.length) * 100);
      const passed = pct >= A.PASS_MARK * 100;
      window.Store.academy.recordQuiz(c.id, pct, passed);
      const foot = $(".lesson-foot", form);
      foot.innerHTML =
        '<div class="ac-result ' + (passed ? "ok" : "bad") + '"><b>' + pct + "%</b><span>" + right + " of " + qs.length + " correct. " +
        (passed ? "You passed. Your certificate is ready." : "You need " + Math.round(A.PASS_MARK * 100) + "% to pass. Review the lessons linked above and try again.") + "</span></div>" +
        (passed ? '<a class="btn btn-primary btn-lg" href="#mc/' + c.id + '/certificate">View your certificate</a>' : '<button class="btn btn-primary btn-lg" type="button" id="ac-retry">Try again</button>');
      const retry = $("#ac-retry");
      if (retry) retry.addEventListener("click", () => renderQuiz(c));
      foot.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  /* --------------------------------------------------------- certificate */

  function learnerName() {
    try {
      const p = window.Shell && Shell.profile ? Shell.profile() : null;
      if (p) {
        const n = [p.firstName || p.name, p.lastName].filter(Boolean).join(" ").trim();
        if (n) return n;
      }
    } catch (e) {
      /* ignore */
    }
    return "";
  }

  function renderCertificate(c) {
    const s = st();
    const q = s.quiz[c.id] || {};
    if (!q.passed) return (location.hash = "#mc/" + c.id + "/quiz");
    const name = learnerName() || "The1% Trader";
    const date = new Date(q.passedAt || q.lastAt || Date.now());
    const certId = "T1P-" + c.id.slice(0, 3).toUpperCase() + "-" + date.getTime().toString(36).toUpperCase().slice(-6);
    root().innerHTML =
      '<div class="crumb no-print"><a href="#masterclasses">Masterclasses</a><span>/</span><a href="#mc/' + c.id + '">' + esc(c.title) + "</a><span>/</span><span>Certificate</span></div>" +
      '<div class="ac-cert" id="ac-cert">' +
      '<div class="ac-cert-in">' +
      '<div class="ac-cert-logo"><span>1%</span>' + esc(A.BRAND) + " Academy</div>" +
      "<small>Certificate of completion</small>" +
      "<p>This certifies that</p>" +
      "<h2>" + esc(name) + "</h2>" +
      "<p>has completed the</p>" +
      "<h3>" + esc(c.title) + "</h3>" +
      "<p>passing the final assessment with a score of <b>" + q.best + "%</b>.</p>" +
      '<div class="ac-cert-foot"><div><b>' + date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) + "</b><small>Date</small></div>" +
      "<div><b>" + certId + "</b><small>Certificate ID</small></div>" +
      "<div><b>" + esc(c.level) + "</b><small>Level</small></div></div>" +
      "</div></div>" +
      '<div class="lesson-foot no-print"><button class="btn btn-primary" id="ac-print">Print or save as PDF</button><a class="btn btn-quiet" href="#masterclasses">Find your next masterclass</a></div>';
    $("#ac-print").addEventListener("click", () => window.print());
  }

  /* ---------------------------------------------------------------- route */

  function route(h) {
    const parts = h.split("/");
    if (parts[0] !== "mc" || !parts[1]) return renderCatalog();
    const c = A.course(parts[1]);
    if (!c) return renderCatalog();
    if (!parts[2]) return renderCourse(c);
    if (!A.isLive(c)) return renderCourse(c);
    if (parts[2] === "quiz") return renderQuiz(c);
    if (parts[2] === "certificate") return renderCertificate(c);
    if (parts[2] === "read") return renderReader(c, parts[3]);
    return renderLesson(c, parts[2]);
  }

  /* enroll buttons anywhere in the academy view */
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-enroll]");
    if (!b) return;
    const c = A.course(b.dataset.enroll);
    if (!c) return;
    window.Store.academy.enroll(c.id);
    toast("You are enrolled in " + c.title + ".");
    const h = location.hash.replace(/^#/, "");
    if (h === "mc/" + c.id || b.dataset.then === "stay") route(h);
    else if (h === "masterclasses" || !h) {
      location.hash = "#mc/" + c.id;
    } else route(h);
  });

  return { route };
})();

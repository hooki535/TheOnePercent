/* ============================================================== learn.js
   The Learn screen.

   The roadmap asks for an ordered path, a quiz gate at eighty percent
   between blocks, ten questions with two attempts then a cooldown, wrong
   answers that link back to the exact lesson, locked lessons greyed rather
   than hidden, and a resource library on a second sub-tab. All of that is
   here. Four things were added on purpose:

     1  Recommended lessons driven by Store.leaks(). A course that ignores
        the journal sitting next to it is just a blog. If your sizing is
        the leak, the path says so and sends you to the sizing lesson.
     2  A review deck. Questions you got wrong come back on a Leitner
        schedule, because passing a gate once is not the same as knowing it.
     3  Worked examples filtered to the markets chosen in onboarding, so a
        crypto trader is not reading about swap on a standard lot.
     4  Real downloads. Every library file is generated in the browser from
        the same content the lessons use — no dead links, no fake PDFs.

   Content lives in assets/lessons.js. Progress lives in Store.learn, so
   this screen never touches browser storage itself and a backend driver
   later needs no change here.
   ====================================================================== */

(() => {
  "use strict";

  const C = window.Curriculum;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const PASS = C.PASS_MARK;
  const ATTEMPTS = C.ATTEMPTS;
  const COOLDOWN = C.COOLDOWN_MIN * 60000;

  /* markets: onboarding says "Stocks & indices"; the examples are keyed
     Indices. One place to reconcile the two vocabularies. */
  const MARKET_ALIAS = {
    "stocks & indices": "Indices",
    "stocks and indices": "Indices",
    stocks: "Indices",
    indices: "Indices",
    forex: "Forex",
    fx: "Forex",
    crypto: "Crypto",
    futures: "Futures",
    commodities: "Futures",
  };

  /* which lesson answers which leak — the bridge between the dashboard's
     findings and the curriculum */
  const LEAK_LESSON = {
    oversized: "r1",
    stopOverrun: "r2",
    noStop: "r2",
    overTrading: "r6",
    revenge: "s6",
    offPlan: "s2",
    noPlan: "s1",
    session: "m3",
    emotion: "s6",
    setup: "s1",
    weekday: "s4",
    symbol: "s4",
  };

  let toastTimer = null;

  function toast(msg) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.hidden = true;
    }, 3200);
  }

  /* ------------------------------------------------------------- profile */

  function myMarkets() {
    const p = (window.Shell && window.Shell.profile && window.Shell.profile()) || null;
    const picked = [];
    (p && p.markets ? p.markets : []).forEach((m) => {
      const key = MARKET_ALIAS[String(m).toLowerCase().trim()];
      if (key && picked.indexOf(key) < 0) picked.push(key);
    });
    return picked;
  }

  function experienced() {
    const p = (window.Shell && window.Shell.profile && window.Shell.profile()) || null;
    return !!p && /experien/i.test(String(p.experience || ""));
  }

  /* --------------------------------------------------------------- state
     Gating, recomputed from stored progress on every render rather than
     cached, so two tabs and the storechange event can never disagree. */

  function state() {
    const saved = window.Store.learn.get();
    const blocks = C.blocks.map((b, bi) => {
      const lessons = C.lessonsIn(b.id);
      const quiz = saved.quizzes[b.id] || { passed: false, best: 0, attempts: 0, missed: [] };
      const prev = bi ? C.blocks[bi - 1] : null;
      const prevQuiz = prev ? saved.quizzes[prev.id] || {} : null;

      /* a block opens when the block before it was passed. An experienced
         profile may sit the beginner gates immediately — the gate is the
         proof, so let it be earned early rather than assumed. */
      const open = bi === 0 || !!(prevQuiz && prevQuiz.passed);

      const rows = lessons.map((l, li) => {
        const read = !!saved.read[l.id];
        const prevRead = li === 0 ? true : !!saved.read[lessons[li - 1].id];
        return { lesson: l, read, unlocked: open && prevRead, index: li + 1 };
      });

      const readCount = rows.filter((r) => r.read).length;
      const allRead = readCount === rows.length;

      const attempts = quiz.attempts || 0;
      const since = quiz.lastAt ? Date.now() - new Date(quiz.lastAt).getTime() : Infinity;
      const cooling = !quiz.passed && attempts > 0 && attempts % ATTEMPTS === 0 && since < COOLDOWN;
      const coolUntil = cooling ? new Date(new Date(quiz.lastAt).getTime() + COOLDOWN) : null;

      return {
        block: b,
        rows,
        open,
        readCount,
        allRead,
        quiz,
        /* the gate needs the lessons done, or an experienced trader
           testing out of a beginner block they have not opened */
        quizOpen: (open && allRead) || (experienced() && b.level === "Beginner"),
        cooling,
        coolUntil,
        pct: rows.length ? Math.round((readCount / rows.length) * 100) : 0,
      };
    });

    const read = Object.keys(saved.read).filter((id) => C.lesson(id)).length;
    const gates = blocks.filter((b) => b.quiz.passed).length;
    return {
      saved,
      blocks,
      read,
      gates,
      /* the headline number: lessons are three quarters of it, gates the
         rest, so finishing every lesson without passing a gate cannot read
         as one hundred percent */
      pct: Math.round(((read / C.lessons.length) * 0.75 + (gates / C.blocks.length) * 0.25) * 100),
    };
  }

  function lessonState(id, st) {
    for (const b of st.blocks) {
      const row = b.rows.find((r) => r.lesson.id === id);
      if (row) return { row, block: b };
    }
    return null;
  }

  /* -------------------------------------------------------------- header */

  function renderHeader(st) {
    $("#prog-pct").textContent = st.pct + "%";
    $("#prog-fill").style.width = st.pct + "%";
    $("#prog-read").textContent = st.read + " of " + C.lessons.length + " lessons";
    $("#prog-gates").textContent = st.gates + " of " + C.blocks.length + " gates passed";

    const mins = C.lessons.reduce((a, l) => a + (st.saved.read[l.id] ? 0 : l.minutes), 0);
    $("#prog-note").textContent = st.read
      ? "about " + mins + " min of reading left"
      : "about " + C.totalMinutes + " min in total";

    /* resume where you left off, or the first thing still unlocked */
    const next =
      (st.saved.last && !st.saved.read[st.saved.last] && st.saved.last) ||
      (() => {
        for (const b of st.blocks) {
          const row = b.rows.find((r) => r.unlocked && !r.read);
          if (row) return row.lesson.id;
        }
        return "";
      })();

    const btn = $("#resume");
    if (next) {
      const l = C.lesson(next);
      btn.href = "#lesson/" + next;
      btn.textContent = st.read ? "Continue: " + l.title : "Start: " + l.title;
      btn.hidden = false;
    } else {
      /* never point the resume button at a gate that is cooling off */
      const gate = st.blocks.find((b) => b.quizOpen && !b.quiz.passed && !b.cooling);
      if (gate) {
        btn.href = "#quiz/" + gate.block.id;
        btn.textContent = "Take the " + gate.block.title + " quiz";
        btn.hidden = false;
      } else if (st.blocks.some((b) => b.cooling)) {
        /* nothing readable and the gate is shut: send them to the review deck
           rather than leaving a dead button */
        btn.href = "#path";
        btn.textContent = "Review the questions you missed";
        btn.hidden = false;
      } else {
        btn.hidden = true;
      }
    }
  }

  /* ---------------------------------------------------------------- path */

  function renderPath(st) {
    /* the skip-ahead notice, for a profile that said "Experienced" */
    const skip = $("#skip-notice");
    const firstGate = st.blocks[0];
    if (experienced() && !firstGate.quiz.passed) {
      skip.hidden = false;
      skip.innerHTML =
        "<b>You said you have traded before.</b> <small>The beginner gates are open now — pass Foundations and Risk first at " +
        Math.round(PASS * 100) +
        "% and the intermediate block opens without reading a word. Miss it and the lessons are right there.</small> " +
        '<a class="btn" href="#quiz/foundations">Test out of Foundations</a>';
    } else {
      skip.hidden = true;
    }

    renderRecommendations(st);
    renderReview(st);

    $("#blocks").innerHTML = st.blocks.map((b) => blockHTML(b, st)).join("");

    const left = C.lessons.length - st.read;
    $("#path-foot").textContent =
      left === 0
        ? "Every lesson read. The review deck above keeps the gates honest — and the monthly review in the library is the one habit that outlives this course."
        : left + " lessons still ahead. One a day beats six on a Sunday: the gate tests whether you can use it, not whether you read it.";
  }

  function blockHTML(b, st) {
    const lvl = b.block.level.toLowerCase();
    const lessons = b.rows
      .map((r) => {
        const cls = ["row", r.read ? "done" : "", r.unlocked ? "" : "locked"].filter(Boolean).join(" ");
        const mark = r.read ? "✓" : r.index;
        const meta = r.unlocked
          ? r.lesson.minutes + " min"
          : b.open
          ? "finish the one above"
          : "locked";
        const tag = r.unlocked
          ? '<a class="' + cls + '" href="#lesson/' + r.lesson.id + '">'
          : '<span class="' + cls + '" aria-disabled="true" title="Opens when the lesson above is done">';
        const close = r.unlocked ? "</a>" : "</span>";
        return (
          "<li>" +
          tag +
          '<span class="n" aria-hidden="true">' +
          mark +
          "</span>" +
          "<span><span class=\"t\">" +
          esc(r.lesson.title) +
          '</span><span class="s">' +
          esc(r.lesson.summary) +
          "</span></span>" +
          '<span class="r">' +
          esc(meta) +
          "</span>" +
          close +
          "</li>"
        );
      })
      .join("");

    return (
      '<section class="block' +
      (b.open ? "" : " is-locked") +
      '" id="block-' +
      b.block.id +
      '">' +
      '<div class="block-head"><div>' +
      '<span class="level ' +
      lvl +
      '">' +
      esc(b.block.level) +
      "</span>" +
      "<h2>" +
      esc(b.block.title) +
      "</h2><p>" +
      esc(b.block.blurb) +
      "</p></div>" +
      '<div class="block-meta">' +
      '<div class="bar"><span style="width:' +
      b.pct +
      '%"></span></div>' +
      "<small>" +
      b.readCount +
      "/" +
      b.rows.length +
      " read" +
      (b.quiz.passed ? " · gate " + Math.round(b.quiz.best * 100) + "%" : "") +
      "</small></div></div>" +
      '<p class="outcome"><b>By the end:</b> ' +
      esc(b.block.outcome) +
      "</p>" +
      '<ul class="lessons">' +
      lessons +
      "</ul>" +
      gateHTML(b) +
      "</section>"
    );
  }

  function gateHTML(b) {
    const q = b.quiz;
    const n = (C.quizzes[b.block.id] || []).length;
    const bar = Math.round(PASS * 100) + "%";

    if (q.passed) {
      return (
        '<div class="gate passed"><div><b>Gate passed — ' +
        Math.round(q.best * 100) +
        "%</b><small>" +
        n +
        " questions, best of " +
        q.attempts +
        (q.attempts === 1 ? " attempt" : " attempts") +
        ". Sit it again any time; a practice run cannot take the gate back.</small></div>" +
        '<a class="btn" href="#quiz/' +
        b.block.id +
        '">Practise again</a></div>'
      );
    }

    if (b.cooling) {
      const mins = Math.max(1, Math.ceil((b.coolUntil - Date.now()) / 60000));
      return (
        '<div class="gate cooling"><div><b>Cooling off — ' +
        mins +
        " min left</b><small>Two attempts used" +
        (q.best ? ", best " + Math.round(q.best * 100) + "%" : "") +
        ". The wait is the point: re-read the lessons behind the questions you missed rather than guessing a third time.</small></div>" +
        '<span class="btn" aria-disabled="true">Locked until ' +
        b.coolUntil.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
        "</span></div>"
      );
    }

    if (!b.quizOpen) {
      return (
        '<div class="gate"><div><b>Quiz gate — ' +
        n +
        " questions, pass at " +
        bar +
        "</b><small>Opens when every lesson in this block is read. " +
        (b.open ? b.rows.length - b.readCount : b.rows.length) +
        " to go.</small></div>" +
        '<span class="btn" aria-disabled="true">Locked</span></div>'
      );
    }

    const tries = ATTEMPTS - (q.attempts % ATTEMPTS);
    return (
      '<div class="gate"><div><b>Quiz gate — ' +
      n +
      " questions, pass at " +
      bar +
      "</b><small>" +
      tries +
      (tries === 1 ? " attempt" : " attempts") +
      " before a " +
      C.COOLDOWN_MIN +
      "-minute cooldown" +
      (q.best ? ". Best so far " + Math.round(q.best * 100) + "%" : "") +
      ". Passing opens the next block.</small></div>" +
      '<a class="btn btn-primary" href="#quiz/' +
      b.block.id +
      '">' +
      (q.attempts ? "Try again" : "Start the quiz") +
      "</a></div>"
    );
  }

  /* --------------------------------------------------- recommendations
     Read straight off the leak detector the dashboard already uses. This
     is the whole reason the course lives inside the app. */

  function renderRecommendations(st) {
    const panel = $("#panel-next");
    let out = [];

    try {
      const trades = window.Store.trades.list();
      const leaks = window.Store.leaks(trades, window.Store.settings.get());
      (leaks.findings || []).slice(0, 3).forEach((f) => {
        const id = LEAK_LESSON[f.kind];
        const l = id && C.lesson(id);
        if (!l || out.some((o) => o.lesson.id === id)) return;
        out.push({
          lesson: l,
          why: f.title,
          costR: f.costR,
          money: f.costMoney,
          basis: f.basis,
        });
      });
    } catch (e) {
      out = [];
    }

    if (!out.length) {
      panel.hidden = true;
      return;
    }

    panel.hidden = false;
    $("#next-note").textContent = "from your journal, worst first";
    $("#next-body").innerHTML = out
      .map((o) => {
        const ls = lessonState(o.lesson.id, st);
        const open = ls && ls.row.unlocked;
        const cost =
          o.costR < -0.01
            ? '<span class="cost">' + o.costR.toFixed(2) + "R" + (o.money ? " · " + o.money.toFixed(2) : "") + "</span> "
            : "";
        return (
          '<div class="rec"><b>' +
          esc(o.why) +
          "</b><p>" +
          cost +
          "The lesson for this is <b>" +
          esc(o.lesson.title) +
          "</b> — " +
          esc(o.lesson.summary) +
          "</p>" +
          (open
            ? '<a class="btn btn-primary" href="#lesson/' + o.lesson.id + '">Read it now</a>'
            : '<small class="hint">In ' +
              esc(C.block(o.lesson.block).title) +
              ", which opens as you work through the path.</small>") +
          "</div>"
        );
      })
      .join("");
  }

  /* -------------------------------------------------------- review deck */

  function renderReview(st) {
    const panel = $("#panel-review");
    const due = window.Store.learn.due(5).map((id) => C.question(id)).filter(Boolean);

    if (!due.length) {
      panel.hidden = true;
      return;
    }

    panel.hidden = false;
    $("#review-note").textContent = due.length + " due today";
    $("#review-body").innerHTML =
      '<p class="hint">Questions you have missed, resurfaced on a widening schedule. Answer one and it comes back later; miss it and it comes back tomorrow.</p>' +
      due
        .map(
          (q) =>
            '<div class="qcard" data-review="' +
            q.id +
            '"><b>' +
            esc(q.q) +
            '</b><div class="opts">' +
            q.a
              .map(
                (a, i) =>
                  '<label class="opt"><input type="radio" name="rv-' +
                  q.id +
                  '" value="' +
                  i +
                  '"><span>' +
                  esc(a) +
                  "</span></label>"
              )
              .join("") +
            "</div></div>"
        )
        .join("");

    $$("#review-body input[type=radio]").forEach((input) => {
      input.addEventListener("change", () => {
        const card = input.closest(".qcard");
        const q = C.question(card.dataset.review);
        const correct = Number(input.value) === q.correct;
        $$(".opt", card).forEach((o, i) => {
          o.classList.toggle("right", i === q.correct);
          o.classList.toggle("wrong", i === Number(input.value) && !correct);
        });
        $$("input", card).forEach((r) => (r.disabled = true));
        const why = document.createElement("p");
        why.className = "why";
        why.innerHTML =
          esc(q.why) + ' <a href="#lesson/' + q.lesson + '">Re-read: ' + esc(C.lesson(q.lesson).title) + "</a>";
        card.appendChild(why);
        window.Store.learn.schedule(q.id, correct);
        toast(correct ? "Correct — that one moves further out." : "Back tomorrow. Re-read the lesson linked below it.");
      });
    });
  }

  /* -------------------------------------------------------------- reader */

  function termHTML(text, terms) {
    /* wrap known glossary terms in prose, longest first so "risk of ruin"
       wins over "risk" */
    let out = esc(text);
    (terms || [])
      .slice()
      .sort((a, b) => b.length - a.length)
      .forEach((t) => {
        if (!C.glossary[t]) return;
        const re = new RegExp("(^|[^\\w>])(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")(?![\\w<])", "i");
        out = out.replace(re, (m, pre, word) => pre + '<span class="term" tabindex="0" data-term="' + esc(t) + '">' + word + "</span>");
      });
    return out;
  }

  function renderLesson(id) {
    const st = state();
    const ls = lessonState(id, st);
    if (!ls) return go("#path");

    const l = ls.row.lesson;

    /* a locked lesson is visible on the path but not readable — say why
       rather than silently bouncing back */
    if (!ls.row.unlocked) {
      $("#reader").innerHTML =
        '<div class="lesson-main"><div class="notice"><b>Not open yet.</b> <small>' +
        esc(l.title) +
        " sits in " +
        esc(ls.block.block.title) +
        (ls.block.open
          ? ", after the lessons above it. Finish those and this opens."
          : ", which opens when you pass the gate before it at " + Math.round(PASS * 100) + "%.") +
        '</small> <a class="btn btn-primary" href="#path">Back to the path</a></div></div>';
      return;
    }

    window.Store.learn.seen(l.id);

    const markets = myMarkets();
    const keys = Object.keys(l.examples || {});
    const shown = markets.filter((m) => keys.indexOf(m) >= 0);
    const exKeys = shown.length ? shown : keys;

    const sections = (l.sections || [])
      .map(
        (s) =>
          '<div class="sec"><h2>' +
          esc(s.h) +
          "</h2>" +
          (s.p || []).map((p) => "<p>" + termHTML(p, l.terms) + "</p>").join("") +
          ((s.ul || []).length ? "<ul>" + s.ul.map((li) => "<li>" + termHTML(li, l.terms) + "</li>").join("") + "</ul>" : "") +
          (s.note ? '<p class="note">' + termHTML(s.note, l.terms) + "</p>" : "") +
          "</div>"
      )
      .join("");

    const siblings = ls.block.rows;
    const at = siblings.findIndex((r) => r.lesson.id === l.id);
    const nextRow = siblings[at + 1];
    const nextHref = nextRow
      ? "#lesson/" + nextRow.lesson.id
      : "#quiz/" + ls.block.block.id;
    const nextLabel = nextRow ? "Next: " + nextRow.lesson.title : "On to the " + ls.block.block.title + " quiz";

    const note = st.saved.notes[l.id] || "";
    const done = ls.row.read;

    $("#reader").innerHTML =
      '<div class="lesson-main">' +
      '<div class="crumb"><a href="#path">Path</a><span>/</span><a href="#path">' +
      esc(ls.block.block.title) +
      "</a><span>/</span><span>Lesson " +
      ls.row.index +
      " of " +
      siblings.length +
      "</span></div>" +
      "<h1>" +
      esc(l.title) +
      "</h1>" +
      '<p class="lead">' +
      esc(l.summary) +
      "</p>" +
      '<div class="quiz-meta"><span>' +
      l.minutes +
      " min read</span><span>" +
      esc(C.block(l.block).level) +
      "</span><span>" +
      (l.terms || []).length +
      " terms</span></div>" +
      /* the video slot: labelled honestly instead of an empty player */
      '<div class="vid"><div class="play" aria-hidden="true">▶</div><b>Short video — recording in progress</b>' +
      "<small>Phase 1 ships the written lesson and the worked examples. The slot is reserved so the lesson does not move when the video lands.</small></div>" +
      sections +
      (exKeys.length
        ? '<div class="ex" id="ex"><div class="ex-head" role="tablist" aria-label="Worked example by market">' +
          exKeys
            .map(
              (k, i) =>
                '<button role="tab" data-ex="' +
                esc(k) +
                '" aria-selected="' +
                (i === 0) +
                '">' +
                esc(k) +
                "</button>"
            )
            .join("") +
          '</div><div class="ex-body" id="ex-body"></div></div>'
        : "") +
      (l.apply
        ? '<div class="apply"><div><b>' +
          esc(l.apply.label) +
          "</b><small>" +
          esc(l.apply.why) +
          '</small></div><a class="btn btn-primary" href="' +
          esc(l.apply.href) +
          '">Open it</a></div>'
        : "") +
      '<div class="lesson-foot">' +
      '<button class="btn ' +
      (done ? "" : "btn-primary") +
      '" id="mark">' +
      (done ? "Marked as done — undo" : "Mark as done") +
      "</button>" +
      '<a class="btn" href="' +
      esc(nextHref) +
      '">' +
      esc(nextLabel) +
      "</a>" +
      '<span class="sp"></span><a class="btn" href="#path">Back to the path</a></div>' +
      "</div>" +
      '<aside class="lesson-side">' +
      '<div class="side-card"><h3>Your note</h3><textarea id="note" placeholder="What does this change about how you trade tomorrow?">' +
      esc(note) +
      '</textarea><p class="hint" id="note-hint">Saved as you type, and kept with your progress.</p></div>' +
      ((l.terms || []).length
        ? '<div class="side-card"><h3>Terms in this lesson</h3><ul>' +
          l.terms
            .filter((t) => C.glossary[t])
            .map((t) => "<li><b>" + esc(t) + "</b><span>" + esc(C.glossary[t]) + "</span></li>")
            .join("") +
          "</ul></div>"
        : "") +
      '<div class="side-card"><h3>Files for this lesson</h3>' +
      (C.resources.filter((r) => r.lesson === l.id).length
        ? "<ul>" +
          C.resources
            .filter((r) => r.lesson === l.id)
            .map(
              (r) =>
                '<li><b>' +
                esc(r.file) +
                '</b><span>' +
                esc(r.blurb) +
                '</span><button class="btn" data-dl="' +
                esc(r.id) +
                '">Download</button></li>'
            )
            .join("") +
          "</ul>"
        : '<p class="hint">Nothing to download here — the whole set lives in the <a href="#library">resource library</a>.</p>') +
      "</div></aside>";

    /* worked examples */
    if (exKeys.length) {
      const paint = (key) => {
        const ex = l.examples[key];
        $("#ex-body").innerHTML =
          "<b>" +
          esc(ex.title) +
          "</b><ol>" +
          ex.steps.map((s) => "<li>" + esc(s) + "</li>").join("") +
          "</ol>" +
          (shown.length ? "" : '<p class="hint">Shown for every market because onboarding has no market selected yet.</p>');
      };
      paint(exKeys[0]);
      $$("#ex-head, .ex-head button").forEach(() => {});
      $$(".ex-head button").forEach((btn) => {
        btn.addEventListener("click", () => {
          $$(".ex-head button").forEach((b) => b.setAttribute("aria-selected", String(b === btn)));
          paint(btn.dataset.ex);
        });
      });
    }

    $("#mark").addEventListener("click", () => {
      if (ls.row.read) {
        window.Store.learn.unread(l.id);
        toast("Unmarked. The path will ask for it again.");
      } else {
        window.Store.learn.markRead(l.id);
        toast(nextRow ? "Done. Next lesson unlocked." : "Block complete — the quiz gate is open.");
      }
      renderLesson(l.id);
    });

    let noteTimer = null;
    $("#note").addEventListener("input", (e) => {
      clearTimeout(noteTimer);
      const v = e.target.value;
      noteTimer = setTimeout(() => {
        window.Store.learn.note(l.id, v);
        $("#note-hint").textContent = "Saved.";
      }, 500);
    });

    $$("[data-dl]").forEach((b) => b.addEventListener("click", () => download(b.dataset.dl)));
    renderHeader(state());
  }

  /* ---------------------------------------------------------------- quiz */

  let answers = {};

  function renderQuiz(blockId) {
    const st = state();
    const b = st.blocks.find((x) => x.block.id === blockId);
    if (!b) return go("#path");

    const qs = C.quizzes[blockId] || [];

    if (!b.quizOpen || b.cooling) {
      $("#quiz").innerHTML =
        '<div class="notice"><b>' +
        (b.cooling ? "Cooling off." : "Not open yet.") +
        "</b> <small>" +
        (b.cooling
          ? "Two attempts used. The gate reopens at " +
            b.coolUntil.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
            ". Use the time on the lessons behind the questions you missed."
          : "Read every lesson in " + esc(b.block.title) + " and the gate opens.") +
        '</small> <a class="btn btn-primary" href="#path">Back to the path</a></div>';
      return;
    }

    answers = {};
    const tries = ATTEMPTS - (b.quiz.attempts % ATTEMPTS);

    $("#quiz").innerHTML =
      '<div class="crumb"><a href="#path">Path</a><span>/</span><span>' +
      esc(b.block.title) +
      " gate</span></div>" +
      "<h1>" +
      esc(b.block.title) +
      " — quiz gate</h1>" +
      '<div class="quiz-meta"><span>' +
      qs.length +
      " questions</span><span>pass at " +
      Math.round(PASS * 100) +
      "%</span><span>" +
      tries +
      (tries === 1 ? " attempt left" : " attempts left") +
      "</span>" +
      (b.quiz.best ? "<span>best " + Math.round(b.quiz.best * 100) + "%</span>" : "") +
      "</div>" +
      '<div class="notice"><b>No time limit, and nothing is graded on speed.</b> <small>Two attempts, then ' +
      C.COOLDOWN_MIN +
      " minutes away from it. Every wrong answer links back to the exact lesson it came from" +
      (b.quiz.passed ? ". This block is already passed, so this run is practice only" : "") +
      ".</small></div>" +
      '<form id="quiz-form">' +
      qs
        .map(
          (q, i) =>
            '<div class="q" id="q-' +
            q.id +
            '"><span class="qn">Question ' +
            (i + 1) +
            " of " +
            qs.length +
            "</span><b>" +
            esc(q.q) +
            '</b><div class="opts">' +
            q.a
              .map(
                (a, ai) =>
                  '<label class="opt"><input type="radio" name="' +
                  q.id +
                  '" value="' +
                  ai +
                  '"><span>' +
                  esc(a) +
                  "</span></label>"
              )
              .join("") +
            "</div></div>"
        )
        .join("") +
      '<div class="lesson-foot"><button class="btn btn-primary" type="submit">Submit ' +
      qs.length +
      ' answers</button><span class="sp"></span><a class="btn" href="#path">Save and leave</a></div></form>';

    $("#quiz-form").addEventListener("submit", (e) => {
      e.preventDefault();
      grade(b, qs);
    });
  }

  function grade(b, qs) {
    const form = $("#quiz-form");
    const picked = {};
    qs.forEach((q) => {
      const hit = form.querySelector('input[name="' + q.id + '"]:checked');
      if (hit) picked[q.id] = Number(hit.value);
    });

    const unanswered = qs.filter((q) => picked[q.id] === undefined);
    if (unanswered.length) {
      toast(unanswered.length + " question" + (unanswered.length === 1 ? "" : "s") + " still unanswered — a blank counts as wrong, so answer it.");
      const first = $("#q-" + unanswered[0].id);
      if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const missed = [];
    qs.forEach((q) => {
      const card = $("#q-" + q.id);
      const right = picked[q.id] === q.correct;
      if (!right) missed.push(q.id);

      $$(".opt", card).forEach((o, i) => {
        o.classList.toggle("right", i === q.correct);
        o.classList.toggle("wrong", i === picked[q.id] && !right);
      });
      $$("input", card).forEach((r) => (r.disabled = true));

      const why = document.createElement("p");
      why.className = "why";
      why.innerHTML =
        (right ? "Correct. " : "Not quite. ") +
        esc(q.why) +
        ' <a href="#lesson/' +
        q.lesson +
        '">' +
        (right ? "Lesson: " : "Re-read: ") +
        esc(C.lesson(q.lesson).title) +
        "</a>";
      card.appendChild(why);

      /* every question enters the review deck; the ones you missed come
         back tomorrow, the ones you knew come back much later */
      window.Store.learn.schedule(q.id, right);
    });

    const pct = (qs.length - missed.length) / qs.length;
    const passed = pct >= PASS - 1e-9;
    window.Store.learn.recordQuiz(b.block.id, { pct, passed, missed });

    const after = state();
    const nb = after.blocks.find((x) => x.block.id === b.block.id);
    const next = C.blocks[C.blocks.findIndex((x) => x.id === b.block.id) + 1];

    const box = document.createElement("div");
    box.className = "score " + (passed ? "pass" : "fail");
    box.innerHTML =
      "<b>" +
      Math.round(pct * 100) +
      "% — " +
      (qs.length - missed.length) +
      " of " +
      qs.length +
      "</b><p>" +
      (passed
        ? next
          ? "Passed. <b>" + esc(next.title) + "</b> is open, and the questions you missed are in the review deck on the path."
          : "Passed the final gate. Every lesson and every quiz is done — what is left is the monthly review, and that one never finishes."
        : nb.cooling
        ? "Below " +
          Math.round(PASS * 100) +
          "%. Two attempts used, so the gate closes for " +
          C.COOLDOWN_MIN +
          " minutes. Every miss above links to the lesson that answers it — that is the reading list for the wait."
        : "Below " +
          Math.round(PASS * 100) +
          "%. One attempt left before a " +
          C.COOLDOWN_MIN +
          "-minute cooldown, so re-read the lessons linked above first rather than guessing again.") +
      '</p><div class="lib-row" style="margin-top:12px"><a class="btn btn-primary" href="#path">Back to the path</a>' +
      (!passed && !nb.cooling ? '<a class="btn" href="#quiz/' + b.block.id + '">Try again now</a>' : "") +
      "</div>";

    const wrap = $("#quiz");
    wrap.insertBefore(box, wrap.querySelector("#quiz-form"));
    box.scrollIntoView({ behavior: "smooth", block: "center" });
    $$("#quiz-form .lesson-foot").forEach((el) => (el.hidden = true));
    renderHeader(after);
    toast(passed ? "Gate passed at " + Math.round(pct * 100) + "%." : "Not passed — " + Math.round(pct * 100) + "%.");
  }

  /* ------------------------------------------------------------- library
     Files are built here, in the browser, from the same content object the
     lessons read. Nothing is fetched, so nothing can 404. */

  function blobFor(res) {
    const text = res.body.join("\n");
    const type = /\.csv$/.test(res.file) ? "text/csv;charset=utf-8" : "text/markdown;charset=utf-8";
    return new Blob([text], { type });
  }

  function download(id) {
    const res = C.resources.find((r) => r.id === id);
    if (!res) return;
    const url = URL.createObjectURL(blobFor(res));
    const a = document.createElement("a");
    a.href = url;
    a.download = res.file;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast("Downloaded " + res.file + ".");
  }

  function renderLibrary() {
    $("#lib-grid").innerHTML = C.resources
      .map(
        (r) =>
          '<div class="lib"><span class="kind">' +
          esc(r.kind) +
          "</span><b>" +
          esc(r.title) +
          "</b><p>" +
          esc(r.blurb) +
          '</p><div class="lib-row"><button class="btn btn-primary" data-dl="' +
          esc(r.id) +
          '">Download</button><a class="btn" href="#lesson/' +
          esc(r.lesson) +
          '">The lesson</a><span class="file">' +
          esc(r.file) +
          "</span></div></div>"
      )
      .join("");
    $$("#lib-grid [data-dl]").forEach((b) => b.addEventListener("click", () => download(b.dataset.dl)));
  }

  /* ------------------------------------------------------------- glossary */

  function renderGlossary(q) {
    const query = String(q || "").trim().toLowerCase();
    const keys = Object.keys(C.glossary)
      .sort()
      .filter((k) => !query || k.toLowerCase().includes(query) || C.glossary[k].toLowerCase().includes(query));

    $("#gloss").innerHTML = keys.length
      ? keys.map((k) => "<div><dt>" + esc(k) + "</dt><dd>" + esc(C.glossary[k]) + "</dd></div>").join("")
      : '<div class="empty">Nothing matches that. The glossary covers ' + Object.keys(C.glossary).length + " terms.</div>";
  }

  /* -------------------------------------------------------------- tooltip */

  let tip = null;

  function showTip(el) {
    const term = el.dataset.term;
    const def = C.glossary[term];
    if (!def) return;
    hideTip();
    tip = document.createElement("div");
    tip.className = "tip";
    tip.innerHTML = "<b>" + esc(term) + "</b>" + esc(def);
    document.body.appendChild(tip);
    const r = el.getBoundingClientRect();
    const t = tip.getBoundingClientRect();
    tip.style.left = Math.max(8, Math.min(window.innerWidth - t.width - 8, r.left)) + "px";
    tip.style.top = (r.top > t.height + 12 ? r.top - t.height - 8 : r.bottom + 8) + "px";
  }

  function hideTip() {
    if (tip) tip.remove();
    tip = null;
  }

  /* --------------------------------------------------------------- router
     Fragments, the same pattern the calculators use, so a lesson can be
     linked from anywhere in the app and from the search index. */

  function go(hash) {
    if (location.hash === hash) route();
    else location.hash = hash;
  }

  function show(view) {
    ["academy", "path", "lesson", "quiz", "library", "glossary"].forEach((v) => {
      $("#view-" + v).hidden = v !== view;
    });
    /* the Academy draws its own hero, so the core-path header steps aside */
    const head = $(".page-head");
    if (head) head.hidden = view === "academy";
    const tab = view === "lesson" || view === "quiz" ? "path" : view;
    $$(".subtabs a").forEach((a) => {
      if (a.dataset.tab === tab) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  function route() {
    hideTip();
    const h = location.hash.replace(/^#/, "");
    const st = state();
    renderHeader(st);

    if ((h === "masterclasses" || h.indexOf("mc/") === 0) && window.AcademyUI) {
      show("academy");
      window.AcademyUI.route(h);
    } else if (h.indexOf("lesson/") === 0) {
      show("lesson");
      renderLesson(h.slice(7));
    } else if (h.indexOf("quiz/") === 0) {
      show("quiz");
      renderQuiz(h.slice(5));
    } else if (h === "library") {
      show("library");
      renderLibrary();
    } else if (h === "glossary") {
      show("glossary");
      renderGlossary($("#gl-q").value);
    } else {
      show("path");
      renderPath(st);
    }
    window.scrollTo({ top: 0 });
  }

  /* ----------------------------------------------------------------- init */

  function init() {
    if (!C || !window.Store) return;

    $("#lh-sub").textContent =
      C.lessons.length +
      " lessons across four blocks, beginner to advanced, about " +
      C.totalMinutes +
      " minutes of reading. Each block ends in a ten-question quiz and the next one opens at " +
      Math.round(PASS * 100) +
      "% — the same bar the rest of the app holds you to.";

    $("#gl-q").addEventListener("input", (e) => renderGlossary(e.target.value));

    /* glossary tooltips: pointer and keyboard both, on the document so
       re-rendered lessons need no re-wiring */
    document.addEventListener("mouseover", (e) => {
      const t = e.target.closest && e.target.closest(".term");
      if (t) showTip(t);
    });
    document.addEventListener("mouseout", (e) => {
      if (e.target.closest && e.target.closest(".term")) hideTip();
    });
    document.addEventListener("focusin", (e) => {
      const t = e.target.closest && e.target.closest(".term");
      if (t) showTip(t);
    });
    document.addEventListener("focusout", hideTip);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideTip();
    });
    window.addEventListener("scroll", hideTip, { passive: true });

    window.addEventListener("hashchange", route);
    window.addEventListener("storechange", (e) => {
      const kind = e.detail && e.detail.kind;
      if (kind === "learn" || kind === "trades" || kind === "settings" || kind === "*") {
        const st = state();
        renderHeader(st);
        if (!$("#view-path").hidden) renderPath(st);
      }
    });

    if (!location.hash) location.replace(window.AcademyUI ? "#masterclasses" : "#path");
    route();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

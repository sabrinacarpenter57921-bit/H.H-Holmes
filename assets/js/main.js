/* ==========================================================================
   The Holmes Archive — site behaviour
   Vanilla JS, no dependencies. Every enhancement degrades gracefully.
   ========================================================================== */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----------------------------------------------------------------------
     Theme
     ---------------------------------------------------------------------- */

  function initTheme() {
    var root = document.documentElement;
    var toggle = document.querySelector(".theme-toggle");

    // The inline boot script in <head> has already applied the stored theme;
    // here we only wire up the control.
    if (!toggle) return;

    toggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem("holmes-theme", next);
      } catch (e) {
        /* storage unavailable — theme is still applied for this page view */
      }
      toggle.setAttribute("aria-label", "Switch to " + (next === "light" ? "dark" : "light") + " theme");
    });
  }

  /* ----------------------------------------------------------------------
     Header: stuck state, reading progress, mobile menu
     ---------------------------------------------------------------------- */

  function initHeader() {
    var header = document.querySelector(".site-header");
    var bar = document.querySelector(".progress-bar");
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.querySelector(".nav");
    var ticking = false;

    function update() {
      var y = window.scrollY || window.pageYOffset;
      if (header) header.classList.toggle("is-stuck", y > 12);

      if (bar) {
        var doc = document.documentElement;
        var max = doc.scrollHeight - window.innerHeight;
        var ratio = max > 0 ? Math.min(y / max, 1) : 0;
        bar.style.setProperty("--progress", ratio.toFixed(4));
      }
      ticking = false;
    }

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          window.requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
    update();

    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        var open = nav.getAttribute("data-open") === "true";
        nav.setAttribute("data-open", String(!open));
        toggle.setAttribute("aria-expanded", String(!open));
      });

      nav.addEventListener("click", function (e) {
        if (e.target.tagName === "A") {
          nav.setAttribute("data-open", "false");
          toggle.setAttribute("aria-expanded", "false");
        }
      });

      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && nav.getAttribute("data-open") === "true") {
          nav.setAttribute("data-open", "false");
          toggle.setAttribute("aria-expanded", "false");
          toggle.focus();
        }
      });
    }
  }

  /* ----------------------------------------------------------------------
     Scroll reveal
     ---------------------------------------------------------------------- */

  function initReveal() {
    var items = document.querySelectorAll("[data-reveal], .tl-item");
    if (!items.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(items, function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    Array.prototype.forEach.call(items, function (el) {
      io.observe(el);
    });

    // Stagger siblings inside any container marked for it.
    document.querySelectorAll("[data-stagger]").forEach(function (group) {
      var step = parseInt(group.getAttribute("data-stagger"), 10) || 70;
      Array.prototype.forEach.call(group.children, function (child, i) {
        child.style.setProperty("--reveal-delay", i * step + "ms");
      });
    });
  }

  /* ----------------------------------------------------------------------
     Counters (stat tiles)
     ---------------------------------------------------------------------- */

  function initCounters() {
    var nodes = document.querySelectorAll("[data-count]");
    if (!nodes.length) return;

    function run(el) {
      var target = parseFloat(el.getAttribute("data-count"));
      if (isNaN(target)) return;
      if (reduceMotion) {
        el.textContent = String(target);
        return;
      }
      var dur = 1100;
      var start = null;

      function frame(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        // easeOutExpo
        var eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        el.textContent = String(Math.round(eased * target));
        if (p < 1) window.requestAnimationFrame(frame);
      }
      window.requestAnimationFrame(frame);
    }

    if (!("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(nodes, run);
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          run(entry.target);
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.5 }
    );

    Array.prototype.forEach.call(nodes, function (el) {
      io.observe(el);
    });
  }

  /* ----------------------------------------------------------------------
     Filter chips (timeline eras, victim register)
     ---------------------------------------------------------------------- */

  function initFilters() {
    document.querySelectorAll("[data-filter-group]").forEach(function (group) {
      var targetSel = group.getAttribute("data-filter-target");
      // Scope the lookup to this chapter. `.tl-item`, for one, appears on both
      // the timeline and the investigation chapter, so a document-wide query
      // would filter — and miscount — elements belonging to another section.
      var scope = group.closest(".page") || group.closest("main") || document;
      var targets = scope.querySelectorAll(targetSel);
      var countEl = document.querySelector(group.getAttribute("data-filter-count") || "");

      function apply(value) {
        var shown = 0;
        Array.prototype.forEach.call(targets, function (el) {
          var tags = (el.getAttribute("data-tags") || "").split(/\s+/);
          var match = value === "all" || tags.indexOf(value) !== -1;
          el.hidden = !match;
          if (match) shown++;
        });
        if (countEl) countEl.textContent = String(shown);
      }

      group.addEventListener("click", function (e) {
        var chip = e.target.closest(".filter-chip");
        if (!chip || !group.contains(chip)) return;

        group.querySelectorAll(".filter-chip").forEach(function (c) {
          c.setAttribute("aria-pressed", String(c === chip));
        });
        apply(chip.getAttribute("data-filter"));
      });

      var initial = group.querySelector('.filter-chip[aria-pressed="true"]');
      apply(initial ? initial.getAttribute("data-filter") : "all");
    });
  }

  /* ----------------------------------------------------------------------
     Accordions (myth vs. record)
     ---------------------------------------------------------------------- */

  function initAccordions() {
    document.querySelectorAll(".myth__q").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!open));
      });
    });
  }

  /* ----------------------------------------------------------------------
     Castle floor plan
     ---------------------------------------------------------------------- */

  function initPlan() {
    var frame = document.querySelector("[data-plan]");
    if (!frame) return;

    var readout = document.querySelector("[data-plan-readout]");
    if (!readout) return;

    var elKicker = readout.querySelector("[data-readout-kicker]");
    var elTitle = readout.querySelector("[data-readout-title]");
    var elBody = readout.querySelector("[data-readout-body]");
    var elStatus = readout.querySelector("[data-readout-status]");

    var defaults = {
      kicker: elKicker ? elKicker.textContent : "",
      title: elTitle ? elTitle.textContent : "",
      body: elBody ? elBody.innerHTML : "",
      status: elStatus ? elStatus.innerHTML : ""
    };

    function select(room) {
      frame.querySelectorAll(".room").forEach(function (r) {
        r.setAttribute("aria-pressed", String(r === room));
      });

      if (elKicker) elKicker.textContent = room.getAttribute("data-floor") || defaults.kicker;
      if (elTitle) elTitle.textContent = room.getAttribute("data-title") || "";
      if (elBody) elBody.innerHTML = "<p>" + (room.getAttribute("data-body") || "") + "</p>";

      if (elStatus) {
        var status = room.getAttribute("data-status") || "";
        var label = room.getAttribute("data-status-label") || "";
        elStatus.innerHTML = status
          ? '<span class="pill pill--' + status + '">' + label + "</span>"
          : "";
      }

      if (window.innerWidth < 992) {
        readout.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "nearest"
        });
      }
    }

    frame.addEventListener("click", function (e) {
      var room = e.target.closest(".room");
      if (room) select(room);
    });

    frame.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var room = e.target.closest(".room");
      if (!room) return;
      e.preventDefault();
      select(room);
    });

    // Floor switching
    var tabs = document.querySelectorAll(".floor-tab");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var floor = tab.getAttribute("data-floor");

        tabs.forEach(function (t) {
          t.setAttribute("aria-selected", String(t === tab));
        });

        frame.querySelectorAll("[data-floor-panel]").forEach(function (panel) {
          panel.hidden = panel.getAttribute("data-floor-panel") !== floor;
        });

        // Reset the readout when the floor changes.
        frame.querySelectorAll(".room").forEach(function (r) {
          r.setAttribute("aria-pressed", "false");
        });
        if (elKicker) elKicker.textContent = defaults.kicker;
        if (elTitle) elTitle.textContent = defaults.title;
        if (elBody) elBody.innerHTML = defaults.body;
        if (elStatus) elStatus.innerHTML = defaults.status;
      });
    });
  }

  /* ----------------------------------------------------------------------
     Active section highlighting in the on-page contents list
     ---------------------------------------------------------------------- */

  function initScrollSpy() {
    var links = document.querySelectorAll("[data-spy] a");
    if (!links.length || !("IntersectionObserver" in window)) return;

    var map = {};
    var sections = [];

    links.forEach(function (link) {
      var id = link.getAttribute("href");
      if (!id || id.charAt(0) !== "#") return;
      var section = document.querySelector(id);
      if (!section) return;
      map[id.slice(1)] = link;
      sections.push(section);
    });

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var link = map[entry.target.id];
          if (!link) return;
          if (entry.isIntersecting) {
            links.forEach(function (l) {
              l.removeAttribute("aria-current");
            });
            link.setAttribute("aria-current", "true");
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    sections.forEach(function (s) {
      io.observe(s);
    });
  }

  /* ----------------------------------------------------------------------
     Boot
     ---------------------------------------------------------------------- */

  function boot() {
    initTheme();
    initHeader();
    initReveal();
    initCounters();
    initFilters();
    initAccordions();
    initPlan();
    initScrollSpy();

    // Stamp the current year in the footer.
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

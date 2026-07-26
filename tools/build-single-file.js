/*
 * Bundle the eight-page site into one self-contained HTML file.
 *
 *   node tools/build-single-file.js   ->  dist/holmes-archive.html
 *
 * The multi-page site in the repository root is the canonical version; this
 * produces a single-file build for hosts that serve exactly one document and
 * block external requests. Two things necessarily differ from the source site:
 *
 *   1. The webfont <link> is dropped — a strict CSP blocks font CDNs, and a
 *      silent fallback is worse than a deliberate system stack. The families
 *      below are chosen, not inherited.
 *   2. The eight pages become eight sections behind a hash router, so
 *      cross-page links are rewritten from ./sources.html#s-geyer to
 *      #/sources/s-geyer.
 *
 * Everything else — markup, CSS, behaviour — is taken verbatim from source,
 * so fixes to the real site flow into the bundle on the next build.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..');
const OUT = path.join(SRC, 'dist', 'holmes-archive.html');

const PAGES = ['index','biography','castle','victims','investigation','myths','timeline','sources'];

const read = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');

/* ---- 1. CSS: swap the webfont stacks for deliberate system pairings ---- */
let css = read('assets/css/style.css');

css = css.replace(
  /--font-display:[\s\S]*?--font-mono:[^;]*;/,
  `--font-display: "Iowan Old Style", "Palatino Linotype", Palatino,
    "Book Antiqua", "URW Palladio L", Georgia, serif;
  --font-serif: Charter, "Bitstream Charter", "Sitka Text", "Iowan Old Style",
    Cambria, Georgia, serif;
  --font-sans: "Helvetica Neue", Helvetica, "Segoe UI", system-ui, Arial,
    sans-serif;
  --font-mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas,
    monospace;`
);

/* Palatino runs large and Charter small; rebalance so the pairing sits right. */
css = css.replace(
  '  color-scheme: dark;\n}',
  `  color-scheme: dark;\n}\n\n/* Optical correction for the system pairing: Charter's x-height is smaller\n   than Spectral's, Palatino's caps are larger than Playfair's. */\nbody { font-size: calc(var(--step-0) * 1.04); }\nh1, h2, h3, h4, h5 { letter-spacing: -0.005em; }\n.hero__title { letter-spacing: -0.02em; }`
);

/* ---- 2. JS: site behaviour, minus the theme boot (the router owns it) ---- */
let js = read('assets/js/main.js');

/* ---- 3. Extract each page's <main> ---- */
const locate = (html, tag, attr) => {
  const open = new RegExp(`<${tag}[^>]*${attr}[^>]*>`);
  const m = html.match(open);
  if (!m) throw new Error('no <' + tag + '> matching ' + attr);
  const close = html.lastIndexOf(`</${tag}>`);
  if (close === -1) throw new Error('unclosed <' + tag + '>');
  return { openEnd: m.index + m[0].length, closeStart: close, outerStart: m.index,
           outerEnd: close + tag.length + 3 };
};

/* Inner content only — used for <main>, which we re-wrap ourselves. */
const grab = (html, tag, attr) => {
  const at = locate(html, tag, attr);
  return html.slice(at.openEnd, at.closeStart);
};

/* Element and all — used for the header and footer, whose own wrappers carry
   the sticky positioning and stacking context the layout depends on. */
const grabOuter = (html, tag, attr) => {
  const at = locate(html, tag, attr);
  return html.slice(at.outerStart, at.outerEnd);
};

/* Rewrite cross-page links into router hashes. */
const relink = (s) => s
  .replace(/href="\.\/([a-z]+)\.html#([\w-]+)"/g, 'href="#/$1/$2"')
  .replace(/href="\.\/([a-z]+)\.html"/g, 'href="#/$1"');

const sections = PAGES.map((name) => {
  const html = read(name + '.html');
  const main = relink(grab(html, 'main', 'id="main"'));
  return `<section class="page" data-page="${name}"${name === 'index' ? '' : ' hidden'}>\n${main}\n</section>`;
}).join('\n\n');

/* Header and footer are identical across pages; take one of each. */
const indexHtml = read('index.html');
let header = relink(grabOuter(indexHtml, 'header', 'class="site-header"'));
header = header.replace(/\s*aria-current="page"/g, ''); // the router sets this
const footer = relink(grabOuter(indexHtml, 'footer', 'class="site-footer"'));

/* Guard against the wrappers going missing again: the sticky header and its
   z-index are what keep the mobile menu above the page content. */
['<header class="site-header">', '</header>'].forEach(function (needle) {
  if (header.indexOf(needle) === -1) throw new Error('header wrapper lost: ' + needle);
});
if (footer.indexOf('<footer class="site-footer">') === -1) throw new Error('footer wrapper lost');

/* ---- 4. Router ---- */
const router = `
/* ------------------------------------------------------------------
   Single-page router. The eight chapters ship as sections; the hash
   selects one. Deep links keep working: #/sources/s-geyer opens the
   sources chapter and scrolls to that entry.
   ------------------------------------------------------------------ */
(function () {
  var pages = Array.prototype.slice.call(document.querySelectorAll(".page"));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav a"));
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var names = pages.map(function (p) { return p.getAttribute("data-page"); });

  function parse() {
    var h = (location.hash || "").replace(/^#\\/?/, "");
    var bits = h.split("/").filter(Boolean);
    var page = bits[0] && names.indexOf(bits[0]) !== -1 ? bits[0] : "index";
    return { page: page, frag: bits[1] || "" };
  }

  function show(target, frag, initial) {
    pages.forEach(function (p) {
      p.hidden = p.getAttribute("data-page") !== target;
    });

    navLinks.forEach(function (a) {
      var href = a.getAttribute("href") || "";
      if (href.indexOf("#/" + target) === 0 && href.length === target.length + 2) {
        a.setAttribute("aria-current", "page");
      } else {
        a.removeAttribute("aria-current");
      }
    });

    var active = document.querySelector('.page[data-page="' + target + '"]');
    var h1 = active && active.querySelector("h1");
    var label = "";
    if (h1) {
      // The hero h1 carries its standfirst in a nested <em>; drop it so the
      // tab shows the chapter name rather than the whole sentence.
      var clone = h1.cloneNode(true);
      Array.prototype.forEach.call(clone.querySelectorAll("em"), function (e) {
        e.parentNode.removeChild(e);
      });
      label = clone.textContent.replace(/\\s+/g, " ").trim();
    }
    document.title = (label ? label + " — " : "") + "The Holmes Archive";

    if (frag) {
      var el = document.getElementById(frag);
      if (el) {
        el.scrollIntoView({ behavior: "auto", block: "start" });
        // Fragment targets inside the source list get their :target styling
        // from the id, which a hash of #/sources/x no longer supplies.
        pages.forEach(function (p) {
          Array.prototype.forEach.call(p.querySelectorAll(".is-target"), function (n) {
            n.classList.remove("is-target");
          });
        });
        el.classList.add("is-target");
        return;
      }
    }
    if (!initial) window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  function route(initial) {
    var r = parse();
    show(r.page, r.frag, initial);
  }

  window.addEventListener("hashchange", function () { route(false); });
  route(true);
})();
`;

/* ---- 5. Theme boot: make data-theme explicit so the host toggle wins ---- */
const themeBoot = `
/* The published page inherits the viewer's theme via a data-theme attribute
   stamped on <html>. We set it explicitly from prefers-color-scheme when the
   host has not, so the component-level light overrides resolve either way;
   an explicit stamp from the host or the in-page button then takes over. */
(function () {
  var root = document.documentElement;
  root.classList.add("js-ready");
  var chosen = null;
  try { chosen = localStorage.getItem("holmes-theme"); } catch (e) {}
  if (!root.getAttribute("data-theme")) {
    root.setAttribute("data-theme", chosen || (window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"));
  }
  if (!chosen && window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: light)");
    var onChange = function (e) {
      var manual = null;
      try { manual = localStorage.getItem("holmes-theme"); } catch (err) {}
      if (!manual) root.setAttribute("data-theme", e.matches ? "light" : "dark");
    };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }
})();
`;

const extraCss = `
/* Router-driven fragment highlight, replacing :target which a #/page/frag
   hash cannot trigger. */
.sources li.is-target {
  border-color: var(--brass);
  background: var(--surface-2);
}
.page[hidden] { display: none; }
`;

const out = `<title>The Holmes Archive — H. H. Holmes: The Record and the Legend</title>
<style>
${css}
${extraCss}
</style>

<a class="skip-link" href="#main">Skip to content</a>

${header}

<main id="main">
${sections}
</main>

${footer}

<script>
${themeBoot}
${js}
${router}
</script>
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out);
console.log('wrote', OUT, (out.length / 1024).toFixed(1) + ' KB');
console.log('sections:', PAGES.length);

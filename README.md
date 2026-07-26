# The Holmes Archive

A static, self-contained website about **Herman Webster Mudgett (1861–1896)**, better
known as **H. H. Holmes** — written to hold the documented record apart from the
century of invention layered on top of it.

Most popular accounts of Holmes describe a purpose-built killing hotel that swallowed
two hundred visitors to the 1893 World's Columbian Exposition. Almost none of that
survives contact with the surviving records. This site presents the narrower, better
evidenced case — nine named victims, one murder conviction, and a fraudster's
half-finished Chicago building — and traces each famous claim back to where it
actually came from.

## Pages

| File | Chapter | Contents |
| --- | --- | --- |
| `index.html` | Overview | Hero, key figures, the case in five moves, the World's Fair question |
| `biography.html` | I — Life | Gilmanton, Ann Arbor, Chicago, the three marriages, the flight from Chicago |
| `castle.html` | II — The Castle | **Interactive four-floor plan** of 601–603 W. 63rd St., room by room, plus a feature-by-feature verdict table |
| `victims.html` | III — Victims | Filterable register of the nine named victims, and the names wrongly added to it |
| `investigation.html` | IV — Manhunt & Trial | The Pitezel insurance scheme, Detective Frank Geyer's search, the 1895 trial, the execution and 2017 exhumation |
| `myths.html` | V — Myth Check | Twelve claims tested and graded, each traced to its origin |
| `timeline.html` | VI — Timeline | 32 filterable entries, 1861 to the present |
| `sources.html` | VII — Sources | Bibliography with each source's weaknesses stated, and the grading method |

## Evidence grading

Every substantive claim on the site carries one of four marks. The bands are about
evidence, not plausibility.

- **Documented** — court records, contemporaneous official documents, physical
  evidence, or multiple independent primary sources in agreement.
- **Probable** — strong circumstantial or multi-source support, but no conviction,
  body, or definitive document.
- **Disputed** — credible researchers actively disagree, or the fact is established
  but its interpretation is not.
- **Invention** — traceable to a specific piece of sensational reporting, pulp
  writing, or self-serving confession, with no independent support.

`sources.html#method` states the method and the archive's own limitations in full,
including the fact that the floor plans are interpretive reconstructions — no complete
original drawing of the building is known to survive.

## Running it

No build step, no dependencies, no framework. Open `index.html`, or serve the
directory:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

It is also ready to publish with GitHub Pages directly from the repository root
(a `.nojekyll` file is included so `assets/` is served untouched).

## Single-file build

Some hosts serve exactly one document and block external requests. For those:

```sh
node tools/build-single-file.js   # -> dist/holmes-archive.html
```

This inlines the CSS and JS and folds the eight pages into eight sections behind
a hash router, so `./sources.html#s-geyer` becomes `#/sources/s-geyer` and deep
links keep working. Two things necessarily differ from the canonical site: the
webfont link is dropped in favour of a deliberate system stack (Iowan Old
Style/Palatino for display, Charter/Sitka for text), because a blocked CDN would
otherwise mean a silent, unchosen fallback; and navigation is client-side.
Everything else is taken verbatim from source, so fixes to the site flow into
the bundle on the next build.

## Structure

```
index.html  biography.html  castle.html  victims.html
investigation.html  myths.html  timeline.html  sources.html
assets/
  css/style.css   design tokens, components, light + dark themes
  js/main.js      theme toggle, scroll reveal, filters, accordions, floor plan
tools/
  build-single-file.js   bundles the above into dist/holmes-archive.html
```

## Technical notes

- **No external dependencies.** One optional Google Fonts stylesheet, with full
  system-serif fallback stacks; the site is fully legible without it.
- **All imagery is inline SVG** drawn for this project — plans, diagrams and the
  hero plate. There are no photographs, and no image of Holmes is reproduced.
- **Light and dark themes**, defaulting to dark, with the choice persisted in
  `localStorage` and applied before first paint to avoid a flash.
- **Accessibility**: skip link, landmark regions, keyboard-operable floor plan
  (`Enter` / `Space` on each room), `aria-pressed` / `aria-expanded` state on all
  controls, a live region for the plan readout, visible focus rings, and full
  `prefers-reduced-motion` support.
- **Responsive** from 320 px up, with no horizontal overflow at any width; wide
  tables and diagrams scroll inside their own containers.
- **Progressive enhancement**: every page's content is present and readable with
  JavaScript disabled. Scripts only add filtering, the plan interaction, and motion.

## On tone

Four of the nine people listed in the register were children. The site deliberately
avoids the aesthetic that usually attends this material — the leering reconstructions,
the invented interior monologue, the murderer as antihero. The corrections it makes
reduce the scale of Holmes's crimes; they are not intended to soften them.

## Corrections

Errors should be fixed rather than defended. Open an issue with a source attached.
Claims arriving without a source will be held to the same standard as the ones this
site spends seven chapters rejecting.

## Licence

Educational and historical use. Text is compiled from public-domain trial records,
contemporaneous reporting, and published scholarship credited on `sources.html`.

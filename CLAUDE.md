# Teddy Riley Productions — archive site

A static discography site. No framework, no build step for the CSS/JS — plain
HTML, one shared stylesheet, one shared script. The only generated thing is the
release grids, which come from `data/releases.json`.

Content is sourced from teddyrileyproductions.com (a WordPress site). This repo
is a redesign of it, not a copy of its code.

## Layout

```
index.html            front page: video hero, intro, decade panels
1980s.html            108 releases, 1982–1989
1990s.html            7 releases, 1990
contact.html          Formspree contact form
style.css             every page
script.js             card flip, contact form, footer prompt
data/releases.json    THE SOURCE OF TRUTH for releases
tools/build.py        releases.json -> the grids in the decade pages
tools/extract.py      one-off, already run: pages -> releases.json
imgs/                 covers (one per release), heroes, decade panels
fonts/                Open Sans variable, self-hosted
```

## Adding or changing a release

**Edit `data/releases.json`, then run `python3 tools/build.py`.** Never hand-edit
a `<div class="card">` — the next build overwrites it.

```json
{
  "year": "1988",
  "artist": "Guy",
  "title": "Groove Me",
  "label": "MCA Records",
  "image": "1988-guy-groove-me.jpg",
  "tracks": ["Groove Me (Radio Edit)", "Groove Me (Bonus Beats)"],
  "missing": ["Groove Me (Bonus Beats)"]
}
```

- `missing` is optional; list the exact track strings that are missing from the
  collection. They render red and give that card a legend. It comes from the
  red `<mark>` spans on the source site.
- `image` is a filename inside `imgs/`. Download the cover, name it
  `<year>-<artist>-<title>` kebab-cased, and drop it there.
- No cover available? Use `"image": "placeholder-sleeve.svg"` — a neutral
  sleeve reading NO COVER YET. Swap it for the real file when one turns up.
- Order matters: releases appear in JSON order, grouped by year, and years
  appear in first-seen order. Keep each year's block together.
- Write plain text — `&` and `″` are escaped by the build script. Don't put
  `&amp;` or `&Prime;` in the JSON.

`build.py` rewrites only the region between the `RELEASES:START` / `RELEASES:END`
markers. Hero, intro copy, nav and footer are hand-written; edit those directly.

### A new year

Just add releases with that year. The build creates the heading and anchor
(`id="y1991"`). The **year-jump nav is hand-written** in the page — add the link
yourself; `build.py` prints a warning when it looks out of date.

### A new decade page

Copy `1990s.html`, swap the hero image and `--hero-pos`, add a `"2000s"` key to
`releases.json`, add the page to `PAGES` in `extract.py` and to the nav on every
page, and un-grey its panel in `index.html`.

## Annual: bump the copyright year

The footer year is hardcoded, deliberately — a JS-generated year disappears
when JavaScript is off, and a copyright notice that vanishes is worse than one
a year stale. Every January, update it in all four pages:

```bash
grep -rln '© 2026 TeddyRileyProductions.com' *.html
sed -i '' 's/© 2026 TeddyRileyProductions.com/© 2027 TeddyRileyProductions.com/' *.html
```

The footer is hand-written markup repeated in index.html, 1980s.html,
1990s.html and contact.html — build.py does not touch it.

## Things that are easy to get wrong

- **Anchors are `y`-prefixed** (`id="y1982"`). Ids starting with a digit can't be
  targeted by a plain CSS selector.
- **`--accent-soft` is for the light page only.** On the dark card back use
  `--ink-soft`; `--accent-soft` fails contrast there.
- **`body` needs `background-color`, not just the gradient.** Without it the
  canvas is unpainted below the fold and renders black.
- **`background-attachment: fixed` sizes to the viewport, not the element.** On a
  short header that leaves no overflow, so `--hero-pos` does nothing — the
  compact contact hero uses `scroll` for that reason.
- **Hero images are framed with `--hero-pos`** (set inline per page). These
  portraits sit high, so a centred crop cuts the face off.
- The source page occasionally **merges two tracks onto one line** where a `<br>`
  is missing. Check tracklists against the source when they look short.

## Favicon

Three files at the repo root, all derived from `imgs/logo.png`:

- `favicon.png` — the logo **inverted to dark**, for light browser tabs
- `favicon-dark.png` — the original white, served via
  `media="(prefers-color-scheme: dark)"`
- `apple-touch-icon.png` — white logo on solid `#121214`, since iOS
  composites these opaque and would otherwise flatten the transparency

The source logo is white line art on transparency, so a single favicon would be
invisible on one theme or the other — hence the pair. Regenerate with ffmpeg by
squaring the tall logo first (`force_original_aspect_ratio=decrease` then pad),
then `negate` for the dark variant.

## Contact form

Both forms (contact page, and the footer prompt built by `script.js`) POST to
Formspree `moeawjre`. The endpoint lives in `FORM_ENDPOINT` in `script.js` and in
the `action` on `contact.html`. No email address appears in the markup. Forms work
without JS as a plain POST; JS only upgrades them to submit in place.

## The YEP YEP widget

A floating prompt bottom-left, built by `script.js` (`buildYepWidget`) rather
than repeated in each page's markup. It posts to the same Formspree endpoint
through the shared `wireContactForm`, so there is one submit path for all three
forms on the site.

It is skipped on contact.html, which is already the form — the guard looks for a
`.contact-form` that is not inside `.ask` or `.yep`.

The avatar is `imgs/yep-avatar.jpg`, cropped from `imgs/story/ins08.jpg`, the
photo where he is holding the YEP YUP licence plate frame.

## 404

`404.html` at the repo root. Netlify, Cloudflare Pages and GitHub Pages all
serve that filename automatically for unmatched routes — no config needed. On
Apache you would need `ErrorDocument 404 /404.html` in `.htaccess`.

The joke reuses the site's own machinery: the page presents itself as a release
that is missing from the collection, with every version rendered in the red
`li.missing` style, pressed on Lil' Man Records. If the missing-marker colour or
convention changes, this page follows it automatically.

`initLostPage()` in `script.js` makes it react to the visitor:

- echoes the URL they actually asked for
- runs a two-phase sequence: it first digs through the nine labels in large
  type — Lil' Man Records, Funky Mamma, G.R. Productions, New Jack Swing,
  Future Records, LOR Records, Sound Of New York, Rooftop Records, QDT — and
  only when that finishes does the "Never pressed." block fade in. Under
  `prefers-reduced-motion` it skips straight to the answer. Add a label by
  editing `LABELS` in `initLostPage`.
- reads `data/releases.json`, so a year in the URL — `/1987-anything` — offers a
  link straight to `1980s.html#y1987` with the real release count
- renders one genuine release picked at random from the archive, using
  `wireCard()` so it flips like any other

All release text is set with `textContent`, never `innerHTML` — the data must not
be parsed as markup.

Testing it needs a server that actually serves 404.html on a miss;
`python3 -m http.server` returns its own error page instead.

## Deploying

Push to `main`. The repo is **private** on GitHub. Nothing auto-deploys yet — see
the notes in the conversation about Cloudflare Pages / Netlify, both of which can
build from a private repo for free. GitHub Pages would require making it public.

If the site ever replaces the WordPress install, the pages need to move to
`1980s/index.html` form so the live URLs (`/1980s/`) keep working, and asset
paths become root-relative.

## Checking your work

```bash
python3 tools/build.py                  # regenerate the grids
python3 -m http.server 8934             # then open http://localhost:8934/
```

Serve over HTTP, not `file://` — the fonts and the hero video break otherwise.

# projecttrinity.dev

The website for Project Trinity: Shatterbound and the Project Trinity research behind it. Plain HTML, CSS and a little
JavaScript: no build step, no framework, no tracking, no cookies, no external scripts or fonts.

## Open it

From this folder:

```
python -m http.server 8176 --bind 127.0.0.1
```

then open http://127.0.0.1:8176/. Links are root-relative (`/css/site.css`), so open it through a server, not as a file.
Add `?theme=dark` or `?theme=light` to force a mode. A visitor's own Day or Night pick is kept in their browser
(`localStorage`, never a cookie) and holds across pages; until they pick, the site follows the system setting.

## What is here

| Path | What |
|---|---|
| `index.html` | The front page, a short scroll: the cinematic first screen (the B-roll over the Old Hunger still, the title, Project Trinity with Shatterbound on a name slip beneath, a taped strip under it saying heroes swap mid-fight, and the email list as the main call with Watch the gameplay beside it), the game in three lines and how it's made, the party, the bosses, the newest post and the Research teaser. Request a build is only in the header, with Join the list beside it (on a phone, both in the menu, which opens over the page without moving the header's first row). |
| `request/` | The Request a build form (the header's button comes here), with the email list's own sign-up beside it. |
| `robots.txt`, `sitemap.xml`, `llms.txt` | Search and AI search: every crawler welcome, the page list (written by `tools/make-sitemap.py`), and a plain account of the game and studio for AI readers (Tooling 187). |
| `video/skills/` | Silent skill loops (960x540, a few seconds), cut from films that already existed on his desk, with a poster each; only skills with a film have one (none for Reaver yet). |
| `video/` | A devlog clip (`healer-steps-out-s8-139.mp4`, side by side, and a `-stacked` copy, before above after, for phones; CSS shows one) and the first screen's silent B-roll loop (19.9 s; 1080p MP4 and WebM, a 720p MP4 for phones), cut from existing films. It plays muted, pauses off screen, and gives way to the still when motion is turned off. |
| `shatterbound/` | The heroes by role (Tank, Healer, DPS), each a sticker holding down a scroll that opens on a click (key skills, clips), with a question-mark slot in each role; the bosses, each walkthrough folded behind a click; Don Fortuna is a "coming" card. One page per character, `shatterbound/<id>/` (every skill, the clips, the job in each fight; a boss's page is its fight). All of it is written by `tools/make-characters.py`: edit the words there and rerun it, never the pages. |
| `research/` | Three short sections: how the party plays, how the research is done, how the game is built, with the two charts. |
| `devlog/` | The index, newest first, the email sign-up at its foot; one folder per post (`devlog/<slug>/index.html`). The five monthly recaps (July to November 2026) carry the same words as the game repository's drafts, `docs/devlog/recaps/`: a fix to one is made to both. |
| `contact/` | The message form (the Worker's `/contact`). |
| `css/site.css` | All styles, in the game's own look, the Wayfarers' Book: paper on a lilac sky by Day, blue paper on the night sky by Night, Caveat Brush lettering, stickers in each hero's colour, photos taped in, the gold brush for what to press. The colours are the game's tokens (`unity-b/Assets/UI/Theme/TrinityTokens.uss`). |
| `js/site.js` | The light/dark switch, the header (solid on scroll, the phone menu), the film window, and the forms' checks. Nothing is sent or stored except what a form sends. |
| `fonts/` | The game's UI fonts (Caveat Brush for names and titles, Source Sans 3 for reading), SIL Open Font License; licences beside them. |
| `img/` | Stills, `share/` (every page's link card, 1200x630, drawn by the tools; see Link cards below), the two flow charts with a still of each for people who turn motion off, `party/` (the game's round portrait stickers, 256 px WebP), `portraits/` (Models 101's renders: the 4:5 cut-outs and the 16:9 banners, from `tools/make-portraits.py`), `fights/` (the game's fight cards, 16:9), `devlog/` (each post's pictures as WebP, a 720 px and an up-to-1200 px copy) and `book/` (the Book's own plates: paper, tape, brush strokes, stamps, clouds, from `unity-b/Assets/UI/Art/Book/`). |

Every page carries the same header and footer: change one, change them all. Each page has its own link card
(`og:title`, `og:description`, `og:url`, and the card's picture; see Link cards below).

## Adding a devlog post

1. Copy `devlog/i-miss-playing-with-my-friends/` to `devlog/<new-slug>/` and replace its title, date, picture, text and
   link-card tags (`og:title`, `og:description`, `og:url`, `canonical`, `article:published_time`, and a one-line
   `og:image:alt` describing the post's first picture: its card is drawn from it in step 4) and its structured data (the `application/ld+json`
   block in the head: `headline`, `description`, `url`, `mainEntityOfPage`, `image`, `datePublished`).
   A picture in the text is `<figure class="post-photo"><span class="photo"><img ...></span><figcaption>...</figcaption></figure>`: taped in at its own shape, at most 540 px tall, with a hand-written line under it (add `tilt-right` to the span to lean it the other way). A silent loop is a `<video data-loop muted loop playsinline preload="none" poster=...>`: it plays only on screen and never for anyone who asked for less motion.
2. Add a `<li class="post-row">` at the top of the list in `devlog/index.html` (newest first): picture, date, title, two lines.
3. On the front page, point the Devlog card at the newest post.
4. Run `python tools/make-share-cards.py` (draws the post's link card and writes its image tags), then
   `python tools/make-sitemap.py` (the new post joins `sitemap.xml`, and the page is checked), add it to `llms.txt`'s
   Devlog section if it is worth an AI reader's time, then `python tools/stamp-assets.py`.

## The portraits and the mark (Tooling 182)

- **The stickers are the game's painted ones** (his pick, 2026-11-25). Models 101's renders are each character page's banner,
  at the top of the page, and its link card. The swap stays in place: `PORTRAITS` near the top of `js/site.js` is `"painted"`;
  `"render"` would put the 4:5 cut-outs on every sticker and the 16:9 renders on the boss walkthroughs, and `?portraits=render`
  previews that.
- The renders are made by `python tools/make-portraits.py <game repo>/art/portraits` (needs the LFS files). Ids: `bastion`,
  `oracle`, `reaver`, `asha`, `giant`, `patchwork`, `old-hunger`, `maera`.
- Each character page's link card is drawn from its 16:9 render, with its name on a paper tag (see Link cards below).
- **The role tags** are the game's own: its role glyph (the HUD's `ui-glyph-role-*`) in ink on the Book's round blank stamp, as the
  HUD shows a role (`img/book/role-*.webp`; the glyph alone, `glyph-*.webp`, is the role pill's icon).
- **The mark (Tooling 180):** D, the formation, sits in every page's header (`img/brand/mark-ink.svg` on the paper header,
  `mark-chalk.svg` over the film and by Night). The tab carries A: the studio's `favicon.ico`, `favicon.svg` (it turns light
  in a dark browser) and `apple-touch-icon.png` at the root, and the Shatterbound cut (the crack through the boss) from
  `img/brand/shatterbound/` on the game's own pages (`shatterbound/` and each character), where its D also marks Don Fortuna's
  "coming" plate. The files come from the game repository's `art/brand/mark/` (`studio/` and `shatterbound/`).

## The boxes and the video

- The video is a button until someone presses it; then YouTube's privacy-enhanced player (youtube-nocookie.com) opens in a window over the page.
- The forms post to `https://api.projecttrinity.dev`, the Worker in `worker/` on his Cloudflare account: Turnstile checks
  it's a person, a build request or a Contact message is kept in D1 and mailed to the project mailbox, and the email list goes to Kit's form
  (Kit sends its own confirm email). The Turnstile site key in `js/site.js` is public by design; the secret lives only in
  Cloudflare (`npx wrangler secret put TURNSTILE_SECRET`).
- Locally: `cd worker`, put Cloudflare's published test secret in `.dev.vars` (`TURNSTILE_SECRET=1x0000000000000000000000000000000AA`),
  `npx wrangler d1 execute projecttrinity-forms --local --file=./schema.sql`, `npx wrangler dev --local --port 8787 --ip 127.0.0.1`;
  on localhost the page uses the test site key and talks to port 8787.
- `worker/` is not served (`_config.yml` excludes it).

## Not connected yet

- The Contact form needs the Worker's `/contact` route live, so run these from `worker/` **before** the pages that use it
  reach `main`: `npx wrangler d1 execute projecttrinity-forms --remote --file=./schema.sql` (adds the `messages` table),
  then `npx wrangler deploy`.

## The tools

- `python tools/make-characters.py`: writes `shatterbound/` and every character page from the words in it.
- `python tools/make-portraits.py <path>`: the renders' web copies.
- `python tools/make-textures.py`: the Book's paper (a seamless 2048 px tile, Day and Night) and the 4K sky with its fade
  built in, from the game's own plates (`img/book/sky-day.jpg` is kept as the sky's source).
- `python tools/make-share-cards.py`: the front page's link card (shared by Research, Devlog, Contact and Request a
  build) and every devlog post's, and their image tags. `make-characters.py` draws the character pages' and
  `/shatterbound/`'s. Both draw through `tools/sharecard.py` (see Link cards below).
- `python tools/make-sitemap.py`: writes `sitemap.xml` from every page's canonical, and stops with a list if a page lacks
  its title, description, canonical, link card, alt text on an image, one `<h1>` or structured data. Run it after adding
  or changing a page.
- `python tools/stamp-assets.py`: last, after any of the above or any CSS or JS change.

## Search and AI search (Tooling 187)

- `robots.txt` opens every page to every crawler, search engines and AI search alike, and names `sitemap.xml`.
  Cloudflare sits in front of the site and serves its own managed robots.txt text ahead of this file (content-signal
  comments, no rules today); what it adds is set in the Cloudflare dashboard, not here.
- `llms.txt` says plainly, for AI readers, what the game and the studio are, with the pages worth reading. Keep it true
  when the facts change (a new hero or boss, a new platform, a new kind of page).
- Every page carries structured data (JSON-LD, schema.org): the front page names the studio (`Organization`), the site
  (`WebSite`) and the game (`VideoGame`); posts are `BlogPosting`; character pages are a `WebPage` about the game with a
  breadcrumb (written by `make-characters.py`); the other pages are a `WebPage` (the devlog index a `Blog`). Check a
  change at https://validator.schema.org (paste the page or its URL once live).

### His sign-ups (his accounts; done once)

Google Search Console:
1. Go to https://search.google.com/search-console and sign in with the Google account that should own the site.
2. Add property, choose **Domain**, enter `projecttrinity.dev`.
3. Google shows a TXT record. In Cloudflare, open projecttrinity.dev, DNS, Records, Add record: type TXT, name `@`,
   content the value Google gave, then Save. Back in Search Console press Verify (it can take a few minutes).
4. In Search Console, Sitemaps: submit `https://projecttrinity.dev/sitemap.xml`.
5. URL inspection: paste `https://projecttrinity.dev/` and press Request indexing (once is enough).

Bing Webmaster Tools (it also feeds Copilot and DuckDuckGo):
1. Go to https://www.bing.com/webmasters and sign in.
2. Choose **Import from Google Search Console** and pick projecttrinity.dev (it brings the verification and sitemap
   across); or add the site by hand and verify it with the TXT record Bing shows, the same way as above.
3. Sitemaps: check `https://projecttrinity.dev/sitemap.xml` is listed; submit it if not.
4. Optional: Settings, IndexNow, turn it on so changes reach Bing sooner.

## Link cards (Tooling 197)

What a shared link shows. Every card is `tools/share-card/card.html`, a 1200x630 page drawn from the site's own parts
(its stylesheet, fonts, the Book's plates, the mark and the game's art), opened through a local server in headless Chrome
or Edge (`CHROME=<path>` if it is not found) and saved as `img/share/<name>-<hash>.jpg`. The hash is of what went into
the card, so a card whose words or picture change gets a new file name: chat apps and social sites keep a preview by its
image's address and fetch a new address fresh. A card that has not changed is not redrawn. Each page carries
`og:image` and `twitter:image` with the card's size and alt text, and its structured data names the same picture.

- The front page's card: the title (his pick A) over Old Hunger, the four heroes' stickers on a taped strip.
- Each hero's and boss's card: their 16:9 render, their name and role (or place) on a paper tag. A render whose body
  stands mid-picture slides right on its card (`CARD_SHIFT` in `make-characters.py`).
- `/shatterbound/`'s card: the heroes' and bosses' painted stickers.
- Each devlog post's card: its first picture taped in beside its title.

A platform that already holds the old preview refetches it on its own after a while; to refresh one now, paste the
page's address into Facebook's Sharing Debugger (https://developers.facebook.com/tools/debug/, Scrape Again; this also
serves WhatsApp and Instagram) or LinkedIn's Post Inspector (https://www.linkedin.com/post-inspector/). X, Discord,
Slack and iMessage read the card when a link is next shared.

## Cache-busting

After changing any CSS or JS, run `python tools/stamp-assets.py` before committing, so returning visitors get the new files.

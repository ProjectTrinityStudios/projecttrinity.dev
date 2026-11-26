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
| `index.html` | The front page, a short scroll: the cinematic first screen (the B-roll over the Old Hunger still, the title, Project Trinity with Shatterbound on a name slip beneath, a taped strip under it saying heroes swap mid-fight, and the email list as the main call with Watch the gameplay beside it), the game in three lines and how it's made, the party, the bosses, the newest post and the Research teaser. Request a build is only in the header (on a phone, in the menu). |
| `request/` | The Request a build form (the header's button comes here). |
| `video/skills/` | Silent skill loops (960x540, a few seconds), cut from films that already existed on his desk, with a poster each; only skills with a film have one (none for Reaver yet). |
| `video/` | A devlog clip (`healer-steps-out-s8-139.mp4`, side by side, and a `-stacked` copy, before above after, for phones; CSS shows one) and the first screen's silent B-roll loop (19.9 s; 1080p MP4 and WebM, a 720p MP4 for phones), cut from existing films. It plays muted, pauses off screen, and gives way to the still when motion is turned off. |
| `shatterbound/` | The heroes by role (Tank, Healer, DPS), each a sticker holding down a scroll that opens on a click (key skills, clips), with a question-mark slot in each role; the bosses, each walkthrough folded behind a click; Don Fortuna is a "coming" card. One page per character, `shatterbound/<id>/` (every skill, the clips, the job in each fight; a boss's page is its fight). All of it is written by `tools/make-characters.py`: edit the words there and rerun it, never the pages. |
| `research/` | Three short sections: how the party plays, how the research is done, how the game is built, with the two charts. |
| `devlog/` | The index, newest first, the email sign-up at its foot; one folder per post (`devlog/<slug>/index.html`). The five monthly recaps (July to November 2026) carry the same words as the game repository's drafts, `docs/devlog/recaps/`: a fix to one is made to both. |
| `contact/` | The message form (the Worker's `/contact`). |
| `css/site.css` | All styles, in the game's own look, the Wayfarers' Book: paper on a lilac sky by Day, blue paper on the night sky by Night, Caveat Brush lettering, stickers in each hero's colour, photos taped in, the gold brush for what to press. The colours are the game's tokens (`unity-b/Assets/UI/Theme/TrinityTokens.uss`). |
| `js/site.js` | The light/dark switch, the header (solid on scroll, the phone menu), the film window, and the forms' checks. Nothing is sent or stored except what a form sends. |
| `fonts/` | The game's UI fonts (Caveat Brush for names and titles, Source Sans 3 for reading), SIL Open Font License; licences beside them. |
| `img/` | Stills, the share card (1200x630), the two flow charts with a still of each for people who turn motion off, `party/` (the game's round portrait stickers, 256 px WebP), `portraits/` (Models 101's renders: the 4:5 cut-outs, the 16:9 banners and each character's 1200x630 link card, from `tools/make-portraits.py`), `fights/` (the game's fight cards, 16:9), `devlog/` (each post's pictures as WebP, a 720 px and an up-to-1200 px copy, and its 1200x630 link card) and `book/` (the Book's own plates: paper, tape, brush strokes, stamps, clouds, from `unity-b/Assets/UI/Art/Book/`). |

Every page carries the same header and footer: change one, change them all. Each page has its own link card
(`og:title`, `og:description`, `og:url`).

## Adding a devlog post

1. Copy `devlog/i-miss-playing-with-my-friends/` to `devlog/<new-slug>/` and replace its title, date, picture, text and
   link-card tags (`og:*`, `canonical`, `article:published_time`).
   A picture in the text is `<figure class="post-photo"><span class="photo"><img ...></span><figcaption>...</figcaption></figure>`: taped in at its own shape, at most 540 px tall, with a hand-written line under it (add `tilt-right` to the span to lean it the other way). A silent loop is a `<video data-loop muted loop playsinline preload="none" poster=...>`: it plays only on screen and never for anyone who asked for less motion.
2. Add a `<li class="post-row">` at the top of the list in `devlog/index.html` (newest first): picture, date, title, two lines.
3. On the front page, point the Devlog card at the newest post.

## The portraits and the mark (Tooling 182)

- **The stickers are the game's painted ones** (his pick, 2026-11-25). Models 101's renders are each character page's banner,
  at the top of the page, and its link card. The swap stays in place: `PORTRAITS` near the top of `js/site.js` is `"painted"`;
  `"render"` would put the 4:5 cut-outs on every sticker and the 16:9 renders on the boss walkthroughs, and `?portraits=render`
  previews that.
- The renders are made by `python tools/make-portraits.py <game repo>/art/portraits` (needs the LFS files). Ids: `bastion`,
  `oracle`, `reaver`, `asha`, `giant`, `patchwork`, `old-hunger`, `maera`.
- Each character page's link card is its 16:9 render (`img/portraits/share-<id>.jpg`).
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
- Locally: `cd worker`, `npm install` once (wrangler, pinned in `package.json`), put Cloudflare's published test secret in `.dev.vars` (`TURNSTILE_SECRET=1x0000000000000000000000000000000AA`),
  `npx wrangler d1 execute projecttrinity-forms --local --file=./schema.sql`, `npx wrangler dev --local --port 8787 --ip 127.0.0.1`;
  on localhost the page uses the test site key and talks to port 8787.
- `worker/` is not served (`_config.yml` excludes it).

## Build keys (Tooling 189)

A build request's mail to him carries an Approve link (`worker/src/keys.js`). Opening it shows the request and sends
nothing; its **Send key** button takes the next unused itch.io key link from D1 (`build_keys`), mails it to the requester
through Resend with their platform's note, and marks the key and the request used; at `KEYS_LOW` unused keys or fewer
each send also mails him a warning. The link's secret is stored only as its SHA-256 (`approvals`), and each request sends
one key at most. The platform notes are `PLATFORM_NOTES` at the top of `keys.js`.

- Keys go in from `worker/` with `node tools/keys.mjs import <file>` (or a pasted list): any text holding key links, or
  bare keys with `--page <itch page>`. `count`, `list`, `link <id>` and `reset <id>` do the rest; `--local` works on
  `wrangler dev`'s store. It uses wrangler's own login and holds no key.
- The sender's key is `RESEND_API_KEY`, set with `npx wrangler secret put` and nowhere else. Locally, `KEY_SENDER=fake` in
  `.dev.vars` logs the key mail instead of sending it (`fake-fail` makes it fail, to see the key go back), and
  `PUBLIC_API=http://127.0.0.1:8787` points the Approve links at `wrangler dev`.
- Switching it on (his steps, also in the game repository's `docs/how-to/itch-io-builds.md`): the Resend account and the
  domain verified (Sign in to Cloudflare), `npx wrangler secret put RESEND_API_KEY`, the schema run with `--remote`,
  `npx wrangler deploy`, then the first batch imported.

## Not connected yet

- The Contact form needs the Worker's `/contact` route live, so run these from `worker/` **before** the pages that use it
  reach `main`: `npx wrangler d1 execute projecttrinity-forms --remote --file=./schema.sql` (adds the `messages` table),
  then `npx wrangler deploy`.

## The tools

- `python tools/make-characters.py`: writes `shatterbound/` and every character page from the words in it.
- `python tools/make-portraits.py <path>`: the renders' web copies.
- `python tools/make-textures.py`: the Book's paper (a seamless 2048 px tile, Day and Night) and the 4K sky with its fade
  built in, from the game's own plates (`img/book/sky-day.jpg` is kept as the sky's source).
- `python tools/stamp-assets.py`: last, after any of the above or any CSS or JS change.

## Cache-busting

After changing any CSS or JS, run `python tools/stamp-assets.py` before committing, so returning visitors get the new files.

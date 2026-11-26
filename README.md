# projecttrinity.dev

The website for Project Trinity: Shatterbound and the Project Trinity research behind it. Plain HTML, CSS and a little
JavaScript: no build step, no framework, no tracking, no cookies, no external scripts or fonts.

## Open it

From this folder:

```
python -m http.server 8176 --bind 127.0.0.1
```

then open http://127.0.0.1:8176/. Links are root-relative (`/css/site.css`), so open it through a server, not as a file.
Add `?theme=dark` or `?theme=light` to force a mode; otherwise it follows the system.

## What is here

| Path | What |
|---|---|
| `index.html` | The front page, a short scroll: the cinematic first screen (the B-roll over the Old Hunger still, the title, Watch the gameplay and Request a build), the game in three lines and how it's made, the party, the bosses, the newest post and the Research teaser. |
| `request/` | The Request a build form (the header's button comes here). |
| `video/` | The first screen's silent B-roll loop (19.9 s; 1080p MP4 and WebM, a 720p MP4 for phones), cut from existing films. It plays muted, pauses off screen, and gives way to the still when motion is turned off. |
| `shatterbound/` | The heroes (role, resource, one line, key skills) and the bosses, each walkthrough folded behind a click; Don Fortuna is a "coming" card. |
| `research/` | Three short sections: how the party plays, how the research is done, how the game is built, with the two charts. |
| `devlog/` | The index, newest first, the email sign-up at its foot; one folder per post (`devlog/<slug>/index.html`). |
| `contact/` | The message form (the Worker's `/contact`). |
| `css/site.css` | All styles, in the game's own look, the Wayfarers' Book: paper on a lilac sky by Day, blue paper on the night sky by Night, Caveat Brush lettering, stickers in each hero's colour, photos taped in, the gold brush for what to press. The colours are the game's tokens (`unity-b/Assets/UI/Theme/TrinityTokens.uss`). |
| `js/site.js` | The light/dark switch, the header (solid on scroll, the phone menu), the film window, and the forms' checks. Nothing is sent or stored except what a form sends. |
| `fonts/` | The game's UI fonts (Caveat Brush for names and titles, Source Sans 3 for reading), SIL Open Font License; licences beside them. |
| `img/` | Stills, the share card (1200x630), the two flow charts with a still of each for people who turn motion off, `party/` (the game's round portrait stickers, 256 px WebP), `fights/` (the game's fight cards, 16:9) and `book/` (the Book's own plates: paper, tape, brush strokes, stamps, clouds, from `unity-b/Assets/UI/Art/Book/`). |

Every page carries the same header and footer: change one, change them all. Each page has its own link card
(`og:title`, `og:description`, `og:url`).

## Adding a devlog post

1. Copy `devlog/i-miss-playing-with-my-friends/` to `devlog/<new-slug>/` and replace its title, date, picture, text and
   link-card tags (`og:*`, `canonical`, `article:published_time`).
2. Add a `<li class="post-row">` at the top of the list in `devlog/index.html` (newest first): picture, date, title, two lines.
3. On the front page, point the Devlog card at the newest post.

## Slots for the portraits and the mark (Tooling 182)

- Hero and boss cards on `shatterbound/` show `img/party/<id>.webp` inside a 4:5 slot (`.portrait`, `data-portrait="<id>"`).
  Models 101's `portrait-<id>-4x5.png` (1600x2000, alpha) goes in as a web copy there; add `class="is-cutout"` to the
  `<img>` so it fills the slot.
- Each opened walkthrough shows `img/fights/<id>-800.jpg` / `-1280.jpg` in a 16:9 slot (`data-banner="<id>"`), for
  `portrait-<id>-16x9.png` (3840x2160).
- Ids: `bastion`, `oracle`, `reaver`, `asha`, `giant`, `patchwork`, `old-hunger`, `maera`.
- The family mark (Tooling 180) replaces the shard: the `#shard` symbol at the foot of every page, and `favicon.svg`.

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

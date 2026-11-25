# projecttrinity.dev

The website for Project Trinity: Shatterbound and the Project Trinity research behind it. One page, plain HTML, CSS
and a little JavaScript: no build step, no framework, no tracking, no cookies, no external scripts or fonts.

## Open it

From this folder:

```
python -m http.server 8176 --bind 127.0.0.1
```

then open http://127.0.0.1:8176/. Add `?theme=dark` or `?theme=light` to force a mode; otherwise it follows the system.

## What is here

| Path | What |
|---|---|
| `index.html` | The page: the video (a poster frame for now), the game in three lines, Alpha with Windows, Mac and Linux, how it was made, the two boxes, the devlog, the research, the footer, and the link card. |
| `css/site.css` | All styles. Light mode is the menu's dusk sky; dark mode is the night sky; the boxes are an open book in both. |
| `js/site.js` | The light/dark switch, the play mark's note, and the boxes' checks. Nothing is sent or stored. |
| `fonts/` | The game's UI fonts (Trinity Confluence, Source Sans 3), SIL Open Font License; licences beside them. |
| `img/` | Stills cut from the main cut and the fly-through, the share card (1200x630), and the two flow charts with a still of each for people who turn motion off. |

## The boxes and the video

- The video is a poster until someone presses play; then YouTube's privacy-enhanced player (youtube-nocookie.com) loads in its place.
- Both boxes post to `https://api.projecttrinity.dev`, the Worker in `worker/` on his Cloudflare account: Turnstile checks
  it's a person, a build request is kept in D1 and mailed to the project mailbox, and the email list goes to Kit's form
  (Kit sends its own confirm email). The Turnstile site key in `js/site.js` is public by design; the secret lives only in
  Cloudflare (`npx wrangler secret put TURNSTILE_SECRET`).
- Locally: `cd worker`, put Cloudflare's published test secret in `.dev.vars` (`TURNSTILE_SECRET=1x0000000000000000000000000000000AA`),
  `npx wrangler d1 execute projecttrinity-forms --local --file=./schema.sql`, `npx wrangler dev --local --port 8787 --ip 127.0.0.1`;
  on localhost the page uses the test site key and talks to port 8787.
- `worker/` is not served (`_config.yml` excludes it).

## Not connected yet

- `devlog/i-miss-playing-with-my-friends/` is a "still being written" page (caution tape) until the post is written.

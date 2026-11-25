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

## Not connected yet

- The video plays from YouTube once the channel is up; the play mark shows a note until then.
- "Request a build" and "Join the email list" check what is typed and say nothing was sent.
- The devlog entry links to `devlog/i-miss-playing-with-my-friends/`, which does not exist yet.
- `hello@projecttrinity.dev` is not live until the domain is bought and forwarded.

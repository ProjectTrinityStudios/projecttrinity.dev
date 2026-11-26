// Renders the build key mails (keys.js) for a look before a Worker change goes live, as tools/preview-email.py does for
// the email list's template. Sends nothing and needs no key.
//
//     node tools/preview-key-mail.mjs [out-folder]
//
// Writes key-<platform>.html and again-<platform>.html (the HTML part) and the same names as .txt (the plain-text part)
// for Windows, Mac and Linux into the out folder, by default the site's email/preview/ (git-ignored). Open the HTML in
// a browser in light and dark mode for Day and Night; the link is a stand-in, never a real key.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { keyMailHtml, keyMailText, againMailHtml, againMailText, PLATFORM_NOTES } from "../src/keys.js";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(process.argv[2] || join(here, "..", "..", "email", "preview"));
const STAND_IN = "https://example.itch.io/project-trinity/download/STAND-IN-NOT-A-REAL-KEY-000000000000";

mkdirSync(out, { recursive: true });
for (const platform of Object.keys(PLATFORM_NOTES)) {
  const mails = {
    [`key-${platform}`]: [keyMailHtml, keyMailText],
    [`again-${platform}`]: [againMailHtml, againMailText],
  };
  for (const [name, [html, text]] of Object.entries(mails)) {
    writeFileSync(join(out, `${name}.html`), html(platform, STAND_IN));
    writeFileSync(join(out, `${name}.txt`), text(platform, STAND_IN));
    console.log(join(out, `${name}.html`));
  }
}

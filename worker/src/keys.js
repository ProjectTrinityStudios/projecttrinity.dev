// One-click build keys (Tooling 189). A build request's mail to him carries an Approve link; the link opens a page here
// that shows the request, and its Send key button takes the next unused itch.io key link from D1, mails it to the
// requester through Resend, and marks the key and the request used. Nothing is sent by opening the link: only the
// button (a POST) sends, so a mail scanner that follows the link changes nothing.
//
// The link's secret is 32 random bytes; D1 keeps only its SHA-256. Each request sends one key at most; the link stays
// readable afterwards and shows which key went out, so the mail stays his.
// The page never shows a sent key: whoever holds an old link sees only when and to whom it went.
// Only a first try that Resend plainly refused gives the key back (nothing ever went out). A try whose outcome is unknown
// (Resend down, the answer lost) leaves the request 'sending', and from then on its key stays bound to it whatever a
// later try returns: only It arrived or his Decline ends it, and Decline keeps the key out of stock. The page offers
// Send again (the same key to the same person, with an idempotency key so Resend delivers it once). A request holds at
// most one key: keys are reserved by one conditional statement.
// RESEND_API_KEY is a Cloudflare secret. KEY_SENDER (local .dev.vars only): "fake" logs the mail instead of sending,
// "fake-fail" is a plain refusal, "fake-lost" an unknown outcome.

// The note each platform's key mail carries. Edit here when a player changes.
export const PLATFORM_NOTES = {
  windows: [
    "On Windows: download the Windows build from the page, unzip it, and run Trinity.exe.",
    "If Windows SmartScreen stops it, choose More info, then Run anyway.",
  ],
  mac: [
    "On a Mac: the Mac build runs on Intel and Apple Silicon Macs with macOS 12 or newer.",
    "Downloaded in a browser, macOS will say the app is damaged or cannot be verified. After unzipping, run this once in Terminal:",
    "    xattr -dr com.apple.quarantine /path/to/Trinity.app",
    "or open it once from System Settings, Privacy & Security, Open Anyway. The itch.io app avoids this.",
  ],
  linux: [
    "On Linux: unpack the build and run Trinity.x86_64. If it will not start, run this once in its folder:",
    "    chmod +x Trinity.x86_64",
  ],
};

const PLATFORM_NAMES = { windows: "Windows", mac: "Mac", linux: "Linux" };

// ---- the link's secret ----

function toHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256(text) {
  return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

function sameText(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Makes the request's Approve link and keeps the secret's hash. Returns the link.
export async function makeApproveLink(env, requestId) {
  const token = newToken();
  await env.DB.prepare("INSERT OR REPLACE INTO approvals (request_id, token_hash) VALUES (?, ?)")
    .bind(requestId, await sha256(token)).run();
  const base = (env.PUBLIC_API || "https://api.projecttrinity.dev").replace(/\/+$/, "");
  return `${base}/approve?r=${requestId}&t=${token}`;
}

async function checkToken(env, requestId, token) {
  if (!Number.isInteger(requestId) || requestId <= 0 || typeof token !== "string" || token.length < 40) return false;
  const row = await env.DB.prepare("SELECT token_hash FROM approvals WHERE request_id = ?").bind(requestId).first();
  return !!row && sameText(row.token_hash, await sha256(token));
}

export async function keysLeft(env) {
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM build_keys WHERE request_id IS NULL").first();
  return row ? row.n : 0;
}

function lowMark(env) {
  const n = parseInt(env.KEYS_LOW || "5", 10);
  return Number.isFinite(n) && n >= 0 ? n : 5;
}

// ---- the routes ----

// GET /approve?r=<id>&t=<secret> shows the request; POST /approve (the page's buttons) sends or declines.
export async function handleApprove(request, env) {
  const url = new URL(request.url);
  if (request.method === "GET") {
    const id = parseInt(url.searchParams.get("r") || "", 10);
    const token = url.searchParams.get("t") || "";
    if (!(await checkToken(env, id, token))) return page(404, "Not a valid link", [p("This Approve link is not valid. Nothing was sent.")]);
    return showRequest(env, id, token);
  }
  if (request.method === "POST") {
    const form = await request.formData().catch(() => null);
    const id = parseInt((form && form.get("r")) || "", 10);
    const token = String((form && form.get("t")) || "");
    const action = String((form && form.get("action")) || "");
    if (!(await checkToken(env, id, token))) return page(404, "Not a valid link", [p("This Approve link is not valid. Nothing was sent.")]);
    if (action === "send") return sendKey(env, id, token);
    if (action === "retry") return retryKey(env, id, token);
    if (action === "arrived") return markArrived(env, id, token);
    if (action === "decline") return decline(env, id, token);
    return page(400, "Nothing done", [p("That button is not one this page knows. Nothing was sent.")]);
  }
  return page(405, "Nothing done", [p("Open the Approve link from the request mail.")]);
}

async function loadRequest(env, id) {
  return env.DB.prepare("SELECT id, created_at, email, platform, note, join_list, status FROM build_requests WHERE id = ?")
    .bind(id).first();
}

async function showRequest(env, id, token, notice) {
  const req = await loadRequest(env, id);
  if (!req) return page(404, "No such request", [p("This request is no longer in the store. Nothing was sent.")]);
  const left = await keysLeft(env);
  const earlier = await env.DB.prepare(
    "SELECT r.id, k.used_at FROM build_requests r JOIN build_keys k ON k.request_id = r.id WHERE r.email = ? AND r.id <> ? ORDER BY k.used_at"
  ).bind(req.email, id).all();
  const key = await env.DB.prepare("SELECT used_at FROM build_keys WHERE request_id = ?").bind(id).first();

  const parts = [];
  if (notice) parts.push(notice);
  parts.push(`<dl>
    <dt>Email</dt><dd>${esc(req.email)}</dd>
    <dt>Platform</dt><dd>${esc(PLATFORM_NAMES[req.platform] || req.platform)}</dd>
    <dt>Asked</dt><dd>${esc(req.created_at)}</dd>
    <dt>Email list</dt><dd>${req.join_list ? "asked to join" : "no"}</dd>
    <dt>Note</dt><dd>${req.note ? esc(req.note) : "<span class=\"quiet\">(none)</span>"}</dd>
  </dl>`);
  if (earlier.results && earlier.results.length) {
    parts.push(p(`This address already has ${earlier.results.length === 1 ? "a key" : earlier.results.length + " keys"}, sent ${earlier.results.map((r) => esc(r.used_at)).join(", ")}.`, "warn"));
  }

  if (req.status === "new") {
    parts.push(left > 0
      ? p(`${left} unused ${left === 1 ? "key" : "keys"} in the store. Send key takes the next one and mails it to ${esc(req.email)} with the ${esc(PLATFORM_NAMES[req.platform])} note.`, left <= lowMark(env) ? "warn" : "")
      : p("No unused keys in the store: generate a batch on itch.io and import it (<code>node tools/keys.mjs import</code>) before sending.", "warn"));
    parts.push(`<form method="post" action="/approve" class="buttons">
      <input type="hidden" name="r" value="${id}"><input type="hidden" name="t" value="${esc(token)}">
      <button type="submit" name="action" value="send" class="send"${left > 0 ? "" : " disabled"}>Send key</button>
      <button type="submit" name="action" value="decline" class="decline">Decline</button>
    </form>`);
  } else if (req.status === "sent") {
    parts.push(p(`Sent to ${esc(req.email)}${key ? ` on ${esc(key.used_at)}` : ""}. Which key went is in <code>node tools/keys.mjs sent</code>.`, "done"));
  } else if (req.status === "declined") {
    parts.push(key
      ? p("Declined after an unclear send. Its key stays out of stock in case that mail did arrive; <code>node tools/keys.mjs sent</code> shows it, to revoke on itch.io.", "done")
      : p("Declined. Nothing was sent.", "done"));
  } else {
    parts.push(p(`Not sure the key mail reached ${esc(req.email)}: Resend did not answer clearly${key ? ` (tried ${esc(key.used_at)})` : ""}. The key stays held for this request, so it cannot go to anyone else. Look for this address in Resend's Emails list: if it is there, press It arrived; if not, Send again mails the same key, and Resend delivers it once even if the first try did go. Decline ends it and keeps the key out of stock.`, "warn"));
    parts.push(`<form method="post" action="/approve" class="buttons">
      <input type="hidden" name="r" value="${id}"><input type="hidden" name="t" value="${esc(token)}">
      <button type="submit" name="action" value="retry" class="send">Send again</button>
      <button type="submit" name="action" value="arrived" class="decline">It arrived</button>
      <button type="submit" name="action" value="decline" class="decline">Decline</button>
    </form>`);
  }
  if (req.status !== "new") parts.push(p(`${left} unused ${left === 1 ? "key" : "keys"} left.`, "quiet"));
  return page(200, `Build request ${id}`, parts);
}

// Declines a new request, or ends a 'sending' one; a key a 'sending' request holds stays bound to it, out of stock.
async function decline(env, id, token) {
  const done = await env.DB.prepare(
    "UPDATE build_requests SET status = 'declined' WHERE id = ? AND status IN ('new', 'sending') RETURNING id"
  ).bind(id).first();
  return showRequest(env, id, token, done ? p("Declined.", "done") : null);
}

// The key this request holds, reserving the next unused one if it holds none. One conditional statement, so two
// overlapping presses can never leave a request holding two keys; both then use the one it holds.
async function reserveKey(env, id) {
  await env.DB.prepare(
    `UPDATE build_keys SET request_id = ?, used_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
     WHERE id = (SELECT id FROM build_keys WHERE request_id IS NULL ORDER BY id LIMIT 1) AND request_id IS NULL
       AND NOT EXISTS (SELECT 1 FROM build_keys WHERE request_id = ?)`
  ).bind(id, id).run();
  return env.DB.prepare("SELECT id, url FROM build_keys WHERE request_id = ? ORDER BY id LIMIT 1").bind(id).first();
}

async function sendKey(env, id, token) {
  // Claim the request first, so two clicks (or two tabs) can never send two keys.
  const claimed = await env.DB.prepare(
    "UPDATE build_requests SET status = 'sending' WHERE id = ? AND status = 'new' RETURNING id, email, platform"
  ).bind(id).first();
  if (!claimed) return showRequest(env, id, token);

  const key = await reserveKey(env, id);
  if (!key) {
    await env.DB.prepare("UPDATE build_requests SET status = 'new' WHERE id = ?").bind(id).run();
    return showRequest(env, id, token, p("No unused key was left, so nothing was sent. Import a batch and press Send key again.", "warn"));
  }

  return deliver(env, id, token, claimed, key, true);
}

// Mails the request's key and settles the outcome. Only a refusal of the first try gives the key back: after an
// unclear try, a later refusal says nothing about whether the earlier mail arrived.
async function deliver(env, id, token, req, key, firstTry) {
  const sent = await mailKey(env, req.email, req.platform, key.url, `build-key-${id}-${key.id}`);
  if (sent.ok) {
    await env.DB.prepare("UPDATE build_requests SET status = 'sent' WHERE id = ? AND status = 'sending'").bind(id).run();
    const left = await keysLeft(env);
    if (left <= lowMark(env)) await warnLow(env, left);
    return showRequest(env, id, token, p(`Sent to ${esc(req.email)}.`, "done"));
  }
  if (sent.refused && firstTry) {
    await env.DB.batch([
      env.DB.prepare("UPDATE build_keys SET request_id = NULL, used_at = NULL WHERE id = ?").bind(key.id),
      env.DB.prepare("UPDATE build_requests SET status = 'new' WHERE id = ?").bind(id),
    ]);
    return showRequest(env, id, token, p(`The mail did not go out (${esc(sent.error)}), so the key went back unused. Nothing was sent.`, "warn"));
  }
  if (sent.refused) {
    return showRequest(env, id, token, p(`Resend refused this try (${esc(sent.error)}). The key stays held for this person, since an earlier try may have arrived: fix the cause and press Send again.`, "warn"));
  }
  // Unknown outcome: the request stays 'sending' with its key, and the page says what to do.
  return showRequest(env, id, token, p(`Resend's answer was unclear (${esc(sent.error)}).`, "warn"));
}

// Send again, for a request left 'sending': the key it already holds, to the same person.
async function retryKey(env, id, token) {
  const req = await env.DB.prepare("SELECT id, email, platform FROM build_requests WHERE id = ? AND status = 'sending'").bind(id).first();
  if (!req) return showRequest(env, id, token);
  // Normally the key it already holds; a send that stopped before taking one takes one now.
  const key = await reserveKey(env, id);
  if (!key) return showRequest(env, id, token, p("No unused key was left, so nothing was sent. Import a batch and press Send again.", "warn"));
  return deliver(env, id, token, req, key, false);
}

async function markArrived(env, id, token) {
  const done = await env.DB.prepare(
    "UPDATE build_requests SET status = 'sent' WHERE id = ? AND status = 'sending' AND EXISTS (SELECT 1 FROM build_keys WHERE request_id = ?) RETURNING id"
  ).bind(id, id).first();
  return showRequest(env, id, token, done ? p("Marked as sent.", "done") : null);
}

// ---- the mails ----

export function keyMailText(platform, keyUrl) {
  return [
    "Hello,",
    "",
    "Thanks for asking to play Project Trinity: Shatterbound. Here is your build:",
    "",
    keyUrl,
    "",
    "The link opens the game's itch.io page with the Windows, Mac and Linux downloads, no itch.io account needed. It is yours alone, so please keep it to yourself. Claiming it with an itch.io account lets the itch.io app install the game and keep it updated.",
    "",
    ...(PLATFORM_NOTES[platform] || []),
    "",
    "It is an alpha: expect rough edges. To tell us what you found, reply to this mail.",
    "",
    "Project Trinity Studios",
    "https://projecttrinity.dev",
  ].join("\n");
}

// { ok } when Resend took the mail; { refused } when it plainly did not (nothing went out); neither when unknown.
async function mailKey(env, to, platform, keyUrl, idempotencyKey) {
  const mail = {
    from: env.KEY_FROM || "Project Trinity <builds@projecttrinity.dev>",
    to: [to],
    subject: "Your Project Trinity: Shatterbound build",
    text: keyMailText(platform, keyUrl),
  };
  if (env.REPLY_TO) mail.reply_to = env.REPLY_TO;

  if (env.KEY_SENDER === "fake") {
    console.log("fake sender", JSON.stringify(mail));
    return { ok: true };
  }
  if (env.KEY_SENDER === "fake-fail") return { ok: false, refused: true, error: "fake sender set to refuse" };
  if (env.KEY_SENDER === "fake-lost") return { ok: false, refused: false, error: "fake sender set to lose the answer" };
  if (!env.RESEND_API_KEY) return { ok: false, refused: true, error: "RESEND_API_KEY is not set" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(mail),
    });
    if (res.ok) return { ok: true };
    const body = await res.text().catch(() => "");
    console.log("resend answered", res.status, body.slice(0, 300));
    // A 4xx is Resend saying no (bad request, bad key, rate limit): nothing went out. A 5xx may or may not have sent, and a
    // 409 means the same send is still in flight, so neither gives the key back.
    const refused = res.status >= 400 && res.status < 500 && res.status !== 409;
    return { ok: false, refused, error: `Resend answered ${res.status}` };
  } catch (err) {
    console.log("resend failed", err && err.message);
    return { ok: false, refused: false, error: "no answer from Resend" };
  }
}

// To his mailbox, through Email Routing like the request mails.
async function warnLow(env, left) {
  const text = [
    left === 0 ? "The last build key was just sent: none are left." : `Only ${left} unused build ${left === 1 ? "key is" : "keys are"} left.`,
    "",
    "Generate a new batch on itch.io (Edit game, Distribute, Download keys) and import it from the website repository's worker folder:",
    "",
    "    node tools/keys.mjs import <file>      (or paste the list and end with Ctrl+Z, Enter)",
  ].join("\n");
  try {
    await env.NOTIFY.send({ to: env.MAILBOX, from: env.MAIL_FROM, subject: `Build keys low: ${left} left`, text });
  } catch (err) {
    console.log("low-keys mail failed", err && err.message);
  }
}

// ---- the page ----

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function p(html, kind) {
  return `<p${kind ? ` class="${kind}"` : ""}>${html}</p>`;
}

// A private page for him alone: the site's Book tokens and fonts (from projecttrinity.dev), Day and Night from the system.
function page(status, title, parts) {
  const FONTS = "https://projecttrinity.dev/fonts";
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>${esc(title)} · Project Trinity</title>
<style>
  @font-face { font-family:"Caveat Brush"; src:url("${FONTS}/CaveatBrush-Regular.ttf") format("truetype"); font-display:swap; }
  @font-face { font-family:"Source Sans 3"; src:url("${FONTS}/SourceSans3-Regular.ttf") format("truetype"); font-weight:400; font-display:swap; }
  @font-face { font-family:"Source Sans 3"; src:url("${FONTS}/SourceSans3-Semibold.ttf") format("truetype"); font-weight:600; font-display:swap; }
  :root { --sky-top:#c3b3ea; --sky-low:#f7c9d7; --paper:#f7ecd6; --ink:#2b2452; --ink-soft:#625a86; --rule:rgba(43,36,82,.16);
          --focus:#f2b53c; --stamp:#c8323c; --ok:#2f7a4a; --shadow:rgba(30,20,60,.32); color-scheme:light; }
  @media (prefers-color-scheme: dark) { :root { --sky-top:#12163a; --sky-low:#3b2f68; --paper:#222a5a; --ink:#efe9f8; --ink-soft:#aea8d2;
          --rule:rgba(239,233,248,.16); --stamp:#ff7a72; --ok:#8fd6a4; --shadow:rgba(4,4,16,.5); color-scheme:dark; } }
  * { box-sizing:border-box; }
  body { margin:0; min-height:100vh; padding:32px 16px; background:linear-gradient(var(--sky-top), var(--sky-low)) fixed; color:var(--ink);
         font:17px/1.5 "Source Sans 3", "Segoe UI", system-ui, sans-serif; }
  main { max-width:620px; margin:0 auto; background:var(--paper); border-radius:4px; padding:22px 24px; box-shadow:0 10px 30px var(--shadow); }
  h1 { margin:0 0 14px; font:400 2rem/1.1 "Caveat Brush", "Segoe Print", cursive; }
  dl { display:grid; grid-template-columns:max-content 1fr; gap:6px 16px; margin:0 0 16px; padding-bottom:14px; border-bottom:1px solid var(--rule); }
  dt { color:var(--ink-soft); } dd { margin:0; overflow-wrap:anywhere; white-space:pre-wrap; }
  code { overflow-wrap:anywhere; font-size:.9em; font-weight:400; }
  .warn { color:var(--stamp); font-weight:600; } .done { color:var(--ok); font-weight:600; } .quiet { color:var(--ink-soft); font-size:.92rem; }
  .buttons { display:flex; gap:12px; flex-wrap:wrap; margin:18px 0; }
  button { font:400 1.35rem/1 "Caveat Brush", "Segoe Print", cursive; padding:10px 26px; border-radius:4px; border:2px solid var(--ink); cursor:pointer; background:transparent; color:var(--ink); }
  button.send { background:var(--focus); border-color:var(--focus); color:#2b2452; }
  button:disabled { opacity:.45; cursor:not-allowed; }
  button:focus-visible { outline:3px solid var(--focus); outline-offset:3px; }
</style></head>
<body><main><h1>${esc(title)}</h1>
${parts.join("\n")}
</main></body></html>`;
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; font-src https://projecttrinity.dev; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    },
  });
}

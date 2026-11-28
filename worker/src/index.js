// The site's one server piece, on his own Cloudflare account, at https://api.projecttrinity.dev
//   POST /request    a build request: checked by Turnstile, kept in D1, mailed to the project mailbox,
//                    and added to the email list only if the requester ticked that box
//   POST /subscribe  the email list: checked by Turnstile, handed to Kit's form (Kit sends its own confirm email)
//   POST /contact    a message from the Contact page ("Tell us how it went"): checked by Turnstile, kept in D1, mailed to
//                    the project mailbox, with its kind, the run questions' answers and the game's report code
//   GET|POST /approve  his Approve link from a request mail: shows the request; its button mails the requester a build key (keys.js)
// No cookies, nothing kept beyond the request row. Secrets (TURNSTILE_SECRET, MAILBOX, KIT_API_KEY, RESEND_API_KEY) live in
// Cloudflare, never in this repo.

import { handleApprove, heldKey, keysLeft, makeApproveLink, remindKey } from "./keys.js";

const PLATFORMS = ["windows", "mac", "linux"];
// The Contact page's choices (migrations/0001_feedback.sql); each may be left out, which keeps "".
const KINDS = ["bug", "idea", "thanks", "other"];
const RAN = ["yes", "trouble", "no", "not-played"];
const SEVERITIES = ["blocker", "annoying", "small"];
// What the mail shows for each choice, in the page's own words.
const SAID = {
  kind: { bug: "A bug", idea: "An idea", thanks: "Thanks", other: "Something else" },
  ran: { yes: "Yes", trouble: "Yes, with trouble", no: "No", "not-played": "Hasn't played yet" },
  severity: { blocker: "It stopped them playing", annoying: "It got in the way", small: "Small, but worth saying" },
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default {
  async fetch(request, env) {
    // His Approve page is opened from his mailbox, not from the site, so it skips the site's origin check;
    // the link's secret is what lets it act.
    if (new URL(request.url).pathname === "/approve") return handleApprove(request, env);

    const origin = request.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
    const cors = {
      "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0] || "",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    };
    const reply = (status, body) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return reply(405, { ok: false, error: "method" });
    if (!allowed.includes(origin)) return reply(403, { ok: false, error: "origin" });

    const path = new URL(request.url).pathname;
    let data;
    try {
      data = await request.json();
    } catch {
      return reply(400, { ok: false, error: "body" });
    }

    const email = String(data.email || "").trim().toLowerCase().slice(0, 254);
    if (!EMAIL_RE.test(email)) return reply(400, { ok: false, error: "email" });
    if (data.age !== true) return reply(400, { ok: false, error: "age" });

    const check = await checkTurnstile(env, data.token, request.headers.get("CF-Connecting-IP"));
    if (!check.ok) {
      console.log("turnstile refused", JSON.stringify(check.codes));
      return reply(400, { ok: false, error: "turnstile", codes: check.codes });
    }

    if (path === "/subscribe") {
      const listed = await addToKit(env, email);
      return listed ? reply(200, { ok: true }) : reply(502, { ok: false, error: "list" });
    }

    if (path === "/request") {
      const platform = String(data.platform || "");
      if (!PLATFORMS.includes(platform)) return reply(400, { ok: false, error: "platform" });
      const note = String(data.note || "").slice(0, 500);
      const joinList = data.join_list === true;

      // An address that already has a build takes no second key (Tooling 201): it is mailed its own key's link again,
      // at most once a day, and he gets the request mail with the Approve page saying so.
      const held = await heldKey(env, email);
      if (held && held.status === "sent") {
        // One statement, so two requests at once cannot both pass the once-a-day check.
        const row = await env.DB.prepare(
          `INSERT INTO build_requests (email, platform, note, join_list, status)
           SELECT ?, ?, ?, ?, 'repeat-unsent' WHERE NOT EXISTS (SELECT 1 FROM build_requests WHERE email = ?
             AND status IN ('repeat', 'repeat-unsent') AND created_at > strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-1 day'))
           RETURNING id`
        ).bind(email, platform, note, joinList ? 1 : 0, email).first();
        if (!row) return reply(200, { ok: true });
        const sent = await remindKey(env, row.id, email, platform, held);
        let approve = "";
        try {
          approve = await makeApproveLink(env, row.id);
        } catch (err) {
          console.log("approve link failed", err && err.message);
        }
        await mailHim(env, email, platform, note, joinList, approve, null, row.id, { held, sent });
        if (joinList) await addToKit(env, email);
        return reply(200, { ok: true });
      }

      // One request per email per day is plenty; a repeat is thanked but not stored or mailed again.
      const recent = await env.DB.prepare(
        "SELECT id FROM build_requests WHERE email = ? AND created_at > strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-1 day') LIMIT 1"
      ).bind(email).first();
      if (recent) return reply(200, { ok: true });

      const row = await env.DB.prepare(
        "INSERT INTO build_requests (email, platform, note, join_list) VALUES (?, ?, ?, ?) RETURNING id"
      ).bind(email, platform, note, joinList ? 1 : 0).first();

      // The mail goes even if the link cannot be made; `node tools/keys.mjs link <id>` makes one later.
      let approve = "", left = 0;
      try {
        approve = await makeApproveLink(env, row.id);
        left = await keysLeft(env);
      } catch (err) {
        console.log("approve link failed", err && err.message);
      }
      await mailHim(env, email, platform, note, joinList, approve, left, row.id);
      if (joinList) await addToKit(env, email);
      return reply(200, { ok: true });
    }

    if (path === "/contact") {
      // The name goes into the mail's subject line: no line breaks or other control characters in it. The same goes
      // for the one-line answers and the report code.
      const line = (v, max) => String(v || "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
      const pick = (v, list) => (list.includes(v) ? v : "");
      const name = line(data.name, 100);
      const message = String(data.message || "").trim().slice(0, 2000);
      if (!message) return reply(400, { ok: false, error: "message" });
      const fb = {
        kind: pick(data.kind, KINDS),
        ran: pick(data.ran, RAN),
        played: line(data.played, 200),
        severity: pick(data.severity, SEVERITIES),
        report_code: line(data.report_code, 1000),
      };

      // A few messages per email per hour is plenty; past that the page is told plainly (429) and keeps the draft.
      const recent = await env.DB.prepare(
        "SELECT COUNT(*) AS n FROM messages WHERE email = ? AND created_at > strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-1 hour')"
      ).bind(email).first();
      if (recent && recent.n >= 3) return reply(429, { ok: false, error: "rate" });

      await env.DB.prepare(
        "INSERT INTO messages (email, name, message, kind, ran, played, severity, report_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(email, name, message, fb.kind, fb.ran, fb.played, fb.severity, fb.report_code).run();

      await mailMessage(env, email, name, message, fb);
      return reply(200, { ok: true });
    }

    return reply(404, { ok: false, error: "path" });
  },
};

async function checkTurnstile(env, token, ip) {
  if (!token) return { ok: false, codes: ["no-token"] };
  if (!env.TURNSTILE_SECRET) return { ok: false, codes: ["no-secret-set"] };
  const body = new FormData();
  body.append("secret", env.TURNSTILE_SECRET);
  body.append("response", String(token));
  if (ip) body.append("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  const out = await res.json().catch(() => ({}));
  return { ok: out.success === true, codes: out["error-codes"] || [] };
}

// Kit's v4 API (its public form endpoint quarantines posts from servers as bots). The key is the
// KIT_API_KEY secret in Cloudflare. Step 1 creates the subscriber, step 2 adds them to the site's form.
async function addToKit(env, email) {
  if (!env.KIT_FORM_ID || !env.KIT_API_KEY) {
    console.log("kit not set up", !!env.KIT_FORM_ID, !!env.KIT_API_KEY);
    return false;
  }
  const headers = { "X-Kit-Api-Key": env.KIT_API_KEY, "Content-Type": "application/json", "Accept": "application/json" };
  const made = await fetch("https://api.kit.com/v4/subscribers", {
    method: "POST",
    headers,
    body: JSON.stringify({ email_address: email, state: env.KIT_NEW_STATE || "inactive" }),
  });
  const madeText = await made.text().catch(() => "");
  console.log("kit subscriber", made.status, madeText.slice(0, 300));
  if (!made.ok) return false;
  const added = await fetch(`https://api.kit.com/v4/forms/${encodeURIComponent(env.KIT_FORM_ID)}/subscribers`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email_address: email, referrer: "https://projecttrinity.dev/" }),
  });
  const addedText = await added.text().catch(() => "");
  console.log("kit form", added.status, addedText.slice(0, 300));
  return added.ok;
}

// To the project mailbox, a verified Email Routing destination (the Free plan sends only to those).
// The Approve link is his alone: it opens the request, and only its Send key button mails a key.
// repeat: { held, sent } for an address that already has a build, whose own key's link was mailed again.
async function mailHim(env, email, platform, note, joinList, approve, left, id, repeat) {
  const text = [
    repeat ? "A build request from projecttrinity.dev, from an address that already has a build" : "A build request from projecttrinity.dev",
    "",
    `Email:    ${email}`,
    `Platform: ${platform}`,
    `List:     ${joinList ? "yes, asked to join" : "no"}`,
    "",
    "Note:",
    note || "(none)",
    "",
    ...(repeat
      ? [
          `This address already has a build: its key went on ${repeat.held.used_at} (request ${repeat.held.request_id}). No new key was taken.`,
          repeat.sent.ok
            ? "They were mailed their own key's link again, from builds@projecttrinity.dev."
            : `The mail with their own key's link did not go out (${repeat.sent.error}): the link below can send it again.`,
          "",
          ...(approve ? ["The request's page:", approve] : [`The Approve link could not be made: run node tools/keys.mjs link ${id} for one.`]),
        ]
      : approve
      ? [
          "To send a build key, open this link and press Send key (opening it sends nothing):",
          approve,
          "",
          left > 0 ? `Unused keys: ${left}` : "No unused keys left: import a batch before sending (node tools/keys.mjs import).",
          "Keep this mail to yourself: the link lets whoever has it send this person a key.",
        ]
      : [`The Approve link could not be made: run node tools/keys.mjs link ${id} for one.`]),
  ].join("\n");
  try {
    await env.NOTIFY.send({
      to: env.MAILBOX,
      from: env.MAIL_FROM,
      subject: `${repeat ? "Build request again" : "Build request"}: ${platform}, ${email}`,
      text,
    });
  } catch (err) {
    // The row is already in D1, so a failed mail loses nothing; it shows in `wrangler tail`.
    console.log("mail failed", err && err.message);
  }
}

// A Contact page message, to the same mailbox. The row is already in D1, so a failed mail loses nothing.
// fb: the kind, the run questions' answers and the report code, each "" when not given.
async function mailMessage(env, email, name, message, fb) {
  const kind = SAID.kind[fb.kind] || "";
  const text = [
    "A message from projecttrinity.dev/contact (Tell us how it went)",
    "",
    `From:  ${name || "(no name given)"}`,
    `Email: ${email}`,
    `Kind:  ${kind || "(not said)"}`,
    "",
    `Did it run:  ${SAID.ran[fb.ran] || "(not said)"}`,
    `They played: ${fb.played || "(not said)"}`,
    `How bad:     ${SAID.severity[fb.severity] || "(not said)"}`,
    "",
    "What happened:",
    message,
    "",
    "Report code:",
    fb.report_code || "(none)",
    "",
    "Reply by writing to the address above.",
  ].join("\n");
  try {
    await env.NOTIFY.send({
      to: env.MAILBOX,
      from: env.MAIL_FROM,
      subject: `${kind || "Message"}: ${name ? name + ", " : ""}${email}`,
      text,
    });
  } catch (err) {
    console.log("mail failed", err && err.message);
  }
}

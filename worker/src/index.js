// The site's one server piece, on his own Cloudflare account, at https://api.projecttrinity.dev
//   POST /request    a build request: checked by Turnstile, kept in D1, mailed to the project mailbox,
//                    and added to the email list only if the requester ticked that box
//   POST /subscribe  the email list: checked by Turnstile, handed to Kit's form (Kit sends its own confirm email)
// No cookies, nothing kept beyond the request row. Secrets (TURNSTILE_SECRET, MAILBOX, KIT_API_KEY) live in Cloudflare, never in this repo.

const PLATFORMS = ["windows", "mac", "linux"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default {
  async fetch(request, env) {
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

      // One request per email per day is plenty; a repeat is thanked but not stored or mailed again.
      const recent = await env.DB.prepare(
        "SELECT id FROM build_requests WHERE email = ? AND created_at > strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-1 day') LIMIT 1"
      ).bind(email).first();
      if (recent) return reply(200, { ok: true });

      await env.DB.prepare(
        "INSERT INTO build_requests (email, platform, note, join_list) VALUES (?, ?, ?, ?)"
      ).bind(email, platform, note, joinList ? 1 : 0).run();

      await mailHim(env, email, platform, note, joinList);
      if (joinList) await addToKit(env, email);
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
async function mailHim(env, email, platform, note, joinList) {
  const text = [
    "A build request from projecttrinity.dev",
    "",
    `Email:    ${email}`,
    `Platform: ${platform}`,
    `List:     ${joinList ? "yes, asked to join" : "no"}`,
    "",
    "Note:",
    note || "(none)",
  ].join("\n");
  try {
    await env.NOTIFY.send({
      to: env.MAILBOX,
      from: env.MAIL_FROM,
      subject: `Build request: ${platform}, ${email}`,
      text,
    });
  } catch (err) {
    // The row is already in D1, so a failed mail loses nothing; it shows in `wrangler tail`.
    console.log("mail failed", err && err.message);
  }
}

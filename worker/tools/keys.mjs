#!/usr/bin/env node
// Build keys in the site's D1 store (Tooling 189). Run from the worker folder, after `npm install` once.
//
//   node tools/keys.mjs import [file] [--page <itch page url>] [--batch <label>]
//       Adds itch.io download key links. Reads the file, or, with no file, a pasted list (end it with Ctrl+Z then Enter
//       on Windows, Ctrl+D elsewhere). Any text works (a CSV export, a copied list): every key link in it is taken.
//       A list of bare keys needs --page, the game page's address, to build each link (<page>/download/<key>).
//       A key already in the store is skipped.
//   node tools/keys.mjs count            unused and used keys
//   node tools/keys.mjs list             the requests still waiting, newest first
//   node tools/keys.mjs link <id>        a fresh Approve link for request <id> (one made before keys existed, or a lost mail)
//   node tools/keys.mjs sent [email]     which key went to whom (all, or one address), to revoke one on itch.io
//
// A request whose send had an unclear answer stays 'sending' with its key held; `list` shows it, and its Approve page
// offers Send again (the same key) or It arrived.
//
// Add --local to any of them to work on `wrangler dev --local`'s store instead of the live one.
// It uses wrangler's own Cloudflare login (`npx wrangler login`); it holds no key or token.

import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DATABASE = "projecttrinity-forms";
const PUBLIC_API = "https://api.projecttrinity.dev";
const WORKER_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const local = takeFlag("--local");
const page = takeOption("--page");
const batch = takeOption("--batch") || new Date().toISOString().slice(0, 10);
const [command, target] = args;

function takeFlag(name) {
  const i = args.indexOf(name);
  if (i < 0) return false;
  args.splice(i, 1);
  return true;
}

function takeOption(name) {
  const i = args.indexOf(name);
  if (i < 0) return "";
  const value = args[i + 1] || "";
  args.splice(i, 2);
  return value;
}

// Thrown, never process.exit, so an import's finally always deletes its temp file of keys.
class Refusal extends Error {}

function fail(message) {
  throw new Refusal(message);
}

// wrangler, run directly with node (no shell, so SQL needs no shell quoting).
function wrangler(wranglerArgs) {
  let bin;
  try {
    bin = join(dirname(createRequire(import.meta.url).resolve("wrangler/package.json")), "bin", "wrangler.js");
  } catch {
    fail("wrangler is not installed here: run `npm install` in the worker folder first.");
  }
  const out = spawnSync(process.execPath, [bin, ...wranglerArgs], { cwd: WORKER_DIR, encoding: "utf8", maxBuffer: 64 << 20 });
  if (out.status !== 0) fail(`wrangler failed:\n${out.stderr || out.stdout}`);
  return out.stdout;
}

function where() {
  return local ? "--local" : "--remote";
}

function sql(literal) {
  return `'${String(literal).replace(/'/g, "''")}'`;
}

function query(statement) {
  const text = wrangler(["d1", "execute", DATABASE, where(), "--json", "--command", statement]);
  const start = text.indexOf("[");
  if (start < 0) fail(`wrangler gave no JSON:\n${text}`);
  const parsed = JSON.parse(text.slice(start));
  return (parsed[0] && parsed[0].results) || [];
}

function runFile(statements) {
  const dir = mkdtempSync(join(tmpdir(), "trinity-keys-"));
  const file = join(dir, "keys.sql");
  try {
    writeFileSync(file, statements.join("\n") + "\n");
    wrangler(["d1", "execute", DATABASE, where(), "--yes", "--file", file]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function counts() {
  const [row] = query("SELECT SUM(request_id IS NULL) AS unused, SUM(request_id IS NOT NULL) AS used FROM build_keys");
  return { unused: (row && row.unused) || 0, used: (row && row.used) || 0 };
}

function readInput(file) {
  if (file) return readFileSync(file, "utf8");
  if (process.stdin.isTTY) console.error("Paste the keys, then Ctrl+Z and Enter (Windows) or Ctrl+D:");
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

// Every key link in the text; or, with --page, every bare key (a long run of letters and digits on its own).
function findKeys(text, pageUrl) {
  const links = new Set();
  for (const m of text.matchAll(/https?:\/\/[^\s,;"'<>]+\/download\/[A-Za-z0-9_-]{8,}/g)) links.add(m[0]);
  if (links.size || !pageUrl) return [...links];
  const base = pageUrl.replace(/\/+$/, "");
  for (const field of text.split(/[\s,;"']+/)) {
    if (/^[A-Za-z0-9_-]{20,}$/.test(field)) links.add(`${base}/download/${field}`);
  }
  return [...links];
}

try {
  if (command === "import") {
    const keys = findKeys(readInput(target), page);
    if (!keys.length) {
      fail(page
        ? "No keys found in that text."
        : "No key links found. If the list holds bare keys, give the game page: --page https://<name>.itch.io/<game>");
    }
    const before = counts();
    runFile(keys.map((url) => `INSERT OR IGNORE INTO build_keys (url, batch) VALUES (${sql(url)}, ${sql(batch)});`));
    const after = counts();
    const added = after.unused + after.used - before.unused - before.used;
    console.log(`Found ${keys.length} key${keys.length === 1 ? "" : "s"}; added ${added} (${keys.length - added} already in the store).`);
    console.log(`Unused keys now: ${after.unused}.`);
  } else if (command === "count") {
    const c = counts();
    console.log(`Unused: ${c.unused}   Sent: ${c.used}`);
  } else if (command === "list") {
    const rows = query("SELECT id, created_at, email, platform, status FROM build_requests WHERE status IN ('new', 'sending') ORDER BY id DESC LIMIT 100");
    if (!rows.length) console.log("No requests waiting.");
    for (const r of rows) console.log(`${String(r.id).padStart(5)}  ${r.created_at}  ${r.platform.padEnd(7)}  ${r.status.padEnd(7)}  ${r.email}`);
  } else if (command === "link") {
    const id = parseInt(target || "", 10);
    if (!(id > 0)) fail("Give the request's number: node tools/keys.mjs link <id>");
    if (!query(`SELECT id FROM build_requests WHERE id = ${id}`).length) fail(`No request ${id}.`);
    const token = randomBytes(32).toString("base64url");
    const hash = createHash("sha256").update(token).digest("hex");
    query(`INSERT OR REPLACE INTO approvals (request_id, token_hash) VALUES (${id}, ${sql(hash)})`);
    const base = local ? "http://127.0.0.1:8787" : PUBLIC_API;
    console.log(`${base}/approve?r=${id}&t=${token}`);
    console.log("This replaces any earlier link for that request. Keep it to yourself.");
  } else if (command === "sent") {
    const only = target ? `WHERE r.email = ${sql(target.trim().toLowerCase())}` : "";
    const rows = query(`SELECT r.id, r.email, r.status, k.used_at, k.url FROM build_keys k JOIN build_requests r ON r.id = k.request_id ${only} ORDER BY k.used_at`);
    if (!rows.length) console.log(target ? `No key went to ${target}.` : "No keys sent yet.");
    for (const r of rows) console.log(`${String(r.id).padStart(5)}  ${r.used_at}  ${r.status.padEnd(7)}  ${r.email}  ${r.url}`);
  } else {
    console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 18).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
    process.exitCode = command ? 1 : 0;
  }
} catch (err) {
  console.error(err instanceof Refusal ? err.message : err);
  process.exitCode = 1;
}

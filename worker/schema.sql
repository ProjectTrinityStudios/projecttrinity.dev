-- The request-a-build store. One row per request; nothing else is kept.
CREATE TABLE IF NOT EXISTS build_requests (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  email      TEXT    NOT NULL,
  platform   TEXT    NOT NULL CHECK (platform IN ('windows', 'mac', 'linux')),
  note       TEXT    NOT NULL DEFAULT '',
  join_list  INTEGER NOT NULL DEFAULT 0,
  status     TEXT    NOT NULL DEFAULT 'new'   -- 'new', 'sending' (his click in progress), 'sent', 'declined'
);
CREATE INDEX IF NOT EXISTS build_requests_email ON build_requests (email);

-- Messages from the Contact page. One row per message; nothing else is kept.
CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  email      TEXT    NOT NULL,
  name       TEXT    NOT NULL DEFAULT '',
  message    TEXT    NOT NULL,
  status     TEXT    NOT NULL DEFAULT 'new'   -- 'new', 'answered': his to set
);
CREATE INDEX IF NOT EXISTS messages_email ON messages (email);

-- Build keys (Tooling 189). itch.io download key links, imported in batches by `node tools/keys.mjs import`.
-- request_id is empty while a key is unused; his Approve click fills it and used_at in one statement.
CREATE TABLE IF NOT EXISTS build_keys (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  url        TEXT    NOT NULL UNIQUE,
  batch      TEXT    NOT NULL DEFAULT '',
  added_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  request_id INTEGER,
  used_at    TEXT
);
CREATE INDEX IF NOT EXISTS build_keys_unused ON build_keys (request_id, id);

-- One Approve link per request. Only the SHA-256 of the link's secret is kept, so a copy of the database cannot approve.
CREATE TABLE IF NOT EXISTS approvals (
  request_id INTEGER PRIMARY KEY,
  token_hash TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

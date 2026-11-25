-- The request-a-build store. One row per request; nothing else is kept.
CREATE TABLE IF NOT EXISTS build_requests (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  email      TEXT    NOT NULL,
  platform   TEXT    NOT NULL CHECK (platform IN ('windows', 'mac', 'linux')),
  note       TEXT    NOT NULL DEFAULT '',
  join_list  INTEGER NOT NULL DEFAULT 0,
  status     TEXT    NOT NULL DEFAULT 'new'   -- 'new', 'sent', 'declined': his to set
);
CREATE INDEX IF NOT EXISTS build_requests_email ON build_requests (email);

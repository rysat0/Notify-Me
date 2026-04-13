CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  claude_api_key TEXT NOT NULL DEFAULT '',
  elevenlabs_api_key TEXT DEFAULT '',
  model TEXT DEFAULT 'claude-sonnet-4-20250514',
  language TEXT DEFAULT 'en',
  summary_length TEXT DEFAULT 'medium',
  body_length TEXT DEFAULT 'standard',
  categories TEXT DEFAULT '["tech","ai"]',
  time_range INTEGER DEFAULT 24,
  sources TEXT DEFAULT '[]',
  schedule_time TEXT DEFAULT '0 8 * * *',
  inkbox_api_key TEXT DEFAULT '',
  inkbox_identity_handle TEXT DEFAULT 'notify-me',
  delivery_email TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS briefings (
  id TEXT PRIMARY KEY,
  summary TEXT,
  generated_at TEXT DEFAULT (datetime('now')),
  settings_snapshot TEXT
);

CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  body TEXT,
  source TEXT,
  source_url TEXT,
  category TEXT,
  language TEXT,
  published_at TEXT,
  fetched_at TEXT DEFAULT (datetime('now')),
  briefing_id TEXT REFERENCES briefings(id),
  is_follow_up INTEGER DEFAULT 0,
  related_article_ids TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  article_refs TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO settings (id, claude_api_key) VALUES (1, '');

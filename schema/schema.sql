-- D1 Schema: Oase Pikiran
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('mind','islam','philosophy','history','science','technology','world')),
  tags TEXT DEFAULT '[]',
  reading_time INTEGER DEFAULT 5,
  featured INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','review','published','rejected')),
  author TEXT DEFAULT 'Oase Pikiran Editorial',
  impact_score REAL DEFAULT 0,
  factuality_score REAL DEFAULT 0,
  depth_score REAL DEFAULT 0,
  readability_score REAL DEFAULT 0,
  sources TEXT DEFAULT '[]',
  review_notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  published_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_created ON articles(created_at DESC);

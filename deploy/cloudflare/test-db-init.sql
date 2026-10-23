-- Eternal Idle v198: NEW TEST DATABASE ONLY
-- Run exclusively against D1 database eternal-idle-v198-test-db.
-- Never run against the original ChatGPT Sites game database.
CREATE TABLE IF NOT EXISTS game_saves (
  owner TEXT PRIMARY KEY NOT NULL,
  payload TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS world_settings (
  id TEXT PRIMARY KEY NOT NULL,
  payload TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS gm_grant_receipts (
  id TEXT PRIMARY KEY NOT NULL,
  owner TEXT NOT NULL,
  character_id TEXT NOT NULL,
  command TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS game_accounts (
  owner TEXT PRIMARY KEY NOT NULL,
  username TEXT NOT NULL,
  salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  session_hash TEXT,
  session_until INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  blocked_until INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS equipment_catalog_backups (
  owner TEXT NOT NULL,
  catalog_version TEXT NOT NULL,
  payload TEXT NOT NULL,
  original_revision INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (owner, catalog_version)
);

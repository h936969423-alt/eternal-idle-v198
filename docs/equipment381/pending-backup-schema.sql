-- Preparation only. Apply during the validated catalog cutover, before migration routes are enabled.
CREATE TABLE IF NOT EXISTS equipment_catalog_backups (
 owner TEXT NOT NULL,
 catalog_version TEXT NOT NULL,
 payload TEXT NOT NULL,
 original_revision INTEGER NOT NULL,
 created_at INTEGER NOT NULL,
 PRIMARY KEY(owner,catalog_version)
);

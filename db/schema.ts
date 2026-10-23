import { integer, sqliteTable, text, primaryKey } from "drizzle-orm/sqlite-core";
export const saves = sqliteTable("game_saves", {
  owner: text("owner").primaryKey(),
  payload: text("payload").notNull(),
  revision: integer("revision").notNull().default(0),
  updatedAt: integer("updated_at").notNull(),
});

export const worldSettings = sqliteTable("world_settings", {
  id: text("id").primaryKey(),
  payload: text("payload").notNull(),
  revision: integer("revision").notNull().default(0),
  updatedAt: integer("updated_at").notNull(),
});

export const gmGrantReceipts = sqliteTable("gm_grant_receipts", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  characterId: text("character_id").notNull(),
  command: text("command").notNull(),
  message: text("message").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const gameAccounts=sqliteTable('game_accounts',{
 owner:text('owner').primaryKey(),username:text('username').notNull(),salt:text('salt').notNull(),passwordHash:text('password_hash').notNull(),sessionHash:text('session_hash'),sessionUntil:integer('session_until').notNull().default(0),failed:integer('failed').notNull().default(0),blockedUntil:integer('blocked_until').notNull().default(0),
});

export const equipmentCatalogBackups=sqliteTable('equipment_catalog_backups',{
 owner:text('owner').notNull(),catalogVersion:text('catalog_version').notNull(),payload:text('payload').notNull(),originalRevision:integer('original_revision').notNull(),createdAt:integer('created_at').notNull(),
},table=>[primaryKey({columns:[table.owner,table.catalogVersion]})]);

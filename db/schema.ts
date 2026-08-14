import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const tyovChronicles = sqliteTable("tyov_chronicles", {
  ownerId: text("owner_id").notNull(),
  chronicleId: text("chronicle_id").notNull().default("primary"),
  title: text("title").notNull().default("Unnamed Vampire"),
  data: text("data").notNull(),
  version: integer("version").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  primaryKey({ columns: [table.ownerId, table.chronicleId] }),
  index("idx_tyov_chronicles_owner_updated").on(table.ownerId, table.updatedAt),
]);

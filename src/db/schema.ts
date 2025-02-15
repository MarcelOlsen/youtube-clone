import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

// This will always be fired only by clerk, so we can throw the clerkId into here
export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  clerkId: text("clerk_id").unique().notNull(),
  name: text("name").notNull(),
  //TODO: add banner fields
  imageUrl: text("image_url").notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull()
}, (t) => [uniqueIndex("clerk_id_idx").on(t.clerkId)])

export const categories = pgTable("categories", {
  id: uuid().primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull()
}, (t) => [uniqueIndex("name_idx").on(t.name)])

export const videos = pgTable("videos", {
  id: uuid().primaryKey().defaultRandom(),
  title: text("tilte").notNull(),
  description: text("description"),
  userId: uuid("user_id").references(() => users.id, {
    onDelete: "cascade"
  }).notNull(),
  categoryId: uuid("category_id").references(() => categories.id),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull()
})

export const userRelations = relations(users, ({ many }) => ({
  videos: many(videos)
}))

export const categoryRelations = relations(categories, ({ many }) => ({
  videos: many(videos)
}))

export const videoRelations = relations(videos, ({ one }) => ({
  user: one(users, {
    fields: [videos.userId],
    references: [users.id]
  }),
  category: one(categories, {
    fields: [videos.categoryId],
    references: [categories.id]
  })
}))

import { relations } from "drizzle-orm";
import { integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";

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

export const videoVisibility = pgEnum("video_visibility", [
  "private",
  "public"
])

export const videos = pgTable("videos", {
  id: uuid().primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  muxStatus: text("mux_status"),
  muxAssetId: text("mux_asset_id").unique(),
  muxUploadId: text("mux_upload_id").unique(),
  muxPlaybackId: text("mux_playback_id").unique(),
  muxTrackId: text("mux_track_id").unique(),
  muxTrackStatus: text("mux_track_status"),
  thumbnailUrl: text("thumbnail_url"),
  previewUrl: text("preview_url"),
  duration: integer("duration").default(0).notNull(),
  visibility: videoVisibility("visibility").default("private").notNull(),
  userId: uuid("user_id").references(() => users.id, {
    onDelete: "cascade"
  }).notNull(),
  categoryId: uuid("category_id").references(() => categories.id),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull()
})

export const videoInsertSchema = createInsertSchema(videos)
export const videoUpdateSchema = createUpdateSchema(videos)
export const videoSelectSchema = createSelectSchema(videos)

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

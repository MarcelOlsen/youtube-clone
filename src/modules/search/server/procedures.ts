import { z } from "zod";

import { and, desc, eq, getTableColumns, ilike, lt, or } from "drizzle-orm";

import { db } from "@/db";
import { users, videoReactions, videos, videoViews } from "@/db/schema";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";

export const searchRouter = createTRPCRouter({
  getMany: baseProcedure
    .input(z.object({
      query: z.string().nullish(),
      categoryId: z.string().uuid().nullish(),
      cursor: z.object({
        id: z.string().uuid(),
        updatedAt: z.date(),
      }).nullish(),
      limit: z.number().min(1).max(100),
    }))
    .query(async ({ input }) => {
      const { cursor, limit, query, categoryId } = input

      const data = await db
        .select({
          ...getTableColumns(videos),
          viewCount: db.$count(videoViews, eq(videoViews.videoId, videos.id)),
          likeCount: db.$count(videoReactions,
            and(
              eq(videoReactions.videoId, videos.id),
              eq(videoReactions.type, "like")
            )
          ),
          dislikeCount: db.$count(videoReactions,
            and(
              eq(videoReactions.videoId, videos.id),
              eq(videoReactions.type, "dislike")
            )
          ),
          user: users
        }
        )
        .from(videos)
        .innerJoin(users, eq(videos.userId, users.id))
        .where(
          and(
            ilike(videos.title, `%${query}%`),
            categoryId ? eq(videos.categoryId, categoryId) : undefined,
            cursor ? or(
              lt(videos.updatedAt, cursor.updatedAt),
              and(
                eq(videos.updatedAt, cursor.updatedAt),
                lt(videos.id, cursor.id)
              )
            ) : undefined
          )
        )
        .orderBy(desc(videos.updatedAt), desc(videos.id))
        .limit(limit + 1) // Checking if there's another video, to know if there's more data to fetch

      const hasMore = data.length > limit;

      // Removing the extra item, which we used to check if there's more data available
      const items = hasMore ? data.slice(0, -1) : data

      // The next cursor needs to be set to the "real" last item
      const lastItem = items[items.length - 1]
      const nextCursor = hasMore ? {
        id: lastItem.id,
        updatedAt: lastItem.updatedAt
      } : null

      return {
        items,
        nextCursor
      };
    })
})

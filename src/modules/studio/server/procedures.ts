import { z } from "zod";

import { and, desc, eq, lt, or } from "drizzle-orm";

import { db } from "@/db";
import { videos } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const studioRouter = createTRPCRouter({
  getMany: protectedProcedure
    .input(z.object({
      cursor: z.object({
        id: z.string().uuid(),
        updatedAt: z.date(),
      }).nullish(),
      limit: z.number().min(1).max(100),
    }))
    .query(async ({ ctx, input }) => {
      const { cursor, limit } = input
      const { user: { id: userId } } = ctx

      const data = await db
        .select()
        .from(videos)
        .where(and(
          eq(videos.userId, userId),
          cursor ? or(
            lt(videos.updatedAt, cursor.updatedAt),
            and(
              eq(videos.updatedAt, cursor.updatedAt),
              lt(videos.id, cursor.id)
            )
          ) : undefined
        ))
        .orderBy(desc(videos.updatedAt), desc(videos.id))
        .limit(limit + 1) // Checking if there's another video, to know if there's more data to fetch

      const hasMore = data.length > limit;
      // Removing the extra item, which we used to check if there's more data available

      const items = hasMore ? data.slice(0, -1) : data

      // The next cursor needs to be s4et to the "real" last item
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

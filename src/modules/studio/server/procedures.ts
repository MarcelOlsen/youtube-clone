import { z } from "zod";

import { and, desc, eq, lt, or } from "drizzle-orm";

import { db } from "@/db";
import { videos } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";

export const studioRouter = createTRPCRouter({
  getOne: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;
      const { id } = input

      const [video] = await db
        .select()
        .from(videos)
        .where(and(
          eq(videos.id, id),
          eq(videos.userId, userId)
        ))

      if (!video) throw new TRPCError({
        code: "NOT_FOUND",
        message: "Video not found"
      })

      return video
    }),
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

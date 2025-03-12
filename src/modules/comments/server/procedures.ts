import { and, count, desc, eq, getTableColumns, lt, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { comments, users } from "@/db/schema";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";

export const commentsRouter = createTRPCRouter({
  remove: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id: userId } = ctx.user;
      const { id } = input;

      const [deletedComment] = await db
        .delete(comments)
        .where(
          and(
            eq(comments.userId, userId),
            eq(comments.id, id)
          ))
        .returning()

      if (!deletedComment)
        throw new TRPCError({ code: "NOT_FOUND" });

      return deletedComment;
    }),
  create: protectedProcedure
    .input(z.object({
      videoId: z.string().uuid(),
      value: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      const { id: userId } = ctx.user;
      const { videoId, value } = input;

      const [createdComment] = await db
        .insert(comments)
        .values({ userId, videoId, value })
        .returning()

      return createdComment;
    }),
  getMany: baseProcedure
    .input(z.object({
      videoId: z.string().uuid(),
      cursor: z.object({
        id: z.string().uuid(),
        updatedAt: z.date()
      }).nullish(),
      limit: z.number().min(1).max(100)
    }))
    .query(async ({ input }) => {
      const { cursor, videoId, limit } = input;

      const [[totalCount], data] = await Promise.all([
        db
          .select({
            count: count()
          })
          .from(comments)
          .where(
            eq(comments.videoId, videoId)
          ),
        db
          .select({
            ...getTableColumns(comments),
            user: users,
          })
          .from(comments)
          .where(
            and(
              eq(comments.videoId, videoId),
              cursor
                ? or(
                  lt(comments.updatedAt, cursor.updatedAt),
                  and(
                    eq(comments.updatedAt, cursor.updatedAt),
                    lt(comments.id, cursor.id)
                  )
                ) : undefined
            )
          )
          .innerJoin(users, eq(comments.userId, users.id))
          .orderBy(desc(comments.updatedAt), desc(comments.id))
          .limit(limit + 1)
      ])

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
        nextCursor,
        totalCount: totalCount.count,
      };
    })
})

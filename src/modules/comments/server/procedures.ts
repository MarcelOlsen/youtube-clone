import { and, count, desc, eq, getTableColumns, inArray, isNotNull, isNull, lt, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { commentReactions, comments, users } from "@/db/schema";
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
      value: z.string(),
      parentId: z.string().uuid().nullish()
    }))
    .mutation(async ({ input, ctx }) => {
      const { id: userId } = ctx.user;
      const { parentId, videoId, value } = input;

      const [existingComment] = await db
        .select()
        .from(comments)
        .where(inArray(comments.id, parentId ? [parentId] : []))

      if (!existingComment && parentId) throw new TRPCError({ code: "NOT_FOUND" });

      if (parentId && existingComment.parentId) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      const [createdComment] = await db
        .insert(comments)
        .values({ userId, videoId, parentId, value })
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
      limit: z.number().min(1).max(100),
      parentId: z.string().uuid().nullish()
    }))
    .query(async ({ ctx, input }) => {
      const { clerkUserId } = ctx;
      const { cursor, videoId, limit, parentId } = input;

      let userId;

      const [user] = await db
        .select()
        .from(users)
        .where(
          inArray(users.clerkId, clerkUserId ? [clerkUserId] : [])
        )

      if (user) userId = user.id

      const viewerReactions = db.$with("viewer_reactions").as(
        db
          .select({
            commentId: commentReactions.commentId,
            type: commentReactions.type
          })
          .from(commentReactions)
          .where(inArray(commentReactions.userId, userId ? [userId] : []))
      )

      const replies = db.$with("replies").as(
        db
          .select({
            parentId: comments.parentId,
            count: count(comments.id).as("count")
          })
          .from(comments)
          .where(isNotNull(comments.parentId))
          .groupBy(comments.parentId)
      )

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
          .with(viewerReactions, replies)
          .select({
            ...getTableColumns(comments),
            user: users,
            viewerReaction: viewerReactions.type,
            likeCount: db.$count(
              commentReactions,
              and(
                eq(commentReactions.type, "like"),
                eq(commentReactions.commentId, comments.id)
              )
            ),
            dislikeCount: db.$count(
              commentReactions,
              and(
                eq(commentReactions.type, "dislike"),
                eq(commentReactions.commentId, comments.id)
              )
            ),
            replyCount: replies.count
          })
          .from(comments)
          .where(
            and(
              eq(comments.videoId, videoId),
              parentId ?
                eq(comments.parentId, parentId) :
                isNull(comments.parentId),
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
          .leftJoin(viewerReactions, eq(viewerReactions.commentId, comments.id))
          .leftJoin(replies, eq(replies.parentId, comments.id))
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

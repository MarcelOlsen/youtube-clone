import { TRPCError } from "@trpc/server";
import { and, desc, eq, getTableColumns, lt, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { subscriptions, users } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const subscriptionsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const { userId } = input;

      if (userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST" });

      const [subscription] = await db
        .insert(subscriptions)
        .values({ viewerId: ctx.user.id, creatorId: userId })
        .returning()

      return subscription
    }),
  remove: protectedProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const { userId } = input;

      if (userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST" });

      const [deletedSubscription] = await db
        .delete(subscriptions)
        .where(
          and(
            eq(subscriptions.viewerId, ctx.user.id),
            eq(subscriptions.creatorId, userId)
          )
        )
        .returning()

      return deletedSubscription
    }),
  getMany: protectedProcedure
    .input(z.object({
      cursor: z.object({
        creatorId: z.string().uuid(),
        updatedAt: z.date(),
      }).nullish(),
      limit: z.number().min(1).max(100),
    }))
    .query(async ({ input, ctx }) => {
      const { cursor, limit } = input
      const { id: userId } = ctx.user;

      const data = await db
        .select({
          ...getTableColumns(subscriptions),
          user: {
            ...getTableColumns(users),
            subscriberCount: db.$count(subscriptions, eq(subscriptions.creatorId, users.id)),
          },
        }
        )
        .from(subscriptions)
        .innerJoin(users, eq(subscriptions.creatorId, users.id))
        .where(
          and(
            eq(subscriptions.viewerId, userId),
            cursor ? or(
              lt(subscriptions.updatedAt, cursor.updatedAt),
              and(
                eq(subscriptions.updatedAt, cursor.updatedAt),
                lt(subscriptions.creatorId, cursor.creatorId)
              )
            ) : undefined
          )
        )
        .orderBy(desc(subscriptions.updatedAt), desc(subscriptions.creatorId))
        .limit(limit + 1) // Checking if there's another video, to know if there's more data to fetch

      const hasMore = data.length > limit;

      // Removing the extra item, which we used to check if there's more data available
      const items = hasMore ? data.slice(0, -1) : data

      // The next cursor needs to be set to the "real" last item
      const lastItem = items[items.length - 1]
      const nextCursor = hasMore ? {
        creatorId: lastItem.creatorId,
        updatedAt: lastItem.updatedAt
      } : null

      return {
        items,
        nextCursor
      };
    }),
})

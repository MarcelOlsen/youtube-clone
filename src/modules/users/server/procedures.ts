import { eq, getTableColumns, inArray, isNotNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { subscriptions, users, videos } from "@/db/schema";
import { TRPCError } from "@trpc/server";

export const usersRouter = createTRPCRouter({
  getOne: baseProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { clerkUserId } = ctx;

      let userId;

      const [user] = await db
        .select()
        .from(users)
        .where(inArray(users.clerkId, clerkUserId ? [clerkUserId] : []))

      if (user) userId = user.id;

      const viewerSubscriptions = db.$with("viewer_subscriptions").as(
        db
          .select()
          .from(subscriptions)
          .where(inArray(subscriptions.viewerId, userId ? [userId] : []))
      )

      const [existingUser] = await db
        .with(viewerSubscriptions)
        .select({
          ...getTableColumns(users),
          viewerSubscribed: isNotNull(viewerSubscriptions.viewerId).mapWith(Boolean),
          videoCount: db.$count(videos, eq(videos.userId, user.id)),
          subscriberCount: db.$count(subscriptions, eq(subscriptions.creatorId, user.id))
        })
        .from(users)
        .leftJoin(viewerSubscriptions, eq(viewerSubscriptions.creatorId, users.id))
        .where(eq(users.id, input.id))

      if (!existingUser) throw new TRPCError({ code: "NOT_FOUND" });

      return existingUser;
    }),
})

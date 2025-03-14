import { and, desc, eq, getTableColumns, inArray, isNotNull, lt, or } from "drizzle-orm";
import { UTApi } from "uploadthing/server";
import { z } from "zod";

import { db } from "@/db";
import { subscriptions, users, videoReactions, videos, videoUpdateSchema, videoViews } from "@/db/schema";
import { mux } from "@/lib/mux";
import { workflow } from "@/lib/workflow";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";

export const videosRouter = createTRPCRouter({
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

      const viewerReactions = db.$with("video_reactions").as(
        db
          .select({
            videoId: videoReactions.videoId,
            type: videoReactions.type
          })
          .from(videoReactions)
          .where(inArray(videoReactions.userId, userId ? [userId] : []))
      )

      const viewerSubscriptions = db.$with("viewer_subscriptions").as(
        db
          .select()
          .from(subscriptions)
          .where(inArray(subscriptions.viewerId, userId ? [userId] : []))
      )

      const [existingVideo] = await db
        .with(viewerReactions, viewerSubscriptions)
        .select({
          ...getTableColumns(videos),
          user: {
            ...getTableColumns(users),
            viewerSubscribed: isNotNull(viewerSubscriptions.viewerId).mapWith(Boolean),
            subscriberCount: db.$count(subscriptions, eq(subscriptions.creatorId, users.id)).mapWith(Number),
          },
          viewCount: db.$count(videoViews, eq(videoViews.videoId, videos.id)),
          likeCount: db.$count(
            videoReactions,
            and(
              eq(videoReactions.videoId, videos.id),
              eq(videoReactions.type, "like")
            )
          ),
          dislikeCount: db.$count(
            videoReactions,
            and(
              eq(videoReactions.videoId, videos.id),
              eq(videoReactions.type, "dislike")
            )
          ),
          viewerReaction: viewerReactions.type
        })
        .from(videos)
        .innerJoin(users, eq(users.id, videos.userId))
        .leftJoin(viewerReactions, eq(viewerReactions.videoId, videos.id))
        .leftJoin(viewerSubscriptions, eq(viewerSubscriptions.creatorId, users.id))
        .where(eq(videos.id, input.id))

      if (!existingVideo) throw new TRPCError({ code: "NOT_FOUND" });

      return existingVideo;
    }),
  getMany: baseProcedure
    .input(z.object({
      categoryId: z.string().uuid().nullish(),
      cursor: z.object({
        id: z.string().uuid(),
        updatedAt: z.date(),
      }).nullish(),
      limit: z.number().min(1).max(100),
    }))
    .query(async ({ input }) => {
      const { cursor, limit, categoryId } = input

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
            eq(videos.visibility, "public"),
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
    }),
  getManyTrending: baseProcedure
    .input(z.object({
      cursor: z.object({
        id: z.string().uuid(),
        viewCount: z.number(),
      }).nullish(),
      limit: z.number().min(1).max(100),
    }))
    .query(async ({ input }) => {
      const { cursor, limit } = input

      const viewCountSubquery = db.$count(
        videoViews,
        eq(videoViews.videoId, videos.id)
      )

      const data = await db
        .select({
          ...getTableColumns(videos),
          viewCount: viewCountSubquery,
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
            eq(videos.visibility, "public"),
            cursor ? or(
              lt(viewCountSubquery, cursor.viewCount),
              and(
                eq(viewCountSubquery, cursor.viewCount),
                lt(videos.id, cursor.id)
              )
            ) : undefined
          )
        )
        .orderBy(desc(viewCountSubquery), desc(videos.id))
        .limit(limit + 1) // Checking if there's another video, to know if there's more data to fetch

      const hasMore = data.length > limit;

      // Removing the extra item, which we used to check if there's more data available
      const items = hasMore ? data.slice(0, -1) : data

      // The next cursor needs to be set to the "real" last item
      const lastItem = items[items.length - 1]
      const nextCursor = hasMore ? {
        id: lastItem.id,
        viewCount: lastItem.viewCount
      } : null

      return {
        items,
        nextCursor
      };
    }),
      return {
        items,
        nextCursor
      };
    }),
  generateDescription: protectedProcedure
    .input(z.object({
      id: z.string().uuid()
    }))
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      const { workflowRunId } = await workflow.trigger({
        url: `${process.env.UPSTASH_WORKFLOW_URL}/api/videos/workflows/description`,
        body: { userId, videoId: input.id }
      })

      return workflowRunId;
    }),
  generateTitle: protectedProcedure
    .input(z.object({
      id: z.string().uuid()
    }))
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      const { workflowRunId } = await workflow.trigger({
        url: `${process.env.UPSTASH_WORKFLOW_URL}/api/videos/workflows/title`,
        body: { userId, videoId: input.id }
      })

      return workflowRunId;
    }),
  generateThumbnail: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      prompt: z.string().min(10)
    }))
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      const { workflowRunId } = await workflow.trigger({
        url: `${process.env.UPSTASH_WORKFLOW_URL}/api/videos/workflows/thumbnail`,
        body: { userId, videoId: input.id, prompt: input.prompt }
      })

      return workflowRunId;
    }),
  restoreThumbnail: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      const [existingVideo] = await db
        .select()
        .from(videos)
        .where(and(
          eq(videos.id, input.id),
          eq(videos.userId, userId)
        ))

      if (!existingVideo) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Video not found or unauthorized"
        });
      }

      if (existingVideo.thumbnailKey) {
        const utapi = new UTApi()
        await utapi.deleteFiles(existingVideo.thumbnailKey)
        await db
          .update(videos)
          .set({ thumbnailKey: null, thumbnailUrl: null })
          .where(and(
            eq(videos.id, input.id),
            eq(videos.userId, userId)
          ));
      }

      if (!existingVideo.muxPlaybackId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Video has no playback ID"
        });
      }

      const tempThumbnailUrl = `https://image.mux.com/${existingVideo.muxPlaybackId}/thumbnail.jpg`;

      const utapi = new UTApi()
      const uploadedThumbnail = await utapi.uploadFilesFromUrl(tempThumbnailUrl)

      if (!uploadedThumbnail.data) throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to upload thumbnail"
      })

      const { key: thumbnailKey, ufsUrl: thumbnailUrl } = uploadedThumbnail.data

      const [updatedVideo] = await db
        .update(videos)
        .set({ thumbnailUrl, thumbnailKey })
        .where(and(
          eq(videos.id, input.id),
          eq(videos.userId, userId)
        ))
        .returning()

      return updatedVideo;
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      const [removedVideo] = await db
        .delete(videos)
        .where(and(
          eq(videos.id, input.id),
          eq(videos.userId, userId)
        ))
        .returning()

      if (!removedVideo) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Video not found or unauthorized"
        });
      }

      return removedVideo;
    }),
  update: protectedProcedure
    .input(videoUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { user: { id: userId } } = ctx;

      if (!input.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Video ID is required"
        });
      }

      const [updatedVideo] = await db
        .update(videos)
        .set({
          title: input.title,
          description: input.description,
          categoryId: input.categoryId,
          visibility: input.visibility,
          updatedAt: new Date(),
        })
        .where(and(
          eq(videos.id, input.id),
          eq(videos.userId, userId)
        ))
        .returning()

      if (!updatedVideo) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Video not found or unauthorized"
        });
      }

      return updatedVideo;
    }),
  create: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { user: { id: userId } } = ctx;

      const upload = await mux.video.uploads.create({
        new_asset_settings: {
          passthrough: userId,
          playback_policy: ["public"],
          input: [
            {
              generated_subtitles: [
                {
                  language_code: "en",
                  name: "English"
                }
              ]
            }
          ]
        },
        cors_origin: "*" //TODO: SET TO PROPER DOMAIN IN PRODUCTION
      })

      const [video] = await db
        .insert(videos)
        .values({
          userId,
          title: "Untitled",
          muxStatus: "waiting",
          muxUploadId: upload.id,
        })
        .returning()

      return {
        video,
        url: upload.url
      }
    }),
  revalidate: protectedProcedure
    .input(z.object({
      id: z.string().uuid()
    }))
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user

      const [existingVideo] = await db
        .select()
        .from(videos)
        .where(
          and(
            eq(videos.id, input.id),
            eq(videos.userId, userId)
          )
        )

      if (!existingVideo) throw new TRPCError({ code: "NOT_FOUND" });

      if (!existingVideo.muxUploadId) throw new TRPCError({ code: "BAD_REQUEST" });

      const directUpload = await mux.video.uploads.retrieve(
        existingVideo.muxUploadId
      )

      if (!directUpload || !directUpload.asset_id) throw new TRPCError({ code: "BAD_REQUEST" });

      const asset = await mux.video.assets.retrieve(
        directUpload.asset_id
      )

      if (!asset) throw new TRPCError({ code: "BAD_REQUEST" });

      const playbackId = asset.playback_ids?.[0].id
      const duration = asset.duration ? Math.round(asset.duration * 1000) : 0

      const [updatedVideo] = await db
        .update(videos)
        .set({
          muxStatus: asset.status,
          muxPlaybackId: playbackId,
          muxAssetId: asset.id,
          duration
        })
        .where(
          and(
            eq(videos.id, input.id),
            eq(videos.userId, userId)
          )
        )
        .returning()

      return updatedVideo
    })
})

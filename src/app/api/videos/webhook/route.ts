import {
  VideoAssetCreatedWebhookEvent,
  VideoAssetErroredWebhookEvent,
  VideoAssetReadyWebhookEvent,
  VideoAssetTrackReadyWebhookEvent
} from "@mux/mux-node/resources/webhooks";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { db } from "@/db";
import { videos } from "@/db/schema";
import { mux } from "@/lib/mux";

const SIGNING_SECRET = process.env.MUX_WEBHOOK_SECRET;

type WebhookEvent =
  | VideoAssetCreatedWebhookEvent
  | VideoAssetErroredWebhookEvent
  | VideoAssetReadyWebhookEvent
  | VideoAssetTrackReadyWebhookEvent;

export const POST = async (request: Request) => {
  if (!SIGNING_SECRET) {
    return new Error("MYX_WEBHOOK_SECRET is not set");
  }

  const headersPayload = await headers();
  const muxSignature = headersPayload.get("Mux-Signature");

  if (!muxSignature) {
    return new Response("No signature found", { status: 401 });
  }

  const payload = await request.json();
  const body = JSON.stringify(payload)

  mux.webhooks.verifySignature(
    body,
    {
      "mux-signature": muxSignature
    },
    SIGNING_SECRET
  );

  switch (payload.type as WebhookEvent["type"]) {
    case "video.asset.created": {
      const data = payload.data as VideoAssetCreatedWebhookEvent["data"];

      if (!data.upload_id) return new Response("No upload ID found", { status: 400 });

      await db
        .update(videos)
        .set({
          muxAssetId: data.id,
          muxStatus: data.status,
        })
        .where(eq(videos.muxUploadId, data.upload_id))

      break
    }
  }

  return new Response("Webhook received", { status: 200 });
}

import { db } from "@/db";
import { videos } from "@/db/schema";
import { serve } from "@upstash/workflow/nextjs";
import { and, eq } from "drizzle-orm";

interface InputType {
  userId: string;
  videoId: string;
}

const TITLE_SYSTEM_PROMPT = `Your task is to generate an SEO-focused title for a YouTube video based on its transcript. Please follow these guidelines:
- Be concise but descriptive, using relevant keywords to improve discoverability.
- Highlight the most compelling or unique aspect of the video content.
- Avoid jargon or overly complex language unless it directly supports searchability.
- Use action-oriented phrasing or clear value propositions where applicable.
- Ensure the title is 3-8 words long and no more than 100 characters.
- ONLY return the title as plain text. Do not add quotes or any additional formatting.`;

const DESCRIPTION_SYSTEM_PROMPT = `Your task is to summarize the transcript of a video. Please follow these guidelines:
- Be brief. Condense the content into a summary that captures the key points and main ideas without losing important details.
- Avoid jargon or overly complex language unless necessary for the context.
- Focus on the most critical information, ignoring filler, repetitive statements, or irrelevant tangents.
- ONLY return the summary, no other text, annotations, or comments.
- Aim for a summary that is 3-5 sentences long and no more than 200 characters.`;

export const { POST } = serve(
  async (context) => {
    const input = context.requestPayload as InputType;
    const { videoId, userId } = input;

    const video = await context.run("get-video", async () => {
      const [existingVideo] = await db
        .select()
        .from(videos)
        .where(and(
          eq(videos.id, videoId),
          eq(videos.userId, userId)
        ))

      if (!existingVideo) {
        throw new Error("Video not found")
      }

      return existingVideo
    })

    const transcript = await context.run("get-transcript", async () => {
      const trackUrl = `https://stream.mux.com/${video.muxPlaybackId}/text/${video.muxTrackId}.txt`
      const response = await fetch(trackUrl)
      const text = response.text()

      if (!text) {
        throw new Error("Bad request")
      }

      return text
    })

    const { body } = await context.api.openai.call(
      "Generate title",
      {
        // baseURL: "https://api.deepseek.com", TODO: migrate to deepseek once you can top up
        token: process.env.OPENAI_API_KEY!,
        operation: "chat.completions.create",
        body: {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: TITLE_SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: transcript
            }
          ],
        },
      }
    );

    const title = body.choices[0].message.content;

    await context.run("update-video", async () => {
      await db
        .update(videos)
        .set({ title: title || video.title })
        .where(and(
          eq(videos.id, videoId),
          eq(videos.userId, video.userId)
        ))
    })
  }
)

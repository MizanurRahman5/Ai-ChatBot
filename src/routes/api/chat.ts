import { createFileRoute } from "@tanstack/react-router";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { buildInstructions } from "@/lib/server/prompt";

function friendlyError(error: unknown): string {
  const e = error as { statusCode?: number; message?: string };
  const status = e?.statusCode;
  if (status === 429) return "Too many requests right now. Please wait a moment and try again.";
  if (status === 401) return "The Gemini API key is missing or invalid on the server.";
  return e?.message ? `AI error: ${e.message}` : "Something went wrong while generating the answer.";
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"] || process.env["GEMINI_API_KEY"];
        if (!apiKey) {
          return Response.json({ error: "Server is missing GEMINI_API_KEY / LOVABLE_API_KEY." }, { status: 500 });
        }

        let body: { messages?: UIMessage[]; context?: { source: string; text: string }[] };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid request body." }, { status: 400 });
        }

        const messages = Array.isArray(body.messages) ? body.messages : [];
        if (!messages.length) return Response.json({ error: "No messages sent." }, { status: 400 });

        const context = (Array.isArray(body.context) ? body.context : [])
          .slice(0, 8)
          .map((c) => ({ source: String(c.source).slice(0, 200), text: String(c.text).slice(0, 2500) }));

        // Gemini AI Setup
        const google = createGoogleGenerativeAI({
          apiKey,
        });

        const result = streamText({
  model: google("gemini-3.5-flash-lite"), // দ্রুততম ও হালকা মডেল
  instructions: buildInstructions(context),
  messages: await convertToModelMessages(messages),
  abortSignal: request.signal,
});

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onError: friendlyError,
        });
      },
    },
  },
});
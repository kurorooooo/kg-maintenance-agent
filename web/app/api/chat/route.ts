import { NextRequest } from "next/server";
import { AGENT_URL, APP_NAME, agentAuthHeaders, ensureSession } from "@/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Relay one question to the ADK agent and stream its SSE events back unchanged. */
export async function POST(req: NextRequest) {
  const { userId, sessionId, text } = (await req.json()) as { userId?: string; sessionId?: string; text?: string };
  if (!userId || !sessionId || !text?.trim()) return Response.json({ error: "userId, sessionId and text are required" }, { status: 400 });

  let headers: Record<string, string>;
  try {
    headers = await agentAuthHeaders();
    await ensureSession(userId, sessionId, headers);
  } catch (e) {
    return Response.json({ error: `agent unreachable: ${(e as Error).message}` }, { status: 502 });
  }

  const upstream = await fetch(`${AGENT_URL}/run_sse`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream", ...headers },
    body: JSON.stringify({
      appName: APP_NAME,
      userId,
      sessionId,
      newMessage: { role: "user", parts: [{ text }] },
      streaming: true,
    }),
    signal: req.signal,
  });
  if (!upstream.ok || !upstream.body) {
    return Response.json({ error: `agent returned ${upstream.status}: ${(await upstream.text()).slice(0, 300)}` }, { status: 502 });
  }
  return new Response(upstream.body, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" },
  });
}

import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type ChatRequestBody = {
  messages: ChatMessage[];
  baseUrl: string;
  apiKey?: string;
  model: string;
  temperature?: number;
  max_tokens?: number;
};

function normalizeBaseUrl(raw: string): string {
  let url = (raw || "").trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(url)) url = "http://" + url;
  return url;
}

export async function POST(req: NextRequest) {
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const { messages, baseUrl, apiKey, model, temperature = 0.9, max_tokens } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("messages required", { status: 400 });
  }
  if (!model || !model.trim()) {
    return new Response("model required", { status: 400 });
  }

  const endpoint = `${normalizeBaseUrl(baseUrl)}/chat/completions`;

  let upstream: Response;
  try {
    upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // API key is optional for many local OpenAI-compatible servers.
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: model.trim(),
        messages,
        stream: true,
        temperature,
        ...(typeof max_tokens === "number" ? { max_tokens } : {}),
      }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return new Response(
      JSON.stringify({ error: `Failed to reach ${endpoint}: ${msg}` }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return new Response(
      JSON.stringify({
        error: `Upstream error ${upstream.status}: ${text.slice(0, 500)}`,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  // Re-stream the upstream SSE chunks straight to the client.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

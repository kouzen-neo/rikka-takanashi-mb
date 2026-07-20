import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { baseUrl: string; apiKey?: string };

function normalizeBaseUrl(raw: string): string {
  let url = (raw || "").trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(url)) url = "http://" + url;
  return url;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const baseUrl = normalizeBaseUrl(body.baseUrl || "");
  if (!baseUrl) {
    return new Response(JSON.stringify({ error: "baseUrl required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}/models`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(body.apiKey ? { Authorization: `Bearer ${body.apiKey}` } : {}),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return new Response(
      JSON.stringify({ error: `Failed to reach ${baseUrl}/models: ${msg}` }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return new Response(
      JSON.stringify({
        error: `Upstream error ${upstream.status}: ${text.slice(0, 400)}`,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  const json = await upstream.json().catch(() => null);
  const models: string[] = Array.isArray(json?.data)
    ? json.data
        .map((m: { id?: string }) => m.id)
        .filter((id: unknown): id is string => typeof id === "string")
    : [];

  return new Response(JSON.stringify({ models }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

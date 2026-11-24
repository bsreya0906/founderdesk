import { NextRequest, NextResponse } from "next/server";
import { demoHandle } from "@/lib/demo";

export const dynamic = "force-dynamic";

// Server-side proxy: forwards dashboard requests to the Express API with the secret key.
// With no BACKEND_URL set, it serves built-in demo data instead (used for the Netlify demo).
async function handler(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const base = process.env.BACKEND_URL;
  const key = process.env.API_KEY;
  const hasBody = !["GET", "HEAD"].includes(req.method);

  if (!base) {
    let body: unknown;
    if (hasBody) body = await req.json().catch(() => undefined);
    const r = demoHandle(req.method, path, req.nextUrl.searchParams, body);
    return NextResponse.json(r.body, { status: r.status });
  }
  if (!key) return NextResponse.json({ error: "Proxy not configured" }, { status: 500 });

  const url = `${base}/api/${path.join("/")}${req.nextUrl.search}`;
  const upstream = await fetch(url, {
    method: req.method,
    headers: { "content-type": "application/json", "x-api-key": key },
    body: hasBody ? await req.text() : undefined,
    cache: "no-store",
  });
  return new NextResponse(await upstream.text(), {
    status: upstream.status,
    headers: { "content-type": "application/json" },
  });
}
export { handler as GET, handler as POST, handler as PATCH };

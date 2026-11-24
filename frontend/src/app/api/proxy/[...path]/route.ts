import { NextRequest, NextResponse } from "next/server";

// Server-side proxy: forwards dashboard requests to the Express API with the secret key.
async function handler(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const base = process.env.BACKEND_URL;
  const key = process.env.API_KEY;
  if (!base || !key) return NextResponse.json({ error: "Proxy not configured" }, { status: 500 });

  const url = `${base}/api/${path.join("/")}${req.nextUrl.search}`;
  const hasBody = !["GET", "HEAD"].includes(req.method);
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

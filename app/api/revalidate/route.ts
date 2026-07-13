import { revalidateTag } from "next/cache";

const ALLOWED = new Set(["shop", "content"]);

/** Called by the FastAPI backend after admin writes. Marks the cached SSR data
 * ("shop"/"content" tags, 60s revalidate) stale so the NEXT request rebuilds it
 * from fresh data instead of waiting out the window — it does not refresh any
 * in-flight render. Guarded by the shared REVALIDATE_SECRET. */
export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || req.headers.get("x-revalidate-secret") !== secret) {
    return new Response("forbidden", { status: 403 });
  }
  let tags: unknown;
  try {
    tags = (await req.json()).tags;
  } catch {
    return new Response("bad request", { status: 400 });
  }
  const applied = (Array.isArray(tags) ? tags : []).map(String).filter((t) => ALLOWED.has(t));
  for (const tag of applied) revalidateTag(tag, "max");
  return Response.json({ ok: true, revalidated: applied });
}

// POST /api/scan?s=sam        -> records a scan
// POST /api/scan?s=sam&e=click -> records a tap through to Google
//
// Counts only. No IP, no user agent, no cookie, nothing that identifies a customer.

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  const slug = (url.searchParams.get("s") || "unknown").toLowerCase().slice(0, 24);
  const event = url.searchParams.get("e") === "click" ? "click" : "scan";

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return new Response("bad slug", { status: 400 });
  }

  // Europe/Paris day bucket, so a shift lands in the right column
  const day = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
  const key = `${event}:${slug}:${day}`;

  try {
    const current = parseInt((await env.REVIEWS.get(key)) || "0", 10);
    await env.REVIEWS.put(key, String(current + 1));
  } catch (err) {
    // Never let counting break the customer's journey
    return new Response(null, { status: 204 });
  }

  return new Response(null, { status: 204 });
}

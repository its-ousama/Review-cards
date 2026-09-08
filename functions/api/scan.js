// POST /api/scan?s=sam                        -> records a scan
// POST /api/scan?s=sam&e=click&p=google&r=5   -> records a tap through, the
//                                                site chosen, and the star
//                                                the customer tapped
//
// Counts only. No IP, no user agent, no cookie, nothing that identifies a
// customer. The star is stored as a histogram bucket per day, never
// alongside anything that could tie it back to one person — and nothing
// downstream branches on it. See README, "Things not to change".
//
// Keys
//   scan:<slug>:<day>
//   click:<slug>:<day>:<platform>
//   stars:<slug>:<day>:<n>

const SLUG = /^[a-z0-9-]+$/;

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);

  const slug = (url.searchParams.get("s") || "unknown").toLowerCase().slice(0, 24);
  if (!SLUG.test(slug)) return new Response("bad slug", { status: 400 });

  const event = url.searchParams.get("e") === "click" ? "click" : "scan";

  const rawPlatform = (url.searchParams.get("p") || "").toLowerCase().slice(0, 16);
  const platform = SLUG.test(rawPlatform) ? rawPlatform : "unknown";

  const rawStars = parseInt(url.searchParams.get("r") || "", 10);
  const stars = rawStars >= 1 && rawStars <= 5 ? rawStars : null;

  // Europe/Paris day bucket, so a shift lands in the right column
  const day = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });

  const keys = [
    event === "click" ? `click:${slug}:${day}:${platform}` : `scan:${slug}:${day}`
  ];
  if (event === "click" && stars) keys.push(`stars:${slug}:${day}:${stars}`);

  try {
    await Promise.all(keys.map((key) => bump(env.REVIEWS, key)));
  } catch {
    // Never let counting break the customer's journey
    return new Response(null, { status: 204 });
  }

  return new Response(null, { status: 204 });
}

async function bump(kv, key) {
  const current = parseInt((await kv.get(key)) || "0", 10);
  await kv.put(key, String(current + 1));
}

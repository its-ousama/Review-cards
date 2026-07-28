// GET /api/stats?key=YOUR_SECRET
// Returns per-day scan and click counts, plus the click-through rate.

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);

  if (!env.STATS_KEY || url.searchParams.get("key") !== env.STATS_KEY) {
    return new Response("nope", { status: 401 });
  }

  const days = {};
  let cursor;

  do {
    const list = await env.REVIEWS.list({ cursor });
    for (const { name } of list.keys) {
      const [event, slug, day] = name.split(":");
      if (!day) continue;
      days[day] ??= {};
      days[day][slug] ??= { scans: 0, clicks: 0 };
      const value = parseInt((await env.REVIEWS.get(name)) || "0", 10);
      days[day][slug][event === "click" ? "clicks" : "scans"] = value;
    }
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);

  let scans = 0, clicks = 0;
  for (const day of Object.values(days)) {
    for (const s of Object.values(day)) { scans += s.scans; clicks += s.clicks; }
  }

  return Response.json({
    totals: {
      scans,
      clicks,
      clickThroughRate: scans ? +(clicks / scans * 100).toFixed(1) : 0
    },
    byDay: Object.fromEntries(Object.entries(days).sort().reverse())
  }, { headers: { "cache-control": "no-store" } });
}

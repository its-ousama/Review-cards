// GET /api/stats?key=YOUR_SECRET
//
// Per-day scan and click counts, split by staff member and by review site,
// plus the star distribution. Counts only.

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);

  if (!env.STATS_KEY || url.searchParams.get("key") !== env.STATS_KEY) {
    return new Response("nope", { status: 401 });
  }

  const days = {};
  const platformTotals = {};
  const starTotals = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let cursor;

  do {
    const list = await env.REVIEWS.list({ cursor });

    await Promise.all(list.keys.map(async ({ name }) => {
      const [kind, slug, day, extra] = name.split(":");
      if (!day) return;

      const value = parseInt((await env.REVIEWS.get(name)) || "0", 10);
      if (!value) return;

      const person = bucket(days, day, slug);

      if (kind === "scan") {
        person.scans += value;
      } else if (kind === "click") {
        const platform = extra || "unknown";
        person.clicks += value;
        person.byPlatform[platform] = (person.byPlatform[platform] || 0) + value;
        platformTotals[platform] = (platformTotals[platform] || 0) + value;
      } else if (kind === "stars") {
        const n = parseInt(extra, 10);
        if (n >= 1 && n <= 5) {
          person.stars[n] += value;
          starTotals[n] += value;
        }
      }
    }));

    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);

  let scans = 0, clicks = 0;
  for (const day of Object.values(days)) {
    for (const s of Object.values(day)) { scans += s.scans; clicks += s.clicks; }
  }

  // Stars are shown so you can see the room, not so anyone can act on them
  // per-customer. Every rating already went to the same place.
  const rated = Object.values(starTotals).reduce((a, b) => a + b, 0);
  const average = rated
    ? +(Object.entries(starTotals)
        .reduce((sum, [n, c]) => sum + Number(n) * c, 0) / rated).toFixed(2)
    : null;

  return Response.json({
    totals: {
      scans,
      clicks,
      clickThroughRate: scans ? +(clicks / scans * 100).toFixed(1) : 0,
      byPlatform: platformTotals,
      stars: starTotals,
      starsRated: rated,
      starsAverage: average
    },
    byDay: Object.fromEntries(Object.entries(days).sort().reverse())
  }, { headers: { "cache-control": "no-store" } });
}

function bucket(days, day, slug) {
  days[day] ??= {};
  days[day][slug] ??= {
    scans: 0,
    clicks: 0,
    byPlatform: {},
    stars: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  };
  return days[day][slug];
}

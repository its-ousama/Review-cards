# Review cards — The Frog & British Library

A card you hand over with the bill. The customer scans it, sees who served them, and taps through to Google's review composer. You don't hover.

```
public/
  index.html             markup
  css/styles.css         tokens at the top, components below
  js/config.js           review URL + staff roster — the only file you edit routinely
  js/app.js              slug resolution, clipboard, tracking, redirect
functions/api/
  scan.js                counts scans and tap-throughs
  stats.js               private endpoint to read the counts
scripts/
  make-cards.mjs         data + assembly, no markup or CSS
  card.template.html     one card's markup
  card-print.css         A4 sheet layout
```

## 1. Test the review link

Already wired up in `public/js/config.js`. The Place ID is `ChIJh2CBrzxy5kcRQiHJF_DvnKw`, verified against the feature ID embedded in the pub's Maps URL:

```
https://search.google.com/local/writereview?placeid=ChIJh2CBrzxy5kcRQiHJF_DvnKw
```

**Open that on your phone before printing anything.** 
It lands straight on the star-rating screen. 

## 2. Deploy

Cloudflare Pages, free tier:


Then in the Cloudflare dashboard:

1. **Workers & Pages → KV → Create namespace**, call it `reviews`
2. Your Pages project → **Settings → Bindings** → add a KV binding named `REVIEWS` pointing at that namespace
3. **Settings → Environment variables** → add `STATS_KEY` with a long random string

Without the KV binding the page still works perfectly — counting just silently no-ops. That's deliberate: a broken counter must never break a customer's journey.



## 3. Print the cards

```bash
npm install
node scripts/make-cards.mjs https://your-domain.pages.dev sam 30
```

Opens as `out/cards-sam.html`. Print at **100% scale, no fit-to-page** — scaling shrinks the QR quiet zone and some scanners choke. Cardstock around 300gsm. Cut on the dashed lines.

Error correction is set to level M, so the code still reads with a fold or a beer ring across it.

## 4. Check what's working

```
https://your-domain.pages.dev/api/stats?key=YOUR_STATS_KEY
```

Returns scans, tap-throughs, and the rate between them, per day. Counts only — no IP, no user agent, no cookie, nothing tied to a person.

The number to watch is `clickThroughRate`. If scans are high and clicks are low, the page copy needs work. If scans themselves are low, the handover is the problem, not the page.

Counts use last-write-wins, so two simultaneous scans can register as one. Fine for trend-spotting, not an accounting record.

## Adding other staff

Only `public/js/config.js` changes:

```js
staff: {
  sam:   { name: "Sam",   role: "Served you today" },
  marie: { name: "Marie", role: "Served you today" }
}
```

An unknown or malformed `?s=` falls back to `defaultSlug` rather than rendering a blank badge, so a mistyped URL still produces a usable page.

Then `node scripts/make-cards.mjs https://your-domain.pages.dev marie 30`. Each person gets their own slug, their own cards, and their own line in the stats.

## Things not to change

**Everyone gets the same button.** Don't add logic that routes unhappy customers somewhere other than Google. Review gating is banned by the FTC's consumer reviews rule, by Google's policies, and under French unfair commercial practice law. It's also trivial to prove from the outside.

**Don't pre-write the review.** The badge copies a name, three characters. The moment it copies a sentence you're generating reviews, and Google clusters on textual similarity — templated phrasing across one business is one of the loudest fake-review signals there is.

**Don't attach an incentive.** "Leave a review and I'll comp your next round" violates Google's terms and can get the pub's reviews purged. Your arrangement with the pub is between you and them; the customer isn't part of it.

## Before you hand out card one

Show it to German, the manager. Not for permission to be nice to customers — for permission to put the pub's name on a printed thing. If a customer ever asks the bar "is this official?", you want the answer to be yes. It also opens the door to the conversation worth having: attribution by shift instead of by name-in-text, so you stop losing money on good reviews that happen not to mention you.

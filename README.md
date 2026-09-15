# Review cards — The Frog & British Library

A card you hand over with the bill. The customer scans it, sees who served them, picks Google or Tripadvisor, taps a star, and lands on that site's review form. You don't hover.

```
public/
  index.html             markup
  css/styles.css         tokens at the top, components below
  js/config.js           review sites + staff roster — the only file you edit routinely
  js/app.js              slug resolution, platform switch, stars, clipboard, tracking, redirect
  _headers               cache rules — see "Deploying an update"
functions/api/
  scan.js                counts scans and tap-throughs
  stats.js               private endpoint to read the counts
scripts/
  make-cards.mjs         data + assembly, no markup or CSS
  card.template.html     one card's markup
  card-print.css         A4 sheet layout
```

## How the page behaves

1. **Who served you** — name from `?s=<slug>`, tap to copy it.
2. **Where** — Google or Tripadvisor. Google is the default; the choice rewrites the button underneath it.
3. **How was it** — five stars. Tapping any of them lights the row, then opens the chosen site's review form after about half a second.

The star is a commitment nudge, nothing more. **One star and five stars go to exactly the same place.** The number is counted for you, and that is all it does — see "Things not to change".

The green button always works on its own. It carries a real `href` from the markup, so if the fonts fail, the JS fails, or the customer taps before the page finishes, the journey still completes.

## 1. Test both review links

Both live in `public/js/config.js`.

**Google** — Place ID `ChIJh2CBrzxy5kcRQiHJF_DvnKw`, verified against the feature ID embedded in the pub's Maps URL:

```
https://search.google.com/local/writereview?placeid=ChIJh2CBrzxy5kcRQiHJF_DvnKw
```

**Tripadvisor** — `g187147` is Paris, `d1536374` is the pub, both read off its listing URL:

```
https://www.tripadvisor.com/UserReviewEdit-g187147-d1536374
```

**Open both on your phone before printing anything.** Each should land on the write-a-review screen, not the listing. If Tripadvisor drops you on the listing instead, hit "Write a review" there and copy whatever URL that lands on into `config.js`.

Adding a third site later means one more entry in `platforms` — the switch, the button label and the stats all pick it up on their own. Keep the no-JS `href` in `index.html` pointing at whichever entry is first.

## 2. Deploy

Cloudflare Pages, free tier.

Then in the Cloudflare dashboard:

1. **Workers & Pages → KV → Create namespace**, call it `reviews`
2. Your Pages project → **Settings → Bindings** → add a KV binding named `REVIEWS` pointing at that namespace
3. **Settings → Environment variables** → add `STATS_KEY` with a long random string

Without the KV binding the page still works perfectly — counting just silently no-ops. That's deliberate: a broken counter must never break a customer's journey.

## 2b. Deploying an update

`styles.css` and `app.js` keep their names from one deploy to the next, so a
phone that scanned a card last month will happily reuse the copies it already
has. A new `index.html` against an old `config.js` isn't a degraded page — it's
a blank one, because the old config has no `platforms` array to read.

Two things stop that:

- **`public/_headers`** tells Cloudflare Pages to make browsers revalidate
  before reusing anything outside `/img/`. Cheap: the answer is almost always
  `304 Not Modified` with no body.
- **`?v=` on the css and js tags in `index.html`.** Bump it — `?v=2` to `?v=3` —
  on any deploy that touches those files. A new URL cannot be stale, which is
  the only thing that reaches a phone whose cache is already poisoned.

`app.js` also refuses to die on a config it doesn't recognise: a missing or
old `platforms` array falls back to the review URL sitting in the button's own
markup, the switch hides itself rather than rendering empty, and the stars and
the name still work. Worth keeping — the failure it prevents is invisible to
you and total for the customer.

If a page ever looks half-built on your phone, that's this, and the fix is the
`?v=` bump, not the CSS.

## 3. Print the cards

```bash
npm install
node scripts/make-cards.mjs https://review.epita.online sam 32
```

Opens as `out/cards-sam.html`. Print at **100% scale, no fit-to-page** — scaling
shrinks the QR quiet zone and some scanners choke. Cardstock around 300gsm.

**Eight cards per A4, not ten.** The old sheet was 275mm of cards plus 22mm of
margin on a 297mm page — exactly the height of the paper, with nothing left for
the printer's own unprintable strip. Any printer with a bottom margin clipped
row five. This one leaves 22.5mm top and bottom.

**Cut on the crop ticks**, the short marks in the paper margin. They point at
each card boundary; line a ruler across two opposite ticks and cut. Nothing is
printed on the card itself to cut along, because a dashed rectangle survives the
scissors and tells everyone the card came off a home printer. The frame sits
2.6mm inside the trim, so a millimetre of drift changes the white margin and
never touches the design.

Error correction is level Q — 25% recovery, against M's 15% — and the code is
27mm instead of 22mm. Bigger modules and more parity: it reads through a fold,
a beer ring, and a dim corner of the bar.

**Check the type before you commit cardstock.** The card uses Libre Baskerville
and Libre Caslon Display from Google Fonts. If the browser can't reach them it
falls back to Times silently and the design collapses — so if the name looks
like Times, reload with a connection before printing. Print one sheet on plain
paper first and lay it over the cardstock to confirm the ticks all landed.

### The card

Black ink only: line art, hairlines and solid black, no greys, no tints, no
flood fills. A cream panel across eight cards bands on a laser and spends toner
on nothing. The paper is the background.

The frog is an original drawing in `card.template.html`, not the pub's mark —
which is deliberate. Don't swap in FrogPubs' own logo without asking German
first; the card already carries the pub's name, and that's the part worth having
permission for.

## 4. Check what's working

```
https://review.epita.online/api/stats?key=YOUR_STATS_KEY
```

Returns, per day and per person: scans, tap-throughs, the split between Google and Tripadvisor, and the star distribution. Counts only — no IP, no user agent, no cookie, nothing tied to a person.

The number to watch is `clickThroughRate`. If scans are high and clicks are low, the page copy needs work. If scans themselves are low, the handover is the problem, not the page.

`byPlatform` tells you where people actually want to write. If one site is barely
used, make it the second option rather than dropping it — some customers only have
an account on one. Note the card now prints "Google or Tripadvisor", so adding a
third site means a reprint; that was a deliberate trade for the customers who'd
otherwise put the card down thinking "I don't do Google reviews".

`stars` and `starsAverage` are the room's mood, not a filter. Nothing in the code reads them.

Counts use last-write-wins, so two simultaneous scans can register as one. Fine for trend-spotting, not an accounting record.

## Adding other staff

Only `public/js/config.js` changes:

```js
staff: {
  sam:   { name: "Sam",   role: "Served you today" },
  marie: { name: "Marie", role: "Served you today" }
}
```

An unknown or malformed `?s=` shows no name at all rather than the wrong one, so a mistyped URL still produces a usable page.

Then `node scripts/make-cards.mjs https://review.epita.online marie 30`. Each person gets their own slug, their own cards, and their own line in the stats.

## Things not to change

**Everyone gets the same button, and every star gets the same destination.** Don't add logic that routes unhappy customers, or one- and two-star taps, somewhere other than the review site they picked. Review gating is banned by the FTC's consumer reviews rule, by Google's policies, by Tripadvisor's, and under French unfair commercial practice law. It's also trivial to prove from the outside: anyone can tap one star and watch where the page sends them.

The star count is recorded as a per-day histogram and never branches anything. If you ever find yourself writing `if (rating < 4)`, stop.

**Don't pre-write the review.** The badge copies a name, three characters. The moment it copies a sentence you're generating reviews, and Google clusters on textual similarity — templated phrasing across one business is one of the loudest fake-review signals there is.

**Don't attach an incentive.** "Leave a review and I'll comp your next round" violates Google's and Tripadvisor's terms and can get the pub's reviews purged. Your arrangement with the pub is between you and them; the customer isn't part of it.

## Before you hand out card one

Show it to German, the manager. Not for permission to be nice to customers — for permission to put the pub's name on a printed thing. If a customer ever asks the bar "is this official?", you want the answer to be yes. It also opens the door to the conversation worth having: attribution by shift instead of by name-in-text, so you stop losing money on good reviews that happen not to mention you.

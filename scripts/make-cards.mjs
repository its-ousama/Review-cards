// Generates a printable A4 sheet of cards, 8 per page.
//
//   node scripts/make-cards.mjs <base-url> [slug] [count]
//   node scripts/make-cards.mjs https://review.epita.online sam 32
//
// Layout lives in card-print.css, markup in card.template.html.
// This file only does data.

import QRCode from "qrcode";
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));

const COLS = 2;
const ROWS = 4;
const PER_PAGE = COLS * ROWS;
const CARD_W = 85;   // mm — must match card-print.css
const CARD_H = 63;

const [, , baseUrl, slug = "sam", count = "8"] = process.argv;

if (!baseUrl) {
  console.error("Usage: node scripts/make-cards.mjs <base-url> [slug] [count]");
  process.exit(1);
}
if (!/^[a-z0-9-]{1,24}$/.test(slug)) {
  console.error(`Bad slug "${slug}" — lowercase letters, digits and hyphens only.`);
  process.exit(1);
}

const name = slug.charAt(0).toUpperCase() + slug.slice(1);
const root = baseUrl.replace(/\/$/, "");
const target = `${root}/?s=${slug}`;
const total = Math.max(1, parseInt(count, 10) || 1);

// Printed on the card so the customer can see where the code goes before
// they scan it, and reach the page by hand if the scan fails.
const domain = root.replace(/^https?:\/\//, "");

const qr = await QRCode.toString(target, {
  type: "svg",
  // Q recovers 25% versus M's 15%. The URL is short enough that the extra
  // parity only costs one version, and at 27mm the modules stay comfortably
  // bigger than they were on the old 22mm code.
  errorCorrectionLevel: "Q",
  margin: 0,               // quiet zone is drawn in CSS, as padding on white
  color: { dark: "#000000", light: "#00000000" }
});

const read = (file) => readFileSync(join(HERE, file), "utf8");

const card = read("card.template.html")
  .replaceAll("{{NAME}}", name)
  .replaceAll("{{DOMAIN}}", domain)
  .replace("{{QR}}", qr.replace(/<\?xml.*?\?>/, "").trim());

// Crop marks: ticks in the paper margin pointing at every card boundary,
// 2mm clear of the trim so the cut removes nothing but paper.
const GAP = 2, LEN = 3;
const marks = [];
for (let c = 0; c <= COLS; c++) {
  const x = c * CARD_W;
  marks.push(`<i class="cm cm--v" style="left:${x}mm;top:-${GAP + LEN}mm"></i>`);
  marks.push(`<i class="cm cm--v" style="left:${x}mm;bottom:-${GAP + LEN}mm"></i>`);
}
for (let r = 0; r <= ROWS; r++) {
  const y = r * CARD_H;
  marks.push(`<i class="cm cm--h" style="top:${y}mm;left:-${GAP + LEN}mm"></i>`);
  marks.push(`<i class="cm cm--h" style="top:${y}mm;right:-${GAP + LEN}mm"></i>`);
}
const cropMarks = marks.join("");

const pages = [];
for (let i = 0; i < total; i += PER_PAGE) {
  const onThisPage = Math.min(PER_PAGE, total - i);
  pages.push(`<section class="sheet">${cropMarks}${card.repeat(onThisPage)}</section>`);
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${name} — review cards</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Libre+Caslon+Display&display=swap">
<style>${read("card-print.css")}</style>
</head>
<body>
${pages.join("\n")}
</body>
</html>
`;

mkdirSync(join(HERE, "..", "out"), { recursive: true });
writeFileSync(join(HERE, "..", "out", `cards-${slug}.html`), html);
writeFileSync(join(HERE, "..", "out", `qr-${slug}.svg`), qr);

const sheets = pages.length;
console.log(`Target URL : ${target}`);
console.log(`Printed as : ${domain}`);
console.log(`Cards      : out/cards-${slug}.html  (${total} cards, ${sheets} sheet(s), ${PER_PAGE} per sheet)`);
console.log(`Bare QR    : out/qr-${slug}.svg`);
console.log(`
Print at 100% scale — no fit-to-page, no "shrink to printable area".
Before the first real run: print one sheet on plain paper, lay it on the
cardstock and check the crop ticks are all on the page. If the type looks
like Times, the fonts did not load — reconnect and reload before printing.`);

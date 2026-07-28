// Generates a printable A4 sheet of cards, 10 per page.
//
//   node scripts/make-cards.mjs <base-url> [slug] [count]
//   node scripts/make-cards.mjs https://your-domain.pages.dev sam 30
//
// Layout lives in card-print.css, markup in card.template.html.
// This file only does data.

import QRCode from "qrcode";
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const PER_PAGE = 10;

const [, , baseUrl, slug = "sam", count = "10"] = process.argv;

if (!baseUrl) {
  console.error("Usage: node scripts/make-cards.mjs <base-url> [slug] [count]");
  process.exit(1);
}
if (!/^[a-z0-9-]{1,24}$/.test(slug)) {
  console.error(`Bad slug "${slug}" — lowercase letters, digits and hyphens only.`);
  process.exit(1);
}

const name = slug.charAt(0).toUpperCase() + slug.slice(1);
const target = `${baseUrl.replace(/\/$/, "")}/?s=${slug}`;
const total = Math.max(1, parseInt(count, 10) || 1);

const qr = await QRCode.toString(target, {
  type: "svg",
  errorCorrectionLevel: "M",   // survives a fold and a beer ring
  margin: 0,
  color: { dark: "#0F2119", light: "#00000000" }
});

const read = (file) => readFileSync(join(HERE, file), "utf8");

const card = read("card.template.html")
  .replace("{{NAME}}", name)
  .replace("{{QR}}", qr.replace(/<\?xml.*?\?>/, "").trim());

const pages = [];
for (let i = 0; i < total; i += PER_PAGE) {
  const onThisPage = Math.min(PER_PAGE, total - i);
  pages.push(`<section class="sheet">${card.repeat(onThisPage)}</section>`);
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${name} — review cards</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Libre+Caslon+Display&family=Karla:wght@400;500;600&display=swap">
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

console.log(`Target URL : ${target}`);
console.log(`Cards      : out/cards-${slug}.html  (${total} cards, ${pages.length} page(s))`);
console.log(`Bare QR    : out/qr-${slug}.svg`);
console.log(`\nPrint at 100% scale — no fit-to-page.`);

(() => {
  "use strict";

  const { platforms, defaultSlug, staff, handoffDelay } = window.CONFIG;

  const el = {
    server:  document.getElementById("server"),
    avatar:  document.getElementById("avatar"),
    foot:    document.getElementById("foot"),
    role:    document.getElementById("role"),
    name:    document.getElementById("name"),
    inline:  document.getElementById("name-inline"),
    hint:    document.getElementById("hint"),
    badge:   document.getElementById("badge"),
    seg:     document.getElementById("platforms"),
    glider:  document.getElementById("glider"),
    stars:   document.getElementById("stars"),
    rhint:   document.getElementById("rate-hint"),
    go:      document.getElementById("go"),
    goText:  document.getElementById("cta-text")
  };

  const STARS = 5;
  let platform = platforms[0];
  let rating = 0;
  let leaving = false;

  const slug = resolveSlug();
  const person = slug ? staff[slug] : null;

  // Unknown slug: no name shown at all. A wrong name misattributes the
  // review; a missing one just loses the prompt.
  if (person) {
    showPerson(person);
    el.badge.addEventListener("click", () => copyName(person.name));
  }

  buildPlatforms();
  buildStars();
  applyPlatform(platform, { silent: true });

  el.go.addEventListener("click", () => { if (!leaving) { leaving = true; track("click"); } });

  track("scan");

  /* ---- who served you ------------------------------------------------ */

  function showPerson({ name, role }) {
    el.name.textContent = name;
    el.inline.textContent = name;
    el.role.textContent = role;
    el.avatar.textContent = name.trim().charAt(0).toUpperCase();
    el.server.hidden = false;
    el.foot.hidden = false;
  }

  function resolveSlug() {
    const raw = new URLSearchParams(window.location.search).get("s");
    const cleaned = (raw || defaultSlug).toLowerCase().trim();
    if (!/^[a-z0-9-]{1,24}$/.test(cleaned)) return null;
    return Object.hasOwn(staff, cleaned) ? cleaned : null;
  }

  async function copyName(name) {
    try {
      await navigator.clipboard.writeText(name);
      el.hint.textContent = `${name} copied — paste it into your review`;
      el.hint.classList.add("is-copied");
    } catch {
      el.hint.textContent = `Just type ${name} into your review`;
    }
  }

  /* ---- where ---------------------------------------------------------- */

  function buildPlatforms() {
    platforms.forEach((p, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "seg__opt";
      b.dataset.id = p.id;
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(i === 0));
      b.style.setProperty("--accent", p.accent);
      b.innerHTML =
        `<span class="seg__dot" aria-hidden="true"></span><span>${p.label}</span>`;
      b.addEventListener("click", () => applyPlatform(p));
      el.seg.appendChild(b);
    });
  }

  function applyPlatform(p, { silent = false } = {}) {
    platform = p;

    const opts = [...el.seg.querySelectorAll(".seg__opt")];
    opts.forEach((b) => {
      const on = b.dataset.id === p.id;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-checked", String(on));
      b.tabIndex = on ? 0 : -1;
    });

    // Slide the highlight behind the chosen option.
    const idx = platforms.indexOf(p);
    el.glider.style.setProperty("--n", String(platforms.length));
    el.glider.style.setProperty("--i", String(idx));
    el.glider.style.setProperty("--accent", p.accent);

    // Keep the real link honest — it works with JS broken, and it's what a
    // long-press "open in new tab" will use.
    el.go.href = target(p);
    el.goText.textContent = `Leave a review on ${p.label}`;

    if (!silent) {
      el.rhint.textContent = rating
        ? `Opening ${p.label}…`
        : `Tap a star — you'll finish on ${p.label}`;
      if (rating) leave();
    }
  }

  /* ---- rate ----------------------------------------------------------- */

  function buildStars() {
    for (let n = 1; n <= STARS; n++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "star";
      b.dataset.n = String(n);
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", "false");
      b.setAttribute("aria-label", n === 1 ? "1 star" : `${n} stars`);
      b.style.setProperty("--d", `${(n - 1) * 45}ms`);
      b.innerHTML =
        `<svg viewBox="0 0 24 24" aria-hidden="true">` +
        `<path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z"/>` +
        `</svg>`;
      b.addEventListener("click", () => rate(n));
      b.addEventListener("pointerenter", () => preview(n));
      b.addEventListener("focus", () => preview(n));
      el.stars.appendChild(b);
    }
    el.stars.addEventListener("pointerleave", () => preview(rating));
  }

  function preview(n) {
    if (leaving) return;
    [...el.stars.children].forEach((b) => {
      b.classList.toggle("is-lit", Number(b.dataset.n) <= n);
    });
  }

  // Every rating goes to the same place. No branching on the number —
  // that would be review gating, and it is not happening here.
  function rate(n) {
    if (leaving) return;
    rating = n;

    [...el.stars.children].forEach((b) => {
      const k = Number(b.dataset.n);
      b.classList.toggle("is-lit", k <= n);
      b.classList.toggle("is-set", k <= n);
      b.setAttribute("aria-checked", String(k === n));
      if (k <= n) {
        b.classList.remove("is-pop");
        void b.offsetWidth;          // restart the animation
        b.classList.add("is-pop");
      }
    });

    el.stars.classList.add("is-rated");
    el.rhint.textContent = `Thanks — opening ${platform.label}…`;
    el.rhint.classList.add("is-live");
    leave();
  }

  function leave() {
    leaving = true;
    el.go.classList.add("is-going");
    track("click");
    setTimeout(() => { window.location.href = target(platform); }, handoffDelay);
  }

  /* ---- link building --------------------------------------------------- */

  // Android can be told which app should handle a URL. browser_fallback_url
  // covers the case where the app isn't installed, so this never dead-ends.
  function target(p) {
    if (!p.androidPackage || !/Android/i.test(navigator.userAgent)) return p.url;
    const bare = p.url.replace(/^https?:\/\//, "");
    return `intent://${bare}#Intent;scheme=https;` +
           `package=${p.androidPackage};` +
           `S.browser_fallback_url=${encodeURIComponent(p.url)};end`;
  }

  /* ---- counting -------------------------------------------------------- */

  // Fire and forget. Counting must never block or break the journey.
  function track(event) {
    const q = new URLSearchParams({ s: slug || "unknown", e: event });
    if (event === "click") {
      q.set("p", platform.id);
      if (rating) q.set("r", String(rating));
    }
    const url = `/api/scan?${q}`;
    if (navigator.sendBeacon) { navigator.sendBeacon(url); return; }
    fetch(url, { method: "POST", keepalive: true }).catch(() => {});
  }
})();

(() => {
  "use strict";

  const { reviewUrl, defaultSlug, staff } = window.CONFIG;

  const el = {
    role:   document.getElementById("role"),
    name:   document.getElementById("name"),
    inline: document.getElementById("name-inline"),
    hint:   document.getElementById("hint"),
    badge:  document.getElementById("badge"),
    go:     document.getElementById("go")
  };

  const slug = resolveSlug();
  const person = staff[slug] || staff[defaultSlug];

  render(person);
  track(slug, "scan");

  el.badge.addEventListener("click", () => copyName(person.name));
  el.go.addEventListener("click", () => {
    track(slug, "click");
    window.location.href = reviewUrl;
  });

  function resolveSlug() {
    const raw = new URLSearchParams(window.location.search).get("s");
    const cleaned = (raw || defaultSlug).toLowerCase().trim();
    return /^[a-z0-9-]{1,24}$/.test(cleaned) ? cleaned : defaultSlug;
  }

  function render({ name, role }) {
    el.name.textContent = name;
    el.inline.textContent = name;
    el.role.textContent = role;
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

  // Fire and forget. Counting must never block or break the journey.
  function track(who, event) {
    const url = `/api/scan?s=${encodeURIComponent(who)}&e=${event}`;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url);
      return;
    }
    fetch(url, { method: "POST", keepalive: true }).catch(() => {});
  }
})();

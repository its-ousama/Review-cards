/* Everything you'd realistically change lives here. */

window.CONFIG = {

  // ---- where a review can be left -------------------------------------
  // Order matters: the first entry is the default, and it's the one the
  // no-JS fallback link in index.html points at. Keep that href in sync
  // if you ever reorder these.
  //
  // Both destinations get the same treatment. Every star, 1 through 5,
  // ends up on whichever of these the customer picked — see README,
  // "Things not to change".
  platforms: [
    {
      id: "google",
      label: "Google",
      accent: "#4285F4",
      // The Frog & British Library, 114 av. de France, 75013 Paris.
      // Place ID verified against the feature ID in the pub's Maps URL.
      // If this ever opens the general listing instead of the star screen,
      // swap in the g.page/r/…/review shortlink from the Business Profile.
      url: "https://search.google.com/local/writereview?placeid=ChIJh2CBrzxy5kcRQiHJF_DvnKw",

      // On Android, hand the link to the Maps app instead of the browser, so
      // the customer lands somewhere they're already signed in. Falls back to
      // the browser automatically if Maps isn't installed.
      // iOS ignores this — Apple only honours associations an app declares,
      // and search.google.com isn't one of Maps' declared domains.
      androidPackage: "com.google.android.apps.maps"
    },
    {
      id: "tripadvisor",
      label: "Tripadvisor",
      accent: "#00AA6C",
      // g187147 = Paris, d1536374 = The Frog & British Library.
      // Both IDs read off the pub's own Tripadvisor listing URL.
      // VERIFY ON A PHONE BEFORE PRINTING: it should open the write-a-review
      // form, not the listing. If it doesn't, use the "Write a review" button
      // on the listing page and copy whatever URL that lands on.
      url: "https://www.tripadvisor.com/UserReviewEdit-g187147-d1536374",

      // Tripadvisor's Android app claims its own domains, so the OS opens it
      // by itself. No intent:// hack needed.
      androidPackage: null
    }
  ],

  defaultSlug: "sam",

  staff: {
    sam:  { name: "Sam",  role: "Served you today" },
    alex: { name: "Alex", role: "Served you today" }
  },

  // How long the "thanks" beat lasts after a star is tapped, in ms, before
  // the review page opens. Long enough to feel acknowledged, short enough
  // that nobody wonders whether it worked.
  handoffDelay: 620
};

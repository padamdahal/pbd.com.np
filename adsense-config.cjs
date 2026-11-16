/**
 * adsense-config.cjs — Centralized Google AdSense configuration for builder.cjs
 *
 * How to configure manual ad units:
 *   1. In your Google AdSense dashboard, turn OFF Auto Ads (or exclude pbd.com.np)
 *      so floating anchors, vignettes, and mid-form overlays stay disabled.
 *   2. Create two responsive Display Ad units in AdSense:
 *      - One for Tool pages (placed below the tool UI, above the FAQ)
 *      - One for Guide pages (placed after the guide content, above the FAQ)
 *   3. Paste the numeric unit IDs (data-ad-slot) below and run:
 *      `npm run build`
 *
 * Note: While `tool` or `guide` is empty (""), the ad container stays collapsed
 * cleanly in the UI and no invalid AdSense requests are sent.
 */
module.exports = {
  client: "ca-pub-6632604868005505",

  slots: {
    // Paste your numeric AdSense Display Ad unit IDs here:
    tool: "",
    guide: "",
    about: "2038306091",
  },

  // Pages kept 100% ad-free for clean navigation, embeds, printing, and offline use
  skipPages: new Set([
    "index.html",
    "offline.html",
    "privacy/index.html",
    "tools/index.html",
    "guides/index.html",
    "widgets/index.html",
    "widgets/nepali-proverb/index.html",
    "tools/nepal-invoice-generator/index.html",
  ]),
};

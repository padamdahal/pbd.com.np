/**
 * builder-catalog.cjs — tools / widgets / guides catalog data for builder.cjs
 *
 * Flags:
 *   featured: true  → homepage featured grids
 *   footer: true    → footer popular-link pills
 *   shortTitle      → optional shorter label for footer pills
 *   movedTo         → optional cross-domain canonical URL (e.g. https://nepaliwebtools.link/tools/<slug>/).
 *                     When set, builder.cjs keeps the page live on pbd.com.np with cross-domain
 *                     rel="canonical" + og:url + aligned JSON-LD, excludes it from pbd.com.np/sitemap.xml,
 *                     rewrites catalog cards/footer/in-page links directly to movedTo (rel="noopener"),
 *                     and injects a subtle canonical notice banner.
 *
 * Tool categories are derived at build time from unique `category` values on TOOLS (first-seen order).
 */

const SITE_ORIGIN = "https://pbd.com.np";
const MOVED_TOOLS_ORIGIN = "https://nepaliwebtools.link";

function moved(href) {
  return `${MOVED_TOOLS_ORIGIN}${href}`;
}

const TOOLS = [
  // Nepali language
  {
    href: "/tools/nepali-typing/",
    movedTo: moved("/tools/nepali-typing/"),
    title: "Nepali Typing",
    desc: "Type in Nepali with Romanized input. Instant Unicode conversion.",
    category: "Nepali language",
    featured: true,
    footer: true,
  },
  {
    href: "/tools/preeti-to-unicode/",
    movedTo: moved("/tools/preeti-to-unicode/"),
    title: "Preeti ↔ Unicode",
    desc: "Convert Preeti font text to Unicode and back. Live dual direction.",
    category: "Nepali language",
    featured: true,
    footer: true,
  },
  {
    href: "/tools/nepali-date-converter/",
    movedTo: moved("/tools/nepali-date-converter/"),
    title: "Nepali Date Converter & Calendar",
    shortTitle: "Nepali Date Converter",
    desc: "Convert BS ↔ AD dates, check today’s live Nepali date, and browse the interactive BS calendar (2000–2090).",
    category: "Nepali language",
    featured: true,
    footer: true,
  },
  {
    href: "/tools/bs-age-calculator/",
    movedTo: moved("/tools/bs-age-calculator/"),
    title: "BS Age Calculator",
    desc: "Calculate age from Bikram Sambat birth date. Years, months, days.",
    category: "Nepali language",
  },
  {
    href: "/tools/nepali-spell-checker/",
    movedTo: moved("/tools/nepali-spell-checker/"),
    title: "Nepali Spell Checker",
    shortTitle: "Spell Checker",
    desc: "Check Nepali Unicode text for spelling mistakes and get suggestions.",
    category: "Nepali language",
    featured: true,
    footer: true,
  },
  {
    href: "/tools/nepali-dictionary/",
    movedTo: moved("/tools/nepali-dictionary/"),
    title: "Nepali Dictionary",
    desc: "Search 120,000+ words from the Brihat Sabdakosh. Meanings, grammar and etymology.",
    category: "Nepali language",
  },
  {
    href: "/tools/nepali-name-generator/",
    movedTo: moved("/tools/nepali-name-generator/"),
    title: "Nepali Name Generator",
    desc: "Generate traditional and modern Nepali first names by gender.",
    category: "Nepali language",
  },
  {
    href: "/tools/number-to-nepali-words/",
    movedTo: moved("/tools/number-to-nepali-words/"),
    title: "Number to Nepali Words",
    shortTitle: "Number to Words",
    desc: "Convert numbers to Nepali words for cheques, invoices and documents.",
    category: "Nepali language",
    footer: true,
  },
  {
    href: "/tools/nepali-wordle/",
    movedTo: moved("/tools/nepali-wordle/"),
    title: "Nepali Wordle",
    desc: "Daily and practice 5-letter Nepali word game with Devanagari keyboard and stats.",
    category: "Nepali language",
  },

  // Finance
  {
    href: "/tools/income-tax-calculator/",
    movedTo: moved("/tools/income-tax-calculator/"),
    title: "Income Tax Calculator",
    shortTitle: "Income Tax",
    desc: "Estimate Nepal income tax for FY 2083/84 with slabs, SSF and deductions.",
    category: "Finance",
    featured: true,
    footer: true,
  },
  {
    href: "/tools/vehicle-tax-calculator/",
    movedTo: moved("/tools/vehicle-tax-calculator/"),
    title: "Vehicle Tax Calculator",
    desc: "Estimate annual vehicle tax for cars, motorcycles and more in Nepal.",
    category: "Finance",
  },
  {
    href: "/tools/nea-bill-calculator/",
    movedTo: moved("/tools/nea-bill-calculator/"),
    title: "NEA Bill Calculator",
    desc: "Estimate residential electricity bill with progressive slabs, service charge and VAT.",
    category: "Finance",
    featured: true,
  },

  // Maps & location
  {
    href: "/tools/nepal-map/",
    movedTo: moved("/tools/nepal-map/"),
    title: "Nepal Map",
    desc: "Interactive map of provinces, districts and local levels with CSV join.",
    category: "Maps & location",
    featured: true,
    footer: true,
  },
  {
    href: "/tools/ev-charging-stations/",
    movedTo: moved("/tools/ev-charging-stations/"),
    title: "EV Charging Stations",
    desc: "Find electric vehicle charging points across Nepal from OpenStreetMap.",
    category: "Maps & location",
  },
  {
    href: "/tools/local-weather/",
    movedTo: moved("/tools/local-weather/"),
    title: "Local Weather",
    desc: "Current conditions, hourly forecast and 7-day outlook for Nepal and beyond.",
    category: "Maps & location",
  },

  // Content creation
  {
    href: "/tools/caption-generator/",
    movedTo: moved("/tools/caption-generator/"),
    title: "Caption Generator",
    desc: "Ready-to-post inspirational captions for TikTok and Instagram in Nepali.",
    category: "Content creation",
  },
  {
    href: "/tools/hashtag-generator/",
    movedTo: moved("/tools/hashtag-generator/"),
    title: "Hashtag Generator",
    desc: "Curated Nepali + English hashtags by niche. Filter for TikTok, Instagram or Facebook.",
    category: "Content creation",
  },

  // Utilities
  {
    href: "/tools/land-unit-converter/",
    movedTo: moved("/tools/land-unit-converter/"),
    title: "Land Unit Converter",
    desc: "Ropani–Aana–Paisa–Daam ↔ Bigha–Kattha–Dhur ↔ Sq Ft / m². Instant and accurate.",
    category: "Utilities",
  },
  {
    href: "/tools/image-compressor/",
    movedTo: moved("/tools/image-compressor/"),
    title: "Image Compressor & Crop",
    desc: "Compress, resize and crop photos. Passport, visa and DV lottery presets. Fully private.",
    category: "Utilities",
    featured: true,
  },
  {
    href: "/tools/name-badge-generator/",
    movedTo: moved("/tools/name-badge-generator/"),
    title: "Name Badge Generator",
    desc: "Bulk CSV to printable badges with QR, logo, backgrounds and PDF sheets.",
    category: "Utilities",
  },
];

const WIDGETS = [
  {
    href: "/widgets/nepali-proverb/",
    title: "Nepali Proverb of the Day",
    desc: "120+ ukhan with daily and random modes. Embeddable iframe for blogs and sites.",
    category: "Widgets",
    featured: true,
  },
];

const GUIDES = [
  {
    href: "/guides/how-to-start-freelancing-in-nepal-2026/",
    title: "How to Start Freelancing in Nepal in 2026",
    desc: "Step-by-step guide to start freelancing from Nepal — platforms, payments and tips.",
    category: "Guides",
    featured: true,
  },
  {
    href: "/guides/how-to-use-ai-as-a-complete-beginner-2026/",
    title: "How to Use AI as a Complete Beginner in 2026",
    desc: "Simple introduction to using AI tools for study, work and content creation.",
    category: "Guides",
    featured: true,
  },
];

module.exports = { SITE_ORIGIN, MOVED_TOOLS_ORIGIN, TOOLS, WIDGETS, GUIDES };

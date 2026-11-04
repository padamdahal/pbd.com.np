/**
 * builder-catalog.cjs — tools / widgets / guides catalog data for builder.cjs
 * featured: true → shown on the homepage featured grids
 */
const TOOLS = [
  // Nepali language
  { href: "/tools/nepali-typing/", title: "Nepali Typing", desc: "Type in Nepali with Romanized input. Instant Unicode conversion.", category: "Nepali language", featured: true },
  { href: "/tools/preeti-to-unicode/", title: "Preeti ↔ Unicode", desc: "Convert Preeti font text to Unicode and back. Live dual direction.", category: "Nepali language", featured: true },
  { href: "/tools/nepali-date-converter/", title: "Nepali Date Converter", desc: "Convert between BS (Bikram Sambat) and AD (Gregorian) dates.", category: "Nepali language", featured: true },
  { href: "/tools/today-nepali-date/", title: "Today’s Nepali Date", desc: "See today’s date in Bikram Sambat with day name and tithi.", category: "Nepali language" },
  { href: "/tools/bs-age-calculator/", title: "BS Age Calculator", desc: "Calculate age from Bikram Sambat birth date. Years, months, days.", category: "Nepali language" },
  { href: "/tools/nepali-calendar/", title: "Nepali Calendar (BS)", desc: "Interactive Bikram Sambat month view. Click to copy ISO date or drag onto form fields.", category: "Nepali language", featured: true },
  { href: "/tools/nepali-spell-checker/", title: "Nepali Spell Checker", desc: "Check Nepali Unicode text for spelling mistakes and get suggestions.", category: "Nepali language", featured: true },
  { href: "/tools/nepali-dictionary/", title: "Nepali Dictionary", desc: "Search 120,000+ words from the Brihat Sabdakosh. Meanings, grammar and etymology.", category: "Nepali language" },
  { href: "/tools/nepali-name-generator/", title: "Nepali Name Generator", desc: "Generate traditional and modern Nepali first names by gender.", category: "Nepali language" },
  { href: "/tools/number-to-nepali-words/", title: "Number to Nepali Words", desc: "Convert numbers to Nepali words for cheques, invoices and documents.", category: "Nepali language" },
  { href: "/tools/nepali-wordle/", title: "Nepali Wordle", desc: "Daily and practice 5-letter Nepali word game with Devanagari keyboard and stats.", category: "Nepali language" },

  // Finance
  { href: "/tools/income-tax-calculator/", title: "Income Tax Calculator", desc: "Estimate Nepal income tax for FY 2083/84 with slabs, SSF and deductions.", category: "Finance", featured: true },
  { href: "/tools/vehicle-tax-calculator/", title: "Vehicle Tax Calculator", desc: "Estimate annual vehicle tax for cars, motorcycles and more in Nepal.", category: "Finance" },
  { href: "/tools/nea-bill-calculator/", title: "NEA Bill Calculator", desc: "Estimate residential electricity bill with progressive slabs, service charge and VAT.", category: "Finance", featured: true },

  // Maps & location
  { href: "/tools/nepal-map/", title: "Nepal Map", desc: "Interactive map of provinces, districts and local levels with CSV join.", category: "Maps & location" },
  { href: "/tools/ev-charging-stations/", title: "EV Charging Stations", desc: "Find electric vehicle charging points across Nepal from OpenStreetMap.", category: "Maps & location" },
  { href: "/tools/local-weather/", title: "Local Weather", desc: "Current conditions, hourly forecast and 7-day outlook for Nepal and beyond.", category: "Maps & location" },

  // Content creation
  { href: "/tools/caption-generator/", title: "Caption Generator", desc: "Ready-to-post inspirational captions for TikTok and Instagram in Nepali.", category: "Content creation" },
  { href: "/tools/hashtag-generator/", title: "Hashtag Generator", desc: "Curated Nepali + English hashtags by niche. Filter for TikTok, Instagram or Facebook.", category: "Content creation" },

  // Utilities
  { href: "/tools/land-unit-converter/", title: "Land Unit Converter", desc: "Ropani–Aana–Paisa–Daam ↔ Bigha–Kattha–Dhur ↔ Sq Ft / m². Instant and accurate.", category: "Utilities" },
  { href: "/tools/image-compressor/", title: "Image Compressor & Crop", desc: "Compress, resize and crop photos. Passport, visa and DV lottery presets. Fully private.", category: "Utilities", featured: true },
  { href: "/tools/name-badge-generator/", title: "Name Badge Generator", desc: "Bulk CSV to printable badges with QR, logo, backgrounds and PDF sheets.", category: "Utilities" },
];

const WIDGETS = [
  { href: "/widgets/nepali-proverb/", title: "Nepali Proverb of the Day", desc: "120+ ukhan with daily and random modes. Embeddable iframe for blogs and sites.", category: "Widgets", featured: true },
];

const GUIDES = [
  { href: "/guides/how-to-start-freelancing-in-nepal-2026/", title: "How to Start Freelancing in Nepal in 2026", desc: "Step-by-step guide to start freelancing from Nepal — platforms, payments and tips.", category: "Guides", featured: true },
  { href: "/guides/how-to-use-ai-as-a-complete-beginner-2026/", title: "How to Use AI as a Complete Beginner in 2026", desc: "Simple introduction to using AI tools for study, work and content creation.", category: "Guides", featured: true },
];

const TOOL_CATEGORIES = [
  { id: "nepali-language", title: "Nepali language", lead: "Typing, conversion, dictionary, calendar and spelling tools." },
  { id: "finance", title: "Finance", lead: "Tax, vehicle tax and electricity bill estimators for Nepal." },
  { id: "maps", title: "Maps & location", lead: "Interactive maps, EV chargers and local weather." },
  { id: "content", title: "Content creation", lead: "Captions and hashtags for social posts in Nepali and English." },
  { id: "utilities", title: "Utilities", lead: "Land units, image tools and badge generators." },
];

module.exports = { TOOLS, WIDGETS, GUIDES, TOOL_CATEGORIES };

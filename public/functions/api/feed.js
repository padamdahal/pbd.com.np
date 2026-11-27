/**
 * Cloudflare Pages Function — GET /api/feed
 * Fetches public RSS/Atom feeds from major Nepali news & tech portals concurrently,
 * parses & sanitizes items with zero external dependencies, deduplicates, sorts
 * newest-first, and returns a CDN-cached JSON response.
 */

const FEED_SOURCES = [
  {
    source: "Online Khabar",
    category: "National & Politics",
    language: "Nepali",
    url: "https://www.onlinekhabar.com/feed",
  },
  {
    source: "Online Khabar English",
    category: "National & Politics",
    language: "English",
    url: "https://english.onlinekhabar.com/feed",
  },
  {
    source: "Setopati",
    category: "National & Politics",
    language: "Nepali",
    url: "https://www.setopati.com/feed",
  },
  {
    source: "Setopati English",
    category: "National & Politics",
    language: "English",
    url: "https://en.setopati.com/feed",
  },
  {
    source: "The Himalayan Times",
    category: "National & Politics",
    language: "English",
    url: "https://thehimalayantimes.com/rss",
  },
  {
    source: "Nepali Times",
    category: "National & Politics",
    language: "English",
    url: "https://nepalitimes.com/rss",
  },
  {
    source: "TechPana",
    category: "Tech & Startups",
    language: "Nepali",
    url: "https://www.techpana.com/feed",
  },
  {
    source: "ICT Frame",
    category: "Tech & Startups",
    language: "English",
    url: "https://ictframe.com/feed/",
  },
  {
    source: "GadgetByte Nepal",
    category: "Tech & Startups",
    language: "English",
    url: "https://www.gadgetbytenepal.com/feed/",
  },
  {
    source: "Sharesansar",
    category: "Business & Economy",
    language: "English",
    url: "https://www.sharesansar.com/rss",
  },
  {
    source: "Bizmandu",
    category: "Business & Economy",
    language: "Nepali",
    url: "https://bizmandu.com/feed",
  },
];

const FEED_TIMEOUT_MS = 4000;
const MAX_ITEMS = 40;
const MAX_DESC_LENGTH = 160;

const NAMED_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  hellip: "…",
  copy: "©",
  reg: "®",
  trade: "™",
};

function decodeEntities(input) {
  if (!input) return "";
  return String(input)
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : "";
    })
    .replace(/&#(\d+);/g, (_m, dec) => {
      const code = parseInt(dec, 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : "";
    })
    .replace(/&([a-zA-Z]+);/g, (match, name) => {
      const key = name.toLowerCase();
      return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, key)
        ? NAMED_ENTITIES[key]
        : match;
    });
}

function stripCdata(str) {
  if (!str) return "";
  return String(str).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1");
}

function sanitizeText(raw, maxLength = 0) {
  if (!raw) return "";
  // Decode entities twice to handle double-encoded RSS summaries safely
  let text = stripCdata(raw);
  text = decodeEntities(text);
  // Remove embedded script/style blocks and all HTML tags
  text = text
    .replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  text = decodeEntities(text);
  text = text.replace(/\s+/g, " ").trim();

  if (maxLength > 0 && text.length > maxLength) {
    const sliced = text.slice(0, maxLength - 1);
    const lastSpace = sliced.lastIndexOf(" ");
    text = (lastSpace > maxLength * 0.6 ? sliced.slice(0, lastSpace) : sliced).trimEnd() + "…";
  }
  return text;
}

function sanitizeUrl(rawUrl) {
  if (!rawUrl) return "";
  const cleaned = decodeEntities(stripCdata(rawUrl)).trim();
  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return "";
    }
    return parsed.href;
  } catch {
    return "";
  }
}

function normalizeUrlForDedup(href) {
  try {
    const u = new URL(href);
    u.hash = "";
    // Strip common tracking query params
    for (const key of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|ref|source)/i.test(key)) {
        u.searchParams.delete(key);
      }
    }
    const cleanPath = u.pathname.replace(/\/+$/, "") || "/";
    return `${u.hostname.replace(/^www\./i, "").toLowerCase()}${cleanPath}${u.search}`;
  } catch {
    return href.toLowerCase();
  }
}

function extractTag(block, tagNames) {
  for (const tag of tagNames) {
    const escaped = tag.replace(":", "\\:");
    const re = new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i");
    const match = re.exec(block);
    if (match && match[1] && match[1].trim()) {
      return match[1];
    }
  }
  return "";
}

function extractAtomLink(block) {
  // Prefer rel="alternate" link, fallback to first <link href="...">
  const linkTags = block.match(/<link\b[^>]*>/gi) || [];
  let fallback = "";
  for (const tag of linkTags) {
    const hrefMatch = /\bhref\s*=\s*(?:"([^"]+)"|'([^']+)')/i.exec(tag);
    if (!hrefMatch) continue;
    const href = hrefMatch[1] || hrefMatch[2] || "";
    const relMatch = /\brel\s*=\s*(?:"([^"]+)"|'([^']+)')/i.exec(tag);
    const rel = (relMatch ? relMatch[1] || relMatch[2] : "alternate").toLowerCase();
    if (rel === "alternate") return href;
    if (!fallback) fallback = href;
  }
  return fallback;
}

function parseTimestamp(rawDate) {
  if (!rawDate) return null;
  const cleaned = sanitizeText(rawDate);
  const ms = Date.parse(cleaned);
  if (!Number.isFinite(ms)) return null;
  // Guard against wildly future dates caused by misconfigured feed clocks
  const maxFuture = Date.now() + 24 * 60 * 60 * 1000;
  return new Date(Math.min(ms, maxFuture)).toISOString();
}

function parseFeedXml(xml, meta) {
  if (!xml || typeof xml !== "string") return [];
  const items = [];

  // Match RSS <item> blocks
  const rssBlocks = xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) || [];
  for (const block of rssBlocks) {
    const title = sanitizeText(extractTag(block, ["title"]), 180);
    const rawLink = extractTag(block, ["link", "guid"]) || extractAtomLink(block);
    const link = sanitizeUrl(rawLink);
    if (!title || !link) continue;

    const rawDesc = extractTag(block, ["description", "content:encoded", "summary"]);
    const description = sanitizeText(rawDesc, MAX_DESC_LENGTH);
    const pubDate = parseTimestamp(
      extractTag(block, ["pubDate", "dc:date", "published", "updated"])
    );

    items.push({
      title,
      link,
      pubDate: pubDate || new Date(0).toISOString(),
      hasDate: Boolean(pubDate),
      description,
      source: meta.source,
      category: meta.category,
      language: meta.language,
    });
  }

  // Fallback to Atom <entry> blocks when no RSS <item> elements were found
  if (items.length === 0) {
    const atomBlocks = xml.match(/<entry\b[^>]*>[\s\S]*?<\/entry>/gi) || [];
    for (const block of atomBlocks) {
      const title = sanitizeText(extractTag(block, ["title"]), 180);
      const rawLink = extractAtomLink(block) || extractTag(block, ["id"]);
      const link = sanitizeUrl(rawLink);
      if (!title || !link) continue;

      const rawDesc = extractTag(block, ["summary", "content"]);
      const description = sanitizeText(rawDesc, MAX_DESC_LENGTH);
      const pubDate = parseTimestamp(extractTag(block, ["published", "updated"]));

      items.push({
        title,
        link,
        pubDate: pubDate || new Date(0).toISOString(),
        hasDate: Boolean(pubDate),
        description,
        source: meta.source,
        category: meta.category,
        language: meta.language,
      });
    }
  }

  return items;
}

async function fetchSingleFeed(meta) {
  const signal =
    typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(FEED_TIMEOUT_MS)
      : undefined;

  const response = await fetch(meta.url, {
    method: "GET",
    headers: {
      "User-Agent": "PBDNepalPulseBot/1.0 (+https://pbd.com.np/)",
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.1",
    },
    redirect: "follow",
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const xml = await response.text();
  return parseFeedXml(xml, meta);
}

const CORS_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=300, s-maxage=900",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet() {
  const results = await Promise.allSettled(FEED_SOURCES.map((src) => fetchSingleFeed(src)));

  const seenUrls = new Set();
  const seenTitles = new Set();
  const merged = [];
  let activeSources = 0;

  for (const res of results) {
    if (res.status !== "fulfilled" || !Array.isArray(res.value)) continue;
    if (res.value.length > 0) activeSources++;

    for (const item of res.value) {
      const urlKey = normalizeUrlForDedup(item.link);
      const titleKey = item.title.toLowerCase();
      if (seenUrls.has(urlKey) || seenTitles.has(titleKey)) continue;
      seenUrls.add(urlKey);
      seenTitles.add(titleKey);
      merged.push(item);
    }
  }

  merged.sort((a, b) => {
    if (a.hasDate !== b.hasDate) return a.hasDate ? -1 : 1;
    return Date.parse(b.pubDate) - Date.parse(a.pubDate);
  });

  const items = merged.slice(0, MAX_ITEMS).map(({ hasDate: _h, ...rest }) => rest);

  const payload = {
    updatedAt: new Date().toISOString(),
    sourceCount: activeSources,
    totalSources: FEED_SOURCES.length,
    count: items.length,
    items,
  };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: CORS_HEADERS,
  });
}

#!/usr/bin/env node
/**
 * Builds chunked Brihat Sabdakosh JSON files in public/tools/nepali-dictionary/
 * Source: https://github.com/bikashpadhikari/nepali-brihat-sabdakosh-json (MIT License)
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const https = require("https");

const SOURCE_URL =
  "https://raw.githubusercontent.com/bikashpadhikari/nepali-brihat-sabdakosh-json/main/sabdakosh.json.gz";
const OUT_DIR = path.join(__dirname, "..", "public", "tools", "nepali-dictionary");
const TMP_GZ = "/tmp/sabdakosh.json.gz";
const CHUNK_SIZE = 4000;

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          return download(res.headers.location, dest).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          file.close();
          return reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
        }
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", (err) => {
        file.close();
        reject(err);
      });
  });
}

function cleanText(s) {
  return String(s || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  if (!fs.existsSync(TMP_GZ)) {
    console.log("Downloading Brihat Sabdakosh JSON (MIT)...");
    await download(SOURCE_URL, TMP_GZ);
  }

  const raw = JSON.parse(zlib.gunzipSync(fs.readFileSync(TMP_GZ)));
  const map = new Map();

  for (const item of raw) {
    const w = cleanText(item.word);
    if (!w) continue;
    const defs = [];
    for (const d of item.definitions || []) {
      const senses = (d.senses || []).map(cleanText).filter(Boolean);
      if (!senses.length) continue;
      const nd = { s: senses };
      const g = cleanText(d.grammar);
      const e = cleanText(d.etymology);
      if (g) nd.g = g;
      if (e) nd.e = e;
      defs.push(nd);
    }
    if (!defs.length) continue;
    if (map.has(w)) {
      map.get(w).d.push(...defs);
    } else {
      map.set(w, { w, d: defs });
    }
  }

  const entries = Array.from(map.values()).sort((a, b) =>
    a.w < b.w ? -1 : a.w > b.w ? 1 : 0
  );

  // Clean stale dict-*.json chunks before writing
  for (const name of fs.readdirSync(OUT_DIR)) {
    if (/^dict-\d+\.json$/.test(name)) {
      fs.unlinkSync(path.join(OUT_DIR, name));
    }
  }

  const index = [];
  let chunkIdx = 0;
  for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
    const slice = entries.slice(i, i + CHUNK_SIZE);
    fs.writeFileSync(
      path.join(OUT_DIR, `dict-${chunkIdx}.json`),
      JSON.stringify(slice)
    );
    index.push({
      i: chunkIdx,
      first: slice[0].w,
      last: slice[slice.length - 1].w,
      count: slice.length,
    });
    chunkIdx++;
  }

  fs.writeFileSync(path.join(OUT_DIR, "index.json"), JSON.stringify(index));
  console.log(
    `Built ${entries.length} entries into ${index.length} chunks in ${OUT_DIR}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

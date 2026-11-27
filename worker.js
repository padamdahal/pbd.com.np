/**
 * Cloudflare Worker entrypoint for pbd.com.np
 * Routes /api/feed to the RSS aggregator handler in functions/api/feed.js
 * and delegates all other requests to Cloudflare Static Assets (./public).
 */
import { onRequestGet, onRequestOptions } from "./functions/api/feed.js";

const EDGE_CACHE_TTL_SECONDS = 300;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === "/api/feed" || pathname === "/api/feed/") {
      if (request.method === "OPTIONS") {
        return onRequestOptions({ request, env, ctx });
      }

      if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
          status: 405,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            Allow: "GET, HEAD, OPTIONS",
          },
        });
      }

      const cache =
        typeof caches !== "undefined" && caches.default ? caches.default : null;
      const cacheKey = new Request(`${url.origin}/api/feed`, { method: "GET" });

      if (cache) {
        const cached = await cache.match(cacheKey);
        if (cached) {
          return request.method === "HEAD"
            ? new Response(null, { status: cached.status, headers: cached.headers })
            : cached;
        }
      }

      try {
        const response = await onRequestGet({ request, env, ctx });

        if (cache && response.ok) {
          const toCache = new Response(response.clone().body, response);
          toCache.headers.set(
            "Cache-Control",
            `public, max-age=${EDGE_CACHE_TTL_SECONDS}, s-maxage=900`
          );
          if (ctx && typeof ctx.waitUntil === "function") {
            ctx.waitUntil(cache.put(cacheKey, toCache));
          } else {
            await cache.put(cacheKey, toCache);
          }
        }

        return request.method === "HEAD"
          ? new Response(null, { status: response.status, headers: response.headers })
          : response;
      } catch {
        return new Response(
          JSON.stringify({
            updatedAt: new Date().toISOString(),
            sourceCount: 0,
            count: 0,
            items: [],
            error: "Unable to fetch upstream feeds right now.",
          }),
          {
            status: 502,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "no-store",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }
    }

    if (env && env.ASSETS && typeof env.ASSETS.fetch === "function") {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  },
};

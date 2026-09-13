import { defineMiddleware } from 'astro:middleware';

// Paths that benefit from edge caching
const CACHEABLE = ['/', '/explore/', '/archive/'];

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;
  const isArticle = path.startsWith('/articles/');
  const isCacheable = CACHEABLE.includes(path) || isArticle;

  // Skip non-cacheable (API routes, saved, admin, etc)
  if (!isCacheable) {
    return next();
  }

  // Access Cloudflare Cache API via runtime context
  const ctx = context.locals?.runtime?.ctx;
  if (!ctx) return next();

  const cache = caches.default;
  const cacheKey = new Request(context.url.toString(), { method: 'GET' });

  // Try edge cache first
  const cached = await cache.match(cacheKey);
  if (cached) {
    // Add header to indicate cache hit
    const hitResponse = new Response(cached.body, cached);
    hitResponse.headers.set('X-Cache', 'HIT');
    return hitResponse;
  }

  // Cache miss — fetch origin
  const response = await next();

  // Only cache successful HTML responses
  const ct = response.headers.get('Content-Type') || '';
  if (response.status === 200 && ct.includes('text/html')) {
    const clone = response.clone();
    // Set cache headers on the clone before storing
    clone.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=300');
    clone.headers.set('X-Cache', 'MISS');

    // Store in edge cache (fire and forget)
    ctx.waitUntil(cache.put(cacheKey, clone));

    // Return original with X-Cache: MISS
    const out = new Response(response.body, response);
    out.headers.set('X-Cache', 'MISS');
    out.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=300');
    return out;
  }

  return response;
});

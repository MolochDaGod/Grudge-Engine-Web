import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Catch-all API proxy for Grudge Engine Web.
 *
 * Routes requests to the appropriate backend:
 * - /api/health → handled by health.ts (Vercel serverless)
 * - /api/* → proxied to Grudge Studio backend (VPS)
 *
 * This allows the Vercel static frontend to communicate with
 * the full Express backend running on the VPS.
 */

const GRUDGE_BACKEND = process.env.GRUDGE_BACKEND_URL || 'https://api.grudge-studio.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { path } = req.query;
  const apiPath = Array.isArray(path) ? path.join('/') : path || '';

  // Skip if this is the health endpoint (handled by its own file)
  if (apiPath === 'health') {
    return res.status(200).json({ status: 'ok', note: 'Use /api/health directly' });
  }

  const targetUrl = `${GRUDGE_BACKEND}/api/${apiPath}`;

  try {
    // Forward headers (excluding host)
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (key === 'host' || key === 'connection') continue;
      if (typeof value === 'string') headers[key] = value;
    }
    headers['x-forwarded-from'] = 'grudge-engine-web.vercel.app';

    const fetchOptions: RequestInit = {
      method: req.method || 'GET',
      headers,
      signal: AbortSignal.timeout(30_000),
    };

    // Forward body for POST/PUT/PATCH
    if (req.method && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
      if (req.body) {
        fetchOptions.body = JSON.stringify(req.body);
        headers['content-type'] = headers['content-type'] || 'application/json';
      }
    }

    const response = await fetch(targetUrl, fetchOptions);

    // Forward response headers
    const contentType = response.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);

    // CORS headers for the engine frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    const data = await response.text();

    // Try to parse as JSON, otherwise return raw
    try {
      const json = JSON.parse(data);
      return res.status(response.status).json(json);
    } catch {
      return res.status(response.status).send(data);
    }
  } catch (error) {
    // Backend unreachable — return a helpful error
    const message = error instanceof Error ? error.message : 'Unknown error';

    // For non-critical endpoints, return a graceful fallback
    if (apiPath.startsWith('cache') || apiPath.startsWith('debug')) {
      return res.status(200).json({
        status: 'offline',
        message: 'Backend not available, using client-side fallback',
        endpoint: `/api/${apiPath}`,
      });
    }

    return res.status(502).json({
      error: 'Backend unavailable',
      message: `Could not reach ${GRUDGE_BACKEND}: ${message}`,
      endpoint: `/api/${apiPath}`,
      hint: 'Set GRUDGE_BACKEND_URL environment variable in Vercel project settings',
    });
  }
}

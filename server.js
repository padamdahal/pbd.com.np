import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { onRequestGet as handleFeedGet, onRequestOptions as handleFeedOptions } from './functions/api/feed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

const publicDir = path.join(__dirname, 'public');

// Local preview bridge for Cloudflare Pages Function (/api/feed)
app.options('/api/feed', async (_req, res) => {
  try {
    const cfRes = await handleFeedOptions();
    cfRes.headers.forEach((value, key) => res.setHeader(key, value));
    res.status(cfRes.status).end();
  } catch {
    res.status(204).end();
  }
});

app.get('/api/feed', async (req, res) => {
  try {
    const cfRes = await handleFeedGet({ request: req });
    cfRes.headers.forEach((value, key) => res.setHeader(key, value));
    const body = await cfRes.text();
    res.status(cfRes.status).send(body);
  } catch (err) {
    res.status(502).json({
      updatedAt: new Date().toISOString(),
      sourceCount: 0,
      count: 0,
      items: [],
      error: 'Unable to fetch upstream feeds right now.',
    });
  }
});

// Serve static assets from public/
app.use(express.static(publicDir, {
  extensions: ['html'],
  index: 'index.html',
  redirect: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.webmanifest')) {
      res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    } else if (filePath.endsWith('.geojson')) {
      res.setHeader('Content-Type', 'application/geo+json; charset=utf-8');
    }
  }
}));

// Fallback for 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(publicDir, 'index.html'));
});

const server = app.listen(PORT, HOST, () => {
  console.log(`PBD server running at http://${HOST}:${PORT}`);
});

server.on('error', (err) => {
  console.error('Failed to start PBD server:', err);
  process.exit(1);
});

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

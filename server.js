import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

const publicDir = path.join(__dirname, 'public');

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

app.listen(PORT, HOST, () => {
  console.log(`PBD server running at http://${HOST}:${PORT}`);
});

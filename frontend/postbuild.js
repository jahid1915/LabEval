import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const source = path.join(__dirname, 'dist', 'index.html');
const dest = path.join(__dirname, 'dist', '404.html');

if (fs.existsSync(source)) {
  fs.copyFileSync(source, dest);
  console.log('Copied index.html to 404.html for GitHub Pages SPA routing.');
} else {
  console.error('Build output index.html not found!');
}

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const hotFile = path.resolve(__dirname, '../../public/hot');
const manifestPath = path.resolve(__dirname, '../../public/build/manifest.json');
const manifestPathVite6 = path.resolve(__dirname, '../../public/build/.vite/manifest.json');

let manifestCache = null;
let manifestMtime = 0;

function resolveManifestPath() {
  if (fs.existsSync(manifestPath)) return manifestPath;
  if (fs.existsSync(manifestPathVite6)) return manifestPathVite6;
  return null;
}

function loadManifest() {
  const file = resolveManifestPath();
  if (!file) return null;

  const mtime = fs.statSync(file).mtimeMs;
  if (manifestCache && mtime === manifestMtime) {
    return manifestCache;
  }

  manifestCache = JSON.parse(fs.readFileSync(file, 'utf-8'));
  manifestMtime = mtime;
  return manifestCache;
}

export function getViteAssets() {
  if (!config.isProduction && fs.existsSync(hotFile)) {
    const url = fs.readFileSync(hotFile, 'utf-8').trim();
    return {
      dev: true,
      url,
      scripts: [`${url}/resources/js/app.jsx`],
      styles: [],
    };
  }

  const manifest = loadManifest();
  if (!manifest) {
    return { dev: false, scripts: [], styles: [] };
  }

  const entry = manifest['resources/js/app.jsx'];
  if (!entry) {
    return { dev: false, scripts: [], styles: [] };
  }

  return {
    dev: false,
    scripts: [`/build/${entry.file}`],
    styles: (entry.css || []).map((file) => `/build/${file}`),
  };
}

export function clearManifestCache() {
  manifestCache = null;
  manifestMtime = 0;
}

export function getAssetVersion() {
  const file = resolveManifestPath();
  if (!file) return '1.0.0';
  return String(fs.statSync(file).mtimeMs);
}

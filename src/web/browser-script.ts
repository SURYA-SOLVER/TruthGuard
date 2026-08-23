import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try multiple paths: relative to this file (works on Vercel), then cwd-based (works locally)
function findBundlePath(): string {
  const candidates = [
    resolve(__dirname, '..', '..', 'dist', 'web', 'app.js'),    // from dist/src/web/ -> dist/web/
    resolve(__dirname, '..', 'web', 'app.js'),                    // from src/web/ -> dist/web/ (Vercel)
    resolve(process.cwd(), 'dist', 'web', 'app.js'),             // from cwd (local dev)
    resolve(process.cwd(), 'public', 'assets', 'app.js'),        // from cwd (new output location)
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return '';
}

const browserBundlePath = findBundlePath();

export function loadBrowserAppScript(): string {
  const p = browserBundlePath || findBundlePath();
  if (p && existsSync(p)) return readFileSync(p, 'utf8');
  return 'console.error("TruthGuard browser bundle is missing. Run pnpm bundle:web before starting the server.");';
}

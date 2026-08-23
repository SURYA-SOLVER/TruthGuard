import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const browserBundlePath = resolve(process.cwd(), 'dist', 'web', 'app.js');

export function loadBrowserAppScript(): string {
  if (existsSync(browserBundlePath)) return readFileSync(browserBundlePath, 'utf8');
  return 'console.error("TruthGuard browser bundle is missing. Run pnpm bundle:web before starting the server.");';
}

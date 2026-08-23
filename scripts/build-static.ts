// Writes the CSS from styles.ts to public/assets/styles.css at build time
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { STYLES } from '../src/web/styles.js';

const outDir = resolve(process.cwd(), 'public', 'assets');
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, 'styles.css'), STYLES, 'utf8');
console.log('✓ Wrote public/assets/styles.css');

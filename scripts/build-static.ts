// Writes static assets (CSS + HTML) to public/ at build time
// so Vercel CDN serves them instantly without hitting the serverless function
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { STYLES } from '../src/web/styles.js';
import { renderPage } from '../src/web/page.js';

const publicDir = resolve(process.cwd(), 'public');
const assetsDir = resolve(publicDir, 'assets');
mkdirSync(assetsDir, { recursive: true });

// Write CSS
writeFileSync(resolve(assetsDir, 'styles.css'), STYLES, 'utf8');
console.log('✓ Wrote public/assets/styles.css');

// Write index.html with env-based config
// On Vercel, env vars are available at build time
const payTo = process.env.PAY_TO_ADDRESS || '5DBSH6XD35N4AX54JB4MKISR46R7AITBPJPSACQUATURJL7K3VY2AQUQ3Y';
const networkName = (process.env.ALGORAND_NETWORK || 'testnet') as 'testnet' | 'mainnet';

// Import the constants we need
const { ALGORAND_TESTNET_CAIP2, ALGORAND_MAINNET_CAIP2, USDC_TESTNET_ASA_ID, USDC_MAINNET_ASA_ID } = await import('@x402/avm');
const { default: algosdk } = await import('algosdk');

const networkMap = {
  testnet: { network: ALGORAND_TESTNET_CAIP2, usdcAssetId: USDC_TESTNET_ASA_ID },
  mainnet: { network: ALGORAND_MAINNET_CAIP2, usdcAssetId: USDC_MAINNET_ASA_ID },
} as const;

const selected = networkMap[networkName];

const config = {
  port: 3000,
  networkName,
  network: selected.network,
  usdcAssetId: selected.usdcAssetId,
  indexerUrl: networkName === 'testnet' ? 'https://testnet-idx.algonode.cloud' : 'https://mainnet-idx.algonode.cloud',
  facilitatorUrl: process.env.FACILITATOR_URL || 'https://facilitator.goplausible.xyz',
  payTo,
  price: process.env.PRICE_USDC || '$0.001',
  challengeMode: process.env.CHALLENGE_MODE === 'true',
  defaultWalletAddress: process.env.WALLET_ADDRESS || payTo,
};

const html = renderPage(config);
writeFileSync(resolve(publicDir, 'index.html'), html, 'utf8');
console.log('✓ Wrote public/index.html');

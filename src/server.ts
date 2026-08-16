import 'dotenv/config';
import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { loadConfig } from './config.js';

try {
  const config = loadConfig();
  const app = createApp(config);

  serve({ fetch: app.fetch, port: config.port }, info => {
    console.log(`x402 Commerce Template running on http://localhost:${info.port}`);
    console.log('Health endpoint: /health');
    console.log('Protected endpoint: /api/wallet/:address');
    console.log(`Payment network: Algorand ${config.networkName}`);
  });
} catch (error) {
  console.error(`x402 Commerce Template could not start: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

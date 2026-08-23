import { getRequestListener } from '@hono/node-server';
import { Hono } from 'hono';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

let app;

try {
  const config = loadConfig(process.env);
  app = createApp(config);
} catch (error) {
  app = new Hono();
  app.all('*', (c) => c.json({ 
    error: 'configuration_error', 
    message: error instanceof Error ? error.message : String(error),
    instructions: 'Please configure this environment variable in your Vercel Project Settings -> Environment Variables.'
  }, 500));
}

const listener = getRequestListener(app.fetch);

export default function (req: any, res: any) {
  return listener(req, res);
}

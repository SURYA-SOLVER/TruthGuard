import { Hono } from 'hono';
import { handle } from 'hono/vercel';

const app = new Hono();

app.get('/health', (c) => c.json({ status: 'ok', msg: 'hono health' }));

app.all('*', (c) => c.json({ error: 'not_found' }, 404));

export default handle(app);

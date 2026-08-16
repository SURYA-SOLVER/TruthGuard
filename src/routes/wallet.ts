import type { Context } from 'hono';
import type { AlgorandService } from '../services/algorand.js';
import { AlgorandUnavailableError, WalletNotFoundError } from '../services/algorand.js';

export function createWalletHandler(service: AlgorandService) {
  return async (c: Context) => {
    const address = c.req.param('address');
    if (!address) {
      return c.json({ error: 'invalid_address', message: 'An Algorand address is required.' }, 400);
    }

    try {
      return c.json(await service.getWalletIntelligence(address));
    } catch (error) {
      if (error instanceof WalletNotFoundError) {
        return c.json({ error: 'wallet_not_found', message: error.message }, 404);
      }
      if (error instanceof AlgorandUnavailableError) {
        return c.json({ error: 'algorand_unavailable', message: error.message }, 503);
      }

      console.error('Unexpected paid resource error:', error);
      return c.json({ error: 'internal_error', message: 'Could not build paid resource.' }, 500);
    }
  };
}

import { ExactAvmScheme } from '@x402/avm/exact/server';
import { HTTPFacilitatorClient } from '@x402/core/server';
import type { ResourceServerExtension } from '@x402/core/types';
import { paymentMiddleware, x402ResourceServer } from '@x402/hono';
import { bazaarResourceServerExtension, declareDiscoveryExtension } from '@x402-avm/extensions';
import type { RuntimeConfig } from '../config.js';

export const WALLET_DESCRIPTION =
  'Returns ALGO balance, ASA holdings, USDC balance, account status, and basic activity information for an Algorand address.';

export function createX402Middleware(config: RuntimeConfig) {
  const facilitator = new HTTPFacilitatorClient({ url: config.facilitatorUrl });
  const server = new x402ResourceServer(facilitator);
  server.register(config.network, new ExactAvmScheme());
  server.registerExtension(bazaarResourceServerExtension as unknown as ResourceServerExtension);

  const discovery = declareDiscoveryExtension({
    input: {
      address: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ',
    },
    inputSchema: {
      properties: {
        address: {
          type: 'string',
          description: 'A valid 58-character Algorand account address',
          minLength: 58,
          maxLength: 58,
        },
      },
      required: ['address'],
    },
    output: {
      example: {
        address: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ',
        algoBalance: 127.35,
        assetCount: 9,
        usdcBalance: 24.5,
        status: 'active',
        summary: 'Active paid API holding 9 assets.',
        createdAssets: 0,
        appsLocalStateCount: 2,
        minimumBalance: 0.3,
      },
    },
  });

  return paymentMiddleware(
    {
      'GET /api/wallet/:address': {
        accepts: [
          {
            scheme: 'exact',
            price: config.price,
            network: config.network,
            payTo: config.payTo,
            extra: {
              asset: config.usdcAssetId,
              ...(config.challengeMode ? { tag: 'x402-global-challenge' } : {}),
            },
          },
        ],
        description: WALLET_DESCRIPTION,
        mimeType: 'application/json',
        extensions: discovery,
      },
    },
    server,
  );
}

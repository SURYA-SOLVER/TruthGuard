import { describe, expect, it } from 'vitest';
import { mapAccountToIntelligence } from '../src/services/algorand.js';

describe('paid resource mapping', () => {
  it('maps micro-units and asset holdings deterministically', () => {
    const result = mapAccountToIntelligence(
      {
        address: 'TEST',
        amount: 127_350_000,
        status: 'Online',
        assets: [
          { 'asset-id': 10458941, amount: 24_500_000 },
          { 'asset-id': 123, amount: 1 },
        ],
        'created-assets': [{}, {}],
        'apps-local-state': [{}],
        'min-balance': 300_000,
      },
      10458941,
    );

    expect(result).toEqual({
      address: 'TEST',
      algoBalance: 127.35,
      assetCount: 2,
      usdcBalance: 24.5,
      status: 'active',
      summary: 'Active paid API holding 2 assets.',
      createdAssets: 2,
      appsLocalStateCount: 1,
      minimumBalance: 0.3,
    });
  });
});

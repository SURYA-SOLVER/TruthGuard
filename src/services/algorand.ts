export interface IndexerAssetHolding {
  amount: number;
  'asset-id': number;
}

export interface IndexerAccount {
  address: string;
  amount: number;
  status: string;
  assets?: IndexerAssetHolding[];
  'created-assets'?: unknown[];
  'apps-local-state'?: unknown[];
  'min-balance'?: number;
}

interface IndexerAccountResponse {
  account: IndexerAccount;
}

export interface WalletIntelligence {
  address: string;
  algoBalance: number;
  assetCount: number;
  usdcBalance: number;
  status: string;
  summary: string;
  createdAssets: number;
  appsLocalStateCount: number;
  minimumBalance: number;
}

export class WalletNotFoundError extends Error {
  constructor(address: string) {
    super(`Wallet ${address} was not found on this Algorand network.`);
    this.name = 'WalletNotFoundError';
  }
}

export class AlgorandUnavailableError extends Error {
  constructor(message = 'The Algorand account data service is unavailable.') {
    super(message);
    this.name = 'AlgorandUnavailableError';
  }
}

export function mapAccountToIntelligence(
  account: IndexerAccount,
  usdcAssetId: number,
): WalletIntelligence {
  const assets = account.assets ?? [];
  const usdc = assets.find(asset => asset['asset-id'] === usdcAssetId);
  const assetCount = assets.length;
  const status = normalizeStatus(account.status);

  return {
    address: account.address,
    algoBalance: account.amount / 1_000_000,
    assetCount,
    usdcBalance: (usdc?.amount ?? 0) / 1_000_000,
    status,
    summary: `${formatStatus(status)} paid API holding ${assetCount} ${assetCount === 1 ? 'asset' : 'assets'}.`,
    createdAssets: account['created-assets']?.length ?? 0,
    appsLocalStateCount: account['apps-local-state']?.length ?? 0,
    minimumBalance: (account['min-balance'] ?? 0) / 1_000_000,
  };
}

function formatStatus(status: string): string {
  if (status === 'active') return 'Active';
  if (status === 'offline') return 'Offline';
  return 'Non-participating';
}

function normalizeStatus(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === 'online') return 'active';
  if (normalized === 'offline') return 'offline';
  return 'not-participating';
}

export class AlgorandService {
  constructor(
    private readonly indexerUrl: string,
    private readonly usdcAssetId: number,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async getWalletIntelligence(address: string): Promise<WalletIntelligence> {
    let response: Response;
    try {
      response = await this.fetchImpl(
        `${this.indexerUrl}/v2/accounts/${encodeURIComponent(address)}`,
        { signal: AbortSignal.timeout(10_000) },
      );
    } catch {
      throw new AlgorandUnavailableError(
        'Could not reach the Algorand Indexer. Check INDEXER_URL and your network connection.',
      );
    }

    if (response.status === 404) throw new WalletNotFoundError(address);
    if (!response.ok) {
      throw new AlgorandUnavailableError(`Algorand Indexer returned HTTP ${response.status}. Try again shortly.`);
    }

    try {
      const body = (await response.json()) as IndexerAccountResponse;
      return mapAccountToIntelligence(body.account, this.usdcAssetId);
    } catch {
      throw new AlgorandUnavailableError('Algorand Indexer returned an unexpected response.');
    }
  }
}

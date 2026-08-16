# x402 Commerce Template Architecture

x402 Commerce Template keeps the paid HTTP concern separate from the wallet-data concern.

```mermaid
flowchart TD
    Client[Client or Agent] -->|GET resource input| API[Hono Resource Server]
    API --> Gate[x402 Middleware]
    Gate -->|Verify and settle| Facilitator[GoPlausible Facilitator]
    Facilitator -->|USDC transfer| Chain[Algorand]
    Chain --> Receiver[Merchant payTo Wallet]
    API -->|Public account lookup| Indexer[Algorand Indexer]
    Indexer -->|Account data| API
    Gate -.->|Discovery metadata| Bazaar[Bazaar Catalog]
```

## Components

### Client

The client asks for a paid response over normal HTTP. An unpaid client stops at the `402`. A paying client interprets the response, chooses a supported requirement, signs with its own wallet, and retries. x402 Commerce Template never receives the payer mnemonic.

### x402 Commerce Template Resource Server

Hono exposes public `GET /health` and paid `GET /api/wallet/:address`. Address syntax is checked before the payment middleware. Once payment is verified, the handler asks the account-data service for the deterministic report.

### x402 Middleware

The middleware declares the exact scheme, USDC price, Algorand network, receiver, MIME type, description, and Bazaar extension. It constructs the `402`, verifies paid retries through the facilitator, and attaches the settlement response.

### GoPlausible Facilitator

The facilitator reports supported scheme/network pairs and handles verification and settlement. The resource server delegates these blockchain-facing operations; it does not hold the merchant key. Successful traffic also feeds GoPlausible's dashboard, Bazaar catalog, and Challenge leaderboard.

### Algorand Network

Algorand is the settlement rail for the USDC asset transfer. TestNet is safe demo infrastructure; MainNet settles real value and is required for current Challenge ranking.

### Algorand Data Provider

x402 Commerce Template separately calls an Algorand Indexer for public account data. It maps microALGO and six-decimal USDC into display units, counts holdings and app state, and creates a deterministic summary. Changing the Indexer does not change the payment protocol.

### Bazaar

Bazaar is discovery, not payment processing. x402 Commerce Template sends a machine-readable input description and output example as an x402 extension. A facilitator can index that metadata after observing a settled request.

### Merchant Wallet

`PAY_TO_ADDRESS` is the public Algorand account that receives USDC. It must be on the configured network and opted into that network's USDC ASA. The server never needs its mnemonic or private key.

## Two Uses of Algorand

```mermaid
flowchart LR
    x402 Commerce Template -->|Account query| Data[Indexer data plane]
    x402 Commerce Template -->|x402 verification request| Pay[Payment control plane]
    Pay --> Facilitator
    Facilitator -->|USDC settlement| Algorand
```

The data request can fail even when payment infrastructure is healthy, and the facilitator can fail even when the Indexer is healthy. Keeping these paths visible makes demo debugging much easier.

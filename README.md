# x402 Commerce Template

This is a starter kit for building paid HTTP APIs that autonomous agents can buy with x402 on Algorand.

It includes a working default paid route, x402 server middleware, paying clients, a local demo agent, Bazaar discovery metadata, a browser payment-flow demo, AI-agent instructions, resource docs, CLI helpers, a sandbox, a payment-flow simulator, SDK helpers, and optional Algorand smart contract templates.

## Start Here

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Then fill in `.env`:

```env
ALGORAND_NETWORK=testnet
PAY_TO_ADDRESS=YOUR_RECEIVER_TESTNET_ADDRESS
CLIENT_MNEMONIC="your disposable payer wallet 25-word mnemonic"
WALLET_ADDRESS=ANY_VALID_TESTNET_ADDRESS_TO_INSPECT
DEMO_MODE=true
```

Open `http://localhost:3000` to run the visual demo.

## Participant Flow

1. Fill `PROJECT_BRIEF.md` with the agentic commerce idea.
2. Ask an AI coding agent to read `AGENTS.md`, `skills.md`, and the project brief.
3. Configure `.env`.
4. Run `pnpm dev`.
5. Test unpaid and paid flows.
6. Customize the paid resource, Bazaar metadata, clients, dashboard, and tests.

The default implementation sells an Algorand wallet data response at `GET /api/wallet/:address`. It is intentionally simple so participants can verify x402 first, then replace the paid resource with their own service.

## What x402 Payment Needs

| Piece | Where |
| --- | --- |
| Public paid route | `src/app.ts` and `src/routes/wallet.ts` |
| Payment middleware | `src/x402/config.ts` |
| Facilitator | `FACILITATOR_URL`, defaults to GoPlausible |
| Receiver wallet | `PAY_TO_ADDRESS` |
| Payment asset | USDC ASA from `@x402/avm` |
| Payer signer | `CLIENT_MNEMONIC` for local TestNet clients only |
| Buyer client | `client/paid-client.ts` and `client/agent-client.ts` |
| Bazaar metadata | `src/x402/config.ts` |
| Visual simulator | `pnpm simulate` and browser dashboard |

## Included Tools

```bash
pnpm build
pnpm test
pnpm smoke
pnpm simulate
pnpm x402 inspect
pnpm x402 checklist
pnpm sandbox
AGENT_SANDBOX_PAY=true pnpm sandbox
pnpm client:unpaid
pnpm client:paid
pnpm client:agent
```

## Folder Map

```text
.
├── AGENTS.md
├── skills.md
├── PROJECT_BRIEF.md
├── client/
├── contracts/templates/
├── docs/resources/
├── sdk/
├── scripts/
├── src/
└── test/
```

## Add Your Own Paid Resource

Ask your AI agent:

```text
Read AGENTS.md, skills.md, and PROJECT_BRIEF.md. Build the paid x402 service described in the brief. Keep the default x402 lifecycle intact, update Bazaar metadata, update the browser demo, and verify with build/tests/smoke/simulator.
```

The agent should change:

- `src/routes/*` for business logic.
- `src/app.ts` for route registration and pre-payment validation.
- `src/x402/config.ts` for payment terms and Bazaar metadata.
- `client/lib.ts` and clients for the buyer URL.
- `src/web/*` for the visual demo.
- `test/*` for route behavior.

## Resources

- `docs/resources/X402_PRIMER.md`
- `docs/resources/ALGORAND_PAYMENT_REQUIREMENTS.md`
- `docs/resources/GOPLAUSIBLE_FACILITATOR.md`
- `docs/resources/BAZAAR_DISCOVERY.md`
- `docs/resources/AGENTIC_COMMERCE_PATTERNS.md`
- `docs/resources/TROUBLESHOOTING_PLAYBOOK.md`
- `docs/resources/IMPLEMENTATION_MAP.md`
- `docs/resources/TECH_STACK.md`
- x402 docs: https://docs.x402.org/introduction
- Algorand x402 guide: https://dev.algorand.co/resources/x402-on-algorand/
- GoPlausible resource catalog: https://facilitator.goplausible.xyz/dashboard/leaderboards?cat=resources

## Safety

- Do not commit `.env`.
- Do not log mnemonics.
- Use disposable TestNet wallets locally.
- Keep payer and receiver as different accounts.
- Keep `DEMO_MODE=false` outside local TestNet demos.
- Reject invalid input before payment middleware.

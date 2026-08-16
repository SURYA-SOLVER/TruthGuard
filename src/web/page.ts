import type { RuntimeConfig } from '../config.js';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function renderPage(config: RuntimeConfig): string {
  const address = escapeHtml(config.defaultWalletAddress);
  const receiver = escapeHtml(config.payTo);
  const demoState = config.demoMode ? 'Agent ready' : 'Demo disabled';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="Buy an Algorand paid resource report with x402 and TestNet USDC." />
    <title>x402 Commerce Template — Paid resource, paid by agents</title>
    <link rel="stylesheet" href="/assets/styles.css" />
    <script src="/assets/app.js" defer></script>
  </head>
  <body>
    <div class="noise" aria-hidden="true"></div>
    <header class="site-header">
      <a class="brand" href="/" aria-label="x402 Commerce Template home">
        <span class="brand-mark">A</span>
        <span>x402 Commerce Template</span>
      </a>
      <div class="header-status">
        <span class="status-dot"></span>
        <span>Algorand ${escapeHtml(config.networkName)}</span>
        <span class="header-divider"></span>
        <span>${demoState}</span>
      </div>
    </header>

    <main>
      <section class="hero">
        <p class="eyebrow">PAID API STARTER · POWERED BY x402</p>
        <h1>Ask an agent.<br /><span>Watch it pay.</span></h1>
        <p class="hero-copy">
          One click triggers a real HTTP 402, a ${escapeHtml(config.price)} USDC payment on Algorand,
          GoPlausible settlement, and an unlocked paid response.
        </p>
      </section>

      <section class="workspace" aria-label="x402 Commerce Template payment demo">
        <div class="demo-panel">
          <div class="panel-heading">
            <div>
              <p class="section-label">LIVE x402 DEMO</p>
              <h2>Purchase a paid response</h2>
            </div>
            <span class="testnet-pill">TESTNET · NO REAL FUNDS</span>
          </div>

          <form id="purchase-form">
            <label for="wallet-address">Algorand resource input</label>
            <div class="input-row">
              <input
                id="wallet-address"
                name="address"
                value="${address}"
                maxlength="58"
                spellcheck="false"
                autocomplete="off"
                required
              />
              <button id="purchase-button" type="submit">
                <span>Ask agent to buy</span>
                <span class="button-arrow" aria-hidden="true">↗</span>
              </button>
            </div>
          </form>

          <div class="terms" aria-label="Payment terms">
            <div><span>Price</span><strong id="term-price">${escapeHtml(config.price)} USDC</strong></div>
            <div><span>Network</span><strong>Algorand TestNet</strong></div>
            <div><span>Asset</span><strong>ASA ${escapeHtml(config.usdcAssetId)}</strong></div>
            <div><span>Receiver</span><strong title="${receiver}">${receiver.slice(0, 7)}…${receiver.slice(-5)}</strong></div>
          </div>

          <div class="activity" aria-live="polite">
            <div class="activity-topline">
              <span>PAYMENT ACTIVITY</span>
              <span id="activity-status">Ready</span>
            </div>
            <ol class="steps">
              <li data-step="challenge"><span class="step-icon">1</span><div><strong>Request resource</strong><small>Call x402 Commerce Template without payment</small></div></li>
              <li data-step="terms"><span class="step-icon">2</span><div><strong>Read HTTP 402</strong><small>Inspect price, network, and asset</small></div></li>
              <li data-step="agent"><span class="step-icon">3</span><div><strong>Agent signs payment</strong><small>Mnemonic stays on the local server</small></div></li>
              <li data-step="settlement"><span class="step-icon">4</span><div><strong>Settle on Algorand</strong><small>GoPlausible verifies and submits</small></div></li>
              <li data-step="report"><span class="step-icon">5</span><div><strong>Unlock result</strong><small>Render the paid JSON response</small></div></li>
            </ol>
            <p id="activity-message" class="activity-message">Enter an address and ask the agent to begin.</p>
          </div>
        </div>

        <aside class="explainer">
          <p class="section-label">WHAT HAPPENS</p>
          <h2>No login. No API key.</h2>
          <p>An autonomous client understands the price directly from the HTTP response and pays only for this request.</p>
          <div class="flow-list">
            <div><span>01</span><p><strong>Discover terms</strong><small>402 Payment Required</small></p></div>
            <div><span>02</span><p><strong>Authorize USDC</strong><small>Exact AVM scheme</small></p></div>
            <div><span>03</span><p><strong>Confirm settlement</strong><small>Algorand transaction receipt</small></p></div>
          </div>
          <div class="safety-note">
            <span aria-hidden="true">◇</span>
            <p><strong>Demo-safe</strong><br />The one-click agent is TestNet-only and never sends the mnemonic to the browser.</p>
          </div>
        </aside>
      </section>

      <section id="result" class="result" hidden>
        <div class="result-heading">
          <div>
            <p class="section-label success-label">SETTLEMENT CONFIRMED</p>
            <h2>Paid resource unlocked</h2>
          </div>
          <a id="explorer-link" class="explorer-link" href="#" target="_blank" rel="noreferrer">View transaction ↗</a>
        </div>
        <div class="metrics">
          <article><span>ALGO balance</span><strong id="metric-algo">—</strong></article>
          <article><span>Asset holdings</span><strong id="metric-assets">—</strong></article>
          <article><span>USDC balance</span><strong id="metric-usdc">—</strong></article>
          <article><span>Account status</span><strong id="metric-status">—</strong></article>
        </div>
        <div class="result-bottom">
          <div><span>SUMMARY</span><p id="report-summary">—</p></div>
          <div><span>TRANSACTION</span><code id="transaction-id">—</code></div>
        </div>
      </section>
    </main>

    <footer>
      <span>x402 Commerce Template / x402 demo</span>
      <span>HTTP → USDC → Algorand → JSON</span>
    </footer>
  </body>
</html>`;
}

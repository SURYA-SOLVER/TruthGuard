export const APP_SCRIPT = String.raw`
const form = document.querySelector('#purchase-form');
const button = document.querySelector('#purchase-button');
const input = document.querySelector('#wallet-address');
const statusText = document.querySelector('#activity-status');
const message = document.querySelector('#activity-message');
const result = document.querySelector('#result');
const stepNames = ['challenge', 'terms', 'agent', 'settlement', 'report'];

function stepElement(name) {
  return document.querySelector('[data-step="' + name + '"]');
}

function resetSteps() {
  for (const name of stepNames) stepElement(name).className = '';
  result.hidden = true;
}

function setStep(name, state, text) {
  stepElement(name).className = state;
  if (text) message.textContent = text;
  statusText.textContent = state === 'failed' ? 'Needs attention' : state === 'done' ? 'In progress' : 'Working';
}

function decodePaymentRequired(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  return JSON.parse(atob(padded));
}

function formatPrice(requirement) {
  const decimals = requirement.extra?.decimals ?? 6;
  return '$' + (Number(requirement.amount) / 10 ** decimals) + ' USDC';
}

function renderResult(data) {
  document.querySelector('#metric-algo').textContent = data.report.algoBalance.toLocaleString();
  document.querySelector('#metric-assets').textContent = String(data.report.assetCount);
  document.querySelector('#metric-usdc').textContent = data.report.usdcBalance.toLocaleString();
  document.querySelector('#metric-status').textContent = data.report.status;
  document.querySelector('#report-summary').textContent = data.report.summary;
  document.querySelector('#transaction-id').textContent = data.payment.transaction;
  document.querySelector('#explorer-link').href = data.payment.explorer;
  result.hidden = false;
  result.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  resetSteps();
  button.disabled = true;
  const address = input.value.trim();

  try {
    setStep('challenge', 'active', 'Requesting the protected paid response…');
    const challenge = await fetch('/api/wallet/' + encodeURIComponent(address));
    if (challenge.status !== 402) {
      const detail = await challenge.json().catch(() => ({}));
      throw new Error(detail.message || 'Expected HTTP 402, received ' + challenge.status + '.');
    }
    setStep('challenge', 'done', 'x402 Commerce Template responded with HTTP 402 Payment Required.');

    setStep('terms', 'active', 'Reading machine-readable payment requirements…');
    const header = challenge.headers.get('payment-required');
    if (!header) throw new Error('The 402 response did not include PAYMENT-REQUIRED.');
    const paymentRequired = decodePaymentRequired(header);
    const requirement = paymentRequired.accepts?.[0];
    if (!requirement) throw new Error('No supported payment requirement was advertised.');
    document.querySelector('#term-price').textContent = formatPrice(requirement);
    setStep('terms', 'done', 'Terms accepted: ' + formatPrice(requirement) + ' on Algorand TestNet.');

    setStep('agent', 'active', 'The local demo agent is constructing and signing the USDC payment…');
    const paid = await fetch('/demo/purchase', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ address }),
    });
    const data = await paid.json().catch(() => ({}));
    if (!paid.ok) throw new Error(data.message || 'The agent purchase failed with HTTP ' + paid.status + '.');
    setStep('agent', 'done', 'The agent signed the payment without exposing its mnemonic.');
    setStep('settlement', 'done', 'GoPlausible settled transaction ' + data.payment.transaction.slice(0, 12) + '…');
    setStep('report', 'done', 'Payment confirmed. Paid resource unlocked.');
    statusText.textContent = 'Complete';
    renderResult(data);
  } catch (error) {
    const active = document.querySelector('.steps li.active');
    if (active) active.className = 'failed';
    statusText.textContent = 'Failed';
    message.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    button.disabled = false;
  }
});
`;

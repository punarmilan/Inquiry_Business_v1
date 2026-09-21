// Tiny server-rendered pages for the browser leg of a Razorpay payment: the
// checkout launcher and the "you're done, go back to the app" result page.

// Matches `scheme` in mobile/frontend/app.json.
const APP_SCHEME = 'inquiryexperts';
const BRAND_COLOR = '#F45B18';

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

// Built from char codes so no raw line-separator characters end up in this source file.
const LINE_SEPARATORS = new RegExp(`[${String.fromCharCode(0x2028)}${String.fromCharCode(0x2029)}]`, 'g');

// JSON that is safe inside an inline <script> (no "</script>" or line-separator breakouts).
const scriptJson = (value) =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(LINE_SEPARATORS, (char) => '\\u' + char.charCodeAt(0).toString(16));

const styles = `
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#F6F8F8;color:#0B2A30}
  main{width:100%;max-width:420px;background:#fff;border-radius:20px;padding:28px 24px;text-align:center;box-shadow:0 6px 24px rgba(2,52,61,.08)}
  h1{font-size:20px;margin:0 0 4px}
  .brand{font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${BRAND_COLOR};margin:0 0 18px}
  .plan{margin:0;color:#4A6168}
  .amount{font-size:34px;font-weight:800;margin:6px 0 20px}
  .badge{width:64px;height:64px;border-radius:50%;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;font-size:32px;color:#fff}
  .success{background:#1E9E5A}.failed{background:#D64545}.pending{background:#E0A020}
  p.msg{color:#4A6168;line-height:1.5;margin:8px 0 20px}
  a.btn,button{display:block;width:100%;padding:14px 16px;border:0;border-radius:14px;background:${BRAND_COLOR};color:#fff;font-size:16px;font-weight:700;text-decoration:none;cursor:pointer}
  #note{margin:14px 0 0;font-size:13px;color:#4A6168}
`;

// The app asks which method to pay with before checkout opens. Razorpay then
// shows just that one (config.display: a single block, default blocks off).
const METHOD_TITLES = { upi: 'UPI', card: 'Card', netbanking: 'Netbanking' };

const displayConfig = (method) =>
  METHOD_TITLES[method]
    ? {
        display: {
          blocks: { [`only_${method}`]: { name: `Pay via ${METHOD_TITLES[method]}`, instruments: [{ method }] } },
          sequence: [`block.only_${method}`],
          preferences: { show_default_blocks: false },
        },
      }
    : undefined;

/** Loads Razorpay Standard Checkout in redirect mode: after paying, the browser POSTs the result to `callbackPath`. */
const renderCheckoutPage = ({ keyId, orderId, amountPaise, amountLabel, planName, description, prefill = {}, callbackPath, method }) => {
  const config = {
    key: keyId,
    orderId,
    amount: amountPaise,
    description,
    prefill: Object.fromEntries(Object.entries(prefill).filter(([, value]) => typeof value === 'string' && value)),
    callbackPath,
    config: displayConfig(method),
  };
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>InquiryExperts · Payment</title>
<style>${styles}</style>
</head>
<body>
<main>
  <p class="brand">InquiryExperts</p>
  <p class="plan">${escapeHtml(planName)}</p>
  <p class="amount">₹${escapeHtml(amountLabel)}</p>
  <button id="pay" type="button">${METHOD_TITLES[method] ? `Pay with ${METHOD_TITLES[method]}` : 'Pay securely'}</button>
  <p id="note">Opening secure checkout…</p>
</main>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
(function () {
  var cfg = ${scriptJson(config)};
  var note = document.getElementById('note');
  if (typeof Razorpay !== 'function') {
    note.textContent = 'Could not load the payment window. Check your connection and reload this page.';
    return;
  }
  var rzp = new Razorpay({
    key: cfg.key,
    order_id: cfg.orderId,
    amount: cfg.amount,
    currency: 'INR',
    name: 'InquiryExperts',
    description: cfg.description,
    prefill: cfg.prefill,
    config: cfg.config,
    theme: { color: '${BRAND_COLOR}' },
    redirect: true,
    callback_url: window.location.origin + cfg.callbackPath,
    modal: { ondismiss: function () { note.textContent = 'Checkout closed. Tap the button to try again, or go back to the app.'; } }
  });
  document.getElementById('pay').addEventListener('click', function () { rzp.open(); });
  rzp.open();
})();
</script>
</body>
</html>`;
};

const RESULT_ICONS = { success: '✓', failed: '✕', pending: '…' };

const appLink = (paymentId, tone) =>
  `${APP_SCHEME}://payment-result?${paymentId ? `paymentId=${encodeURIComponent(paymentId)}&` : ''}status=${tone}`;

/** Final page after the callback. Tapping the button (a user gesture) is the reliable way back to the app. */
const renderResultPage = ({ tone, title, message, paymentId, nonce }) => {
  const link = appLink(paymentId, tone);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>InquiryExperts · Payment</title>
<style>${styles}</style>
</head>
<body>
<main>
  <p class="brand">InquiryExperts</p>
  <div class="badge ${tone}">${RESULT_ICONS[tone] || RESULT_ICONS.pending}</div>
  <h1>${escapeHtml(title)}</h1>
  <p class="msg">${escapeHtml(message)}</p>
  <a class="btn" href="${escapeHtml(link)}">Return to the app</a>
</main>
<script nonce="${escapeHtml(nonce)}">setTimeout(function () { window.location.href = ${scriptJson(link)}; }, 900);</script>
</body>
</html>`;
};

module.exports = { APP_SCHEME, escapeHtml, renderCheckoutPage, renderResultPage };

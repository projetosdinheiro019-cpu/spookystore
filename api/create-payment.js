export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const apiKey = process.env.PANTERAPAY_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'payment_gateway_not_configured' });

  try {
    const { amount } = req.body || {};
    const cents = Math.round(Number(amount));
    if (!Number.isFinite(cents) || cents < 50) {
      return res.status(400).json({ error: 'invalid_amount' });
    }

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const webhook = `${proto}://${host}/api/webhook/panterapay`;

    const response = await fetch('https://panterapay-production.up.railway.app/transactions', {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ amount: cents, webhook })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'gateway_error',
        details: data
      });
    }

    return res.status(200).json({
      id: data.id,
      status: data.status,
      amount: data.amount,
      qrCodeBase64: data.qrCodeBase64,
      copyPaste: data.copyPaste,
      expiresAt: data.expiresAt,
      fee: data.fee
    });
  } catch (error) {
    return res.status(500).json({ error: 'payment_creation_failed' });
  }
}

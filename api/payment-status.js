export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const apiKey = process.env.PANTERAPAY_API_KEY;
  const id = String(req.query?.id || '').trim();
  if (!apiKey) return res.status(500).json({ error: 'payment_gateway_not_configured' });
  if (!id) return res.status(400).json({ error: 'missing_transaction_id' });

  try {
    const response = await fetch(`https://panterapay-production.up.railway.app/transactions/${encodeURIComponent(id)}`, {
      headers: { Authorization: apiKey }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(response.status).json({ error: 'gateway_error', details: data });

    return res.status(200).json({
      id: data.id,
      status: data.status,
      amount: data.amount,
      expiresAt: data.expiresAt
    });
  } catch {
    return res.status(500).json({ error: 'payment_status_failed' });
  }
}

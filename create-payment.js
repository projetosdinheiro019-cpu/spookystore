import { supabaseFetch } from './_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const apiKey = process.env.PANTERAPAY_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'payment_gateway_not_configured' });
  const orderId = String(req.body?.orderId || '').trim();
  if (!orderId) return res.status(400).json({ error: 'missing_order_id' });

  try {
    const orders = await supabaseFetch(`orders?order_number=eq.${encodeURIComponent(orderId)}&select=id,order_number,status,payment_status,total_cents,panterapay_transaction_id&limit=1`, { method: 'GET' });
    const order = orders?.[0];
    if (!order) return res.status(404).json({ error: 'order_not_found' });
    if (order.panterapay_transaction_id) {
      return res.status(200).json({ id: order.panterapay_transaction_id, status: order.payment_status || 'pending', amount: order.total_cents });
    }
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const webhook = `${proto}://${host}/api/webhook/panterapay?orderId=${encodeURIComponent(orderId)}`;
    const response = await fetch('https://panterapay-production.up.railway.app/transactions', {
      method: 'POST', headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Number(order.total_cents), webhook })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(response.status).json({ error: 'gateway_error', details: data });
    await supabaseFetch(`orders?id=eq.${encodeURIComponent(order.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ panterapay_transaction_id: data.id, payment_status: data.status || 'pending', status: 'awaiting_payment', payment_expires_at: data.expiresAt || null }) });
    return res.status(200).json({ id: data.id, status: data.status, amount: data.amount, qrCodeBase64: data.qrCodeBase64, copyPaste: data.copyPaste, expiresAt: data.expiresAt, fee: data.fee, orderId });
  } catch (error) {
    console.error('create-payment', error);
    return res.status(error.status || 500).json({ error: error.message === 'supabase_not_configured' ? 'database_not_configured' : 'payment_creation_failed', details: error.details || undefined });
  }
}

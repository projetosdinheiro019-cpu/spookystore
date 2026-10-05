import { supabaseFetch } from './_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const apiKey = process.env.PANTERAPAY_API_KEY;
  const id = String(req.query?.id || '').trim();
  if (!apiKey) return res.status(500).json({ error: 'payment_gateway_not_configured' });
  if (!id) return res.status(400).json({ error: 'missing_transaction_id' });
  try {
    const response = await fetch(`https://panterapay-production.up.railway.app/transactions/${encodeURIComponent(id)}`, { headers: { Authorization: apiKey } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(response.status).json({ error: 'gateway_error', details: data });
    const status = String(data.status || 'pending').toLowerCase();
    const mapped = ['approved','paid','completed','success'].includes(status) ? 'paid' : ['failed','expired','cancelled','canceled'].includes(status) ? 'failed' : 'pending';
    const orders = await supabaseFetch(`orders?panterapay_transaction_id=eq.${encodeURIComponent(id)}&select=id,order_number,total_cents&limit=1`, { method: 'GET' });
    const order = orders?.[0];
    if (order) {
      if (mapped === 'paid') {
        await supabaseFetch('rpc/mark_order_paid', { method: 'POST', body: JSON.stringify({ p_order_id: order.id, p_transaction_id: id }) });
      } else {
        await supabaseFetch(`orders?id=eq.${encodeURIComponent(order.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ payment_status: mapped, status: mapped === 'failed' ? 'payment_failed' : 'awaiting_payment' }) });
      }
    }
    return res.status(200).json({ id: data.id, status: data.status, amount: data.amount, expiresAt: data.expiresAt, orderId: order?.order_number || null });
  } catch (error) {
    console.error('payment-status', error);
    return res.status(error.status || 500).json({ error: error.message === 'supabase_not_configured' ? 'database_not_configured' : 'payment_status_failed' });
  }
}

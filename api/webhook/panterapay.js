import { supabaseFetch } from '../_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    const body = req.body || {};
    const event = String(body.event || body.type || '').toLowerCase();
    const orderId = String(req.query?.orderId || body.orderId || body.order_number || '').trim();
    const transactionId = String(body.id || body.transactionId || body.transaction_id || '').trim();
    const approved = event === 'payment.approved' || ['approved','paid','completed','success'].includes(String(body.status || '').toLowerCase());
    const failed = event === 'payment.failed' || ['failed','expired','cancelled','canceled'].includes(String(body.status || '').toLowerCase());
    if (!orderId && !transactionId) return res.status(200).json({ received: true });
    let orders = [];
    if (orderId) orders = await supabaseFetch(`orders?order_number=eq.${encodeURIComponent(orderId)}&select=id,order_number&limit=1`, { method: 'GET' });
    else orders = await supabaseFetch(`orders?panterapay_transaction_id=eq.${encodeURIComponent(transactionId)}&select=id,order_number&limit=1`, { method: 'GET' });
    const order = orders?.[0];
    if (order && (approved || failed)) {
      if (approved) {
        await supabaseFetch('rpc/mark_order_paid', { method: 'POST', body: JSON.stringify({ p_order_id: order.id, p_transaction_id: transactionId || null }) });
      } else {
        await supabaseFetch(`orders?id=eq.${encodeURIComponent(order.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ payment_status: 'failed', status: 'payment_failed' }) });
      }
      await supabaseFetch('payment_events', { method: 'POST', body: JSON.stringify({ order_id: order.id, transaction_id: transactionId || null, event_type: event || 'status_update', payload: body }) });
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('panterapay-webhook', error);
    return res.status(200).json({ received: true });
  }
}

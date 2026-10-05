import { supabaseFetch } from './_supabase.js';

function validEmail(v) { return /^\S+@\S+\.\S+$/.test(String(v || '').trim()); }
function cleanOrder(v) { return String(v || '').trim().toUpperCase(); }

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    const email = String(req.query?.email || '').trim().toLowerCase();
    const orderNumber = cleanOrder(req.query?.order);
    if (!validEmail(email) || !/^SPK-[A-Z0-9]{8}$/.test(orderNumber)) {
      return res.status(400).json({ error: 'invalid_lookup' });
    }
    const rows = await supabaseFetch(`orders?order_number=eq.${encodeURIComponent(orderNumber)}&customer_email=eq.${encodeURIComponent(email)}&select=id,order_number,status,payment_status,panterapay_transaction_id,payment_expires_at,paid_at,customer_name,customer_email,shipping_cep,shipping_street,shipping_number,shipping_complement,shipping_neighborhood,shipping_city,shipping_state,subtotal_cents,discount_cents,shipping_cents,total_cents,coupon_code,created_at,updated_at&limit=1`, { method:'GET' });
    if (!rows?.length) return res.status(404).json({ error:'order_not_found' });
    const order=rows[0];
    const items=await supabaseFetch(`order_items?order_id=eq.${encodeURIComponent(order.id)}&select=product_id,product_name,unit_price_cents,quantity,total_cents&order=created_at.asc`, { method:'GET' });
    return res.status(200).json({ order, items });
  } catch (error) {
    console.error('order lookup', error);
    return res.status(500).json({ error: error.message === 'supabase_not_configured' ? 'database_not_configured' : 'order_lookup_failed' });
  }
}

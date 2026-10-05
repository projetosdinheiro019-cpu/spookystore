import { supabaseFetch } from './_supabase.js';

const ALLOWED_COUPONS = { SPOOKY10: 10 };
const FREE_SHIPPING_CENTS = 19900;
const FLAT_SHIPPING_CENTS = 1990;

function cleanDigits(value='') { return String(value).replace(/\D/g, ''); }
function validEmail(v) { return /^\S+@\S+\.\S+$/.test(String(v || '').trim()); }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    const body = req.body || {};
    const c = body.customer || {};
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) return res.status(400).json({ error: 'cart_empty' });
    const customer = {
      name: String(c.name || '').trim(), email: String(c.email || '').trim().toLowerCase(),
      phone: cleanDigits(c.phone), cpf: cleanDigits(c.cpf), cep: cleanDigits(c.cep),
      street: String(c.street || '').trim(), number: String(c.number || '').trim(),
      complement: String(c.complement || '').trim(), neighborhood: String(c.neighborhood || '').trim(),
      city: String(c.city || '').trim(), state: String(c.state || '').trim().toUpperCase()
    };
    if (customer.name.length < 3 || !validEmail(customer.email) || customer.phone.length < 10 || customer.cpf.length !== 11 || customer.cep.length !== 8 || !customer.street || !customer.number || !customer.neighborhood || !customer.city || customer.state.length !== 2) {
      return res.status(400).json({ error: 'invalid_customer_data' });
    }
    if (body.terms !== undefined && body.terms !== true) return res.status(400).json({ error: 'terms_required' });

    const ids = [...new Set(items.map(x => Number(x.productId)).filter(Number.isInteger))];
    if (!ids.length || ids.length !== items.length) return res.status(400).json({ error: 'invalid_items' });
    const productRows = await supabaseFetch(`products?id=in.(${ids.join(',')})&select=id,name,price_cents,active,stock`, { method: 'GET' });
    const byId = new Map(productRows.map(p => [Number(p.id), p]));
    const normalized = [];
    let subtotal = 0;
    for (const item of items) {
      const p = byId.get(Number(item.productId));
      const qty = Math.max(1, Math.min(20, Number(item.quantity) || 1));
      if (!p || !p.active || Number(p.stock) < qty) return res.status(409).json({ error: 'product_unavailable', productId: item.productId });
      normalized.push({ product: p, quantity: qty });
      subtotal += Number(p.price_cents) * qty;
    }
    const couponCode = String(body.coupon || '').trim().toUpperCase();
    const discountPercent = ALLOWED_COUPONS[couponCode] || 0;
    const discount = Math.round(subtotal * discountPercent / 100);
    const taxable = Math.max(0, subtotal - discount);
    const shipping = taxable >= FREE_SHIPPING_CENTS ? 0 : FLAT_SHIPPING_CENTS;
    const total = taxable + shipping;
    const orderId = `SPK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const [order] = await supabaseFetch('orders', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        order_number: orderId, status: 'pending_payment', payment_status: 'pending',
        customer_name: customer.name, customer_email: customer.email, customer_phone: customer.phone,
        customer_cpf: customer.cpf, shipping_cep: customer.cep, shipping_street: customer.street,
        shipping_number: customer.number, shipping_complement: customer.complement,
        shipping_neighborhood: customer.neighborhood, shipping_city: customer.city, shipping_state: customer.state,
        subtotal_cents: subtotal, discount_cents: discount, shipping_cents: shipping, total_cents: total,
        coupon_code: discountPercent ? couponCode : null
      })
    });

    for (const row of normalized) {
      await supabaseFetch('order_items', {
        method: 'POST',
        body: JSON.stringify({ order_id: order.id, product_id: row.product.id, product_name: row.product.name, unit_price_cents: row.product.price_cents, quantity: row.quantity, total_cents: Number(row.product.price_cents) * row.quantity })
      });
    }

    return res.status(201).json({ orderId, totalCents: total, subtotalCents: subtotal, discountCents: discount, shippingCents: shipping });
  } catch (error) {
    console.error('create-order', error);
    return res.status(error.status || 500).json({ error: error.message === 'supabase_not_configured' ? 'database_not_configured' : 'order_creation_failed', details: error.details || undefined });
  }
}

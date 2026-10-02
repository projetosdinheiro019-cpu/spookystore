export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  // PanteraPay uses this endpoint for real-time notifications.
  // The storefront also polls the transaction status from the server,
  // so no payment is considered approved from browser input alone.
  const event = req.body?.event || 'webhook.test';
  console.log('PanteraPay webhook:', event, req.body || {});

  return res.status(200).json({ received: true });
}

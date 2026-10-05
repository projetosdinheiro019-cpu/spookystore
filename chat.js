export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { message, history = [], products = [] } = req.body || {};
    if (!message || typeof message !== 'string') return res.status(400).json({ error: 'Mensagem inválida' });

    // Optional Gemini integration. If no key is configured, the frontend uses its safe local fallback.
    const key = process.env.GEMINI_API_KEY;
    if (!key) return res.status(200).json({ reply: 'Vou te ajudar pela busca da loja. Escolha uma categoria ou descreva o produto que procura.', productIds: [] });

    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const catalog = products.map(p => `${p.id}|${p.name}|${p.cat}|R$ ${Number(p.price).toFixed(2)}|nota ${p.rating}`).join('\n');
    const contents = [
      { role: 'user', parts: [{ text: `Você é o Spooky Assistant, atendente da loja de Halloween Spooky Store. Responda em português do Brasil, de forma curta, útil e comercial sem pressionar o cliente. Nunca invente estoque, prazo, política, desconto ou características. Quando recomendar produtos, escolha somente IDs do catálogo. Se não souber, diga que não sabe. Retorne JSON válido no formato {"reply":"...","productIds":[1,2]}. Catálogo:\n${catalog}` }] },
      ...history.slice(-10).map(m => ({ role: m.role === 'bot' ? 'model' : 'user', parts: [{ text: String(m.text).slice(0, 1200) }] })),
      { role: 'user', parts: [{ text: message }] }
    ];
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents, generationConfig: { temperature: 0.35, responseMimeType: 'application/json' } })
    });
    const data = await response.json();
    if (!response.ok) return res.status(502).json({ error: 'Falha no assistente' });
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsed = JSON.parse(raw);
    const validIds = new Set(products.map(p => p.id));
    const productIds = Array.isArray(parsed.productIds) ? parsed.productIds.filter(id => validIds.has(id)).slice(0,3) : [];
    return res.status(200).json({ reply: String(parsed.reply || 'Posso ajudar a encontrar um produto ou explicar o checkout.'), productIds });
  } catch (e) {
    return res.status(500).json({ error: 'Erro interno' });
  }
}

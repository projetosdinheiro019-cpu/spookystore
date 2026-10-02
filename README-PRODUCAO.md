# Spooky Store — checkout completo

## 1. Supabase
1. Abra Supabase > SQL Editor.
2. Execute `supabase-schema.sql`.
3. O script cria produtos, pedidos, itens e eventos de pagamento.

## 2. Vercel
Configure estas Environment Variables:
- `PANTERAPAY_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

A chave `SUPABASE_SERVICE_ROLE_KEY` nunca deve aparecer no HTML.

## 3. PanteraPay
Configure o webhook para:
`https://SEU-DOMINIO/api/webhook/panterapay`

Ative pelo menos `payment.approved` e `payment.failed`.

## 4. Fluxo
Checkout -> `/api/create-order` -> Supabase -> `/api/create-payment` -> PanteraPay -> PIX -> `/api/payment-status` + webhook -> pedido pago.

## 5. Frete
O projeto usa a regra inicial:
- R$ 0,00 a partir de R$ 199,00
- R$ 19,90 abaixo disso

Para frete por transportadora/Correios, substitua a regra no `create-order.js` por uma API de frete com credenciais próprias.

## 6. Segurança
- Não coloque `sk_live_...` no navegador.
- Não coloque a service role do Supabase no navegador.
- Antes de produção, configure uma política de retenção para CPF e demais dados pessoais conforme sua necessidade de LGPD.
- O webhook deve seguir o mecanismo de assinatura da PanteraPay disponível na documentação da sua conta; o código registra os eventos recebidos.

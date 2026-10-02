# Spooky Store + PanteraPay

## Variável de ambiente na Vercel

Configure:

`PANTERAPAY_API_KEY=sk_live_...`

Nunca coloque essa chave no `index.html`.

## Endpoints criados

- `POST /api/create-payment` — cria a cobrança PIX.
- `GET /api/payment-status?id=...` — consulta o status no servidor.
- `POST /api/webhook/panterapay` — recebe notificações da PanteraPay.

A API usa o endpoint mostrado na documentação do painel:

`https://panterapay-production.up.railway.app/transactions`

O valor é enviado em centavos.

## Configuração do webhook

A URL pública será:

`https://SEU-DOMINIO/api/webhook/panterapay`

No painel da PanteraPay, cadastre o evento `payment.approved` (e, se quiser, `payment.failed`).

A função também responde ao POST de teste exigido pelo painel.

## Deploy

Suba a pasta do projeto para a Vercel. Depois adicione a variável `PANTERAPAY_API_KEY` em Settings → Environment Variables e faça um novo deploy.

O checkout chama a API somente pelo backend, então a chave secreta não é exposta ao navegador.

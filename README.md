# Publishub — scanner de acessibilidade para lojas Shopify

**Fix it before you publish.**

O lojista cola a URL da loja e, em cerca de um minuto, recebe um relatório com os problemas de acessibilidade (WCAG 2.2 AA) que mais aparecem em processos ADA. Para cada problema: a regra, a gravidade, a página, o elemento, o trecho do HTML, uma explicação em inglês simples e como corrigir. O lojista pode reservar o **Founding plan** (US$ 49, abatidos do plano de US$ 79/mês) para ter a correção automática quando o app da Shopify lançar.

O site inteiro é em inglês (EUA) e precisa passar no WCAG 2.2 AA: vendemos acessibilidade.

> O produto anterior (análise de retenção de vídeos curtos) foi isolado em `frontend/legacy/` e `backend/`. Veja [O que é legado](#o-que-é-legado).

---

## Arquitetura

```text
Navegador ──► Next.js na Vercel (frontend/)
               ├─ páginas: /, /scan/[id], /scan/sample, /admin, /reserve/success,
               │           /shopify-ada-compliance-checker, /accessibility-statement, /privacy, /terms
               └─ API (runtime Node):
                  POST /api/scan              valida a URL, rate limit, cria o scan ("queued")
                  GET  /api/scan/[id]         relatório (top 3 aberto; o resto com e-mail)
                  POST /api/scan/[id]/unlock  e-mail → leads, abre o relatório neste navegador
                  POST /api/scan/[id]/run     roda um scan da fila (admin ou INTERNAL_SECRET)
                  POST /api/checkout          Stripe Checkout da reserva (US$ 49)
                  POST /api/stripe/webhook    reserva paga / expirada / reembolsada
                  GET  /api/admin/data        scans, leads e reservas (só ADMIN_EMAIL)
                  POST /api/admin/scans       scan em lote (CSV)
                        │
                        ▼
               Supabase (Postgres, service_role no servidor; Auth só para o /admin)
                        ▲
                        │ fila da tabela scans (SCANNER_MODE=worker)
               Worker opcional (Railway ou Fly.io): npm run worker
```

### O scanner

`frontend/src/lib/scanner/`:

- **`url.ts`**: normaliza a URL (só http/https, sem usuário e senha, sem porta fora do padrão, sem IP direto, sem localhost) e resolve o DNS para recusar redes internas (proteção contra SSRF). O navegador também bloqueia pedidos a IPs internos.
- **`scan.ts`**:
  - abre a loja no Chromium (`puppeteer-core`, com `@sparticuz/chromium` em produção) e detecta Shopify (`window.Shopify`, `/cdn/shop/`, `cdn.shopify.com` ou a meta `shopify-checkout-api-token`);
  - percorre até 4 páginas: home, `/collections/all`, um produto (achado nos links da coleção ou em `/products.json?limit=1`) e `/cart`;
  - injeta o **axe-core** em cada página, com as tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` e `wcag22aa`;
  - tem timeout por página e um prazo total. Imagens, vídeos e fontes não são baixados (não mudam o resultado do axe);
  - se apresenta com o user-agent `PublishubScanner/1.0 (+https://getpublishub.com/scanner)`.
- **`rules.ts`**: título, explicação em inglês simples e orientação de correção das regras mais comuns em lojas.
- **`score.ts`**: o risk score de 0 a 100, sempre rotulado como "estimated risk indicator". Cada regra soma pontos pela gravidade (critical 10, serious 7, moderate 4, minor 1), multiplicados por 1,5 nas categorias mais citadas em processos (texto alternativo, contraste, nomes de botões e links, rótulos, foco e teclado, ARIA). As ocorrências pesam em escala logarítmica, e uma curva leva o total para 0 a 100.

### Os dois modos (`SCANNER_MODE`)

| Modo | Quem roda o scan | Quando usar |
|---|---|---|
| `vercel` (padrão) | A própria `POST /api/scan`, depois de responder (`after()`), com `maxDuration` de 60 s e 2048 MB (`vercel.json`). O scan para em ~48 s. | Para começar. Na Allbirds, as 4 páginas levaram 27 s. |
| `worker` | O worker (`npm run worker`) consome a fila da tabela `scans`. A rota só enfileira. | Se lojas pesadas estourarem os 60 s, ou para lotes grandes. |

O worker **não precisa de URL**: ele lê a fila direto do banco. Basta ligar `SCANNER_MODE=worker` na Vercel e subir o worker.

**Worker na Railway:**
1. Crie um serviço novo com root directory `frontend`.
2. Use o start command `npm run worker`.
3. Configure as variáveis `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SCANNER_MODE=worker` e, para métricas, `NEXT_PUBLIC_POSTHOG_KEY`.

O `@sparticuz/chromium` roda em qualquer Linux x64.

Scans parados por mais de 4 minutos (função encerrada no meio) viram `failed` na próxima leitura do relatório.

### Status de um scan

`queued` → `running` → `done` | `failed`. As páginas ficam em `scan_pages`, com status `running`, `done`, `failed` ou `skipped`.

---

## Banco de dados

Migração **aditiva**: `supabase/migrations/20261107000000_accessibility_scanner.sql`.

| Tabela | O que guarda |
|---|---|
| `scans` | id (uuid), url, is_shopify, status, risk_score, created_at, ip_hash, source, error, started_at, finished_at, summary |
| `scan_pages` | scan_id, url, kind, status, error, issue_count |
| `issues` | scan_id, page_url, rule_id, impact, selector, html_snippet, help, help_url, explanation, fix_guidance, occurrences |
| `leads` | já existia; ganha store_url, scan_id e source (colunas opcionais) |
| `reservations` | email, store_url, scan_id, stripe_session_id, stripe_payment_intent, status, amount, currency, created_at, paid_at |

O RLS fica ligado em todas, sem policies: só o servidor (service_role) lê e escreve. O relatório é lido pelo servidor a partir do id (uuid aleatório). Nenhuma tabela do produto anterior é apagada.

**Aplicar:** abra o SQL Editor do Supabase, cole o arquivo e rode, ou use `supabase db push`.

---

## Configuração

### 1. Supabase
1. Aplique a migração acima.
2. Em Authentication → URL Configuration, inclua `https://www.getpublishub.com/admin` nas Redirect URLs, para o link de login do /admin.
3. O dono entra no /admin com a conta do Supabase de e-mail igual a `ADMIN_EMAIL`, por senha ou por link mágico. A conta precisa existir.

### 2. Stripe (Founding plan)
1. Crie o produto "Publishub Founding plan reservation" com um preço **único** de US$ 49. Copie o id do preço (`price_...`) para `STRIPE_FOUNDING_PRICE_ID`. Sem ele, o Checkout cria o preço na hora.
2. Em Developers → Webhooks, crie um endpoint `https://www.getpublishub.com/api/stripe/webhook` com os eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired` e `charge.refunded`. Copie o segredo (`whsec_...`) para `STRIPE_FOUNDING_WEBHOOK_SECRET`.
3. O endpoint antigo, do backend Python na Railway, continua recebendo eventos da conta. Ele ignora o que não conhece, mas vale desativá-lo quando o backend antigo for desligado.

### 3. Variáveis de ambiente (Vercel)

**Novas:**

| Variável | Para quê |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Servidor: scans, relatórios, leads e reservas. Nunca com `NEXT_PUBLIC_`. |
| `ADMIN_EMAIL` | E-mail (ou lista separada por vírgula) que abre o /admin |
| `STRIPE_SECRET_KEY` | Checkout e webhook |
| `STRIPE_FOUNDING_PRICE_ID` | O preço de US$ 49 |
| `STRIPE_FOUNDING_WEBHOOK_SECRET` | Assinatura do webhook novo |
| `SCANNER_MODE` | `vercel` (padrão) ou `worker` |

**Opcionais novas:**

| Variável | Para quê |
|---|---|
| `SUPABASE_URL` | O padrão é `NEXT_PUBLIC_SUPABASE_URL` |
| `SCAN_DEADLINE_MS` | Prazo total do scan |
| `SCAN_HASH_SECRET` | Sal do hash de IP e do token do relatório (o padrão é a service_role) |
| `CHROME_EXECUTABLE_PATH` | Chrome ou Edge local, em desenvolvimento ou num worker com Chrome próprio |

**Que já existiam e continuam:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` e `INTERNAL_SECRET`.

**Que o site novo não usa mais** (podem sair quando o produto antigo for desligado): `NEXT_PUBLIC_API_URL`, `API_URL`, `CRON_SECRET` e `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`.

Modelo: `frontend/.env.example`.

---

## Rodar localmente

```bash
cd frontend
cp .env.example .env.local      # e preencha
npm install
npm run dev                     # http://localhost:3000
```

Para o scanner rodar localmente, aponte para um Chrome ou Edge instalado:

```bash
CHROME_EXECUTABLE_PATH="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" npm run scan -- allbirds.com
```

`npm run scan` roda o scanner sem banco e imprime as páginas, o risk score e as regras.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Build de produção |
| `npm run test:a11y` | Roda o axe-core nas páginas do próprio site (desktop e celular, temas claro e escuro, com os `<details>` abertos) e **falha se houver violação séria ou crítica**. Precisa do site rodando (`npm run build && npm run start`). Use `BASE_URL` para outro endereço e `CHROME_REMOTE_URL` ou `CHROME_EXECUTABLE_PATH` para escolher o navegador. |
| `npm run worker` | O worker da fila (`SCANNER_MODE=worker`) |
| `npm run scan -- <url>` | O scanner sem banco, para testar |

## Métricas (PostHog)

| Evento | De onde sai |
|---|---|
| `scan_started` | Navegador, quando a API aceita o scan |
| `scan_completed` | Servidor, quando o scan termina; também há `scan_failed` |
| `email_captured` | Navegador, quando o e-mail abre o relatório |
| `checkout_started` | Navegador, ao clicar para reservar |
| `reservation_paid` | Servidor, pelo webhook do Stripe |

## Lista de espera (a home, `/`)

A home de getpublishub.com é a página de acesso antecipado do Publishub para **verificação de código gerado por IA** (público: desenvolvedores). Ela tem cabeçalho e rodapé próprios (`components/waitlist/WaitlistChrome.tsx`).

O scanner de acessibilidade para lojas Shopify continua inteiro, com a landing em **`/scanner`**: os relatórios (`/scan/...`), o Founding plan e as outras páginas não mudaram. O endereço antigo `/verify` redireciona para `/` (307, mantendo a UTM).

**Migração:** `supabase/migrations/20261108100000_waitlist.sql`. É aditiva e precisa ser aplicada **antes do deploy**: sem ela, a inscrição responde erro (nunca um sucesso falso).

| Tabela / função | O que faz |
|---|---|
| `waitlist` | email (único, sem diferença de maiúsculas), name, ai_tool, utm_source, utm_medium, utm_campaign, utm_content, referrer (só o domínio), form, ip_hash, created_at |
| `waitlist_events` | o funil: `page_view`, `cta_click`, `signup`, `share_click`, com a UTM, o domínio de origem e o hash do IP |
| `waitlist_join(...)` | inscreve; devolve `joined`, `duplicate` ou `rate_limited` (5 inscrições novas por IP por hora) |
| `waitlist_track(...)` | grava um evento do navegador (até 120 por IP a cada 10 minutos; `signup` só a própria inscrição grava) |
| `waitlist_report(since)` | o relatório do /admin: totais, conversão por origem, campanhas, cliques, ferramentas e a lista |

RLS ligado sem policies, e as funções só aceitam a `service_role`.

**Anti-spam:** um campo escondido que só robô preenche, um tempo mínimo entre abrir a página e enviar, a recusa de pedidos vindos de outro site (cabeçalho `Origin`) e o limite por IP. O IP nunca é guardado, só o hash.

**Onde ver:**
- **No /admin, painel "Waitlist":** janelas de 24 h, 72 h, 7 dias ou tudo, e o CSV.
- **No SQL Editor:** `select jsonb_pretty(public.waitlist_report(now() - interval '72 hours'));`

**Eventos no PostHog:** `waitlist_cta_clicked`, `waitlist_joined` e `waitlist_share_clicked`. A contagem que vale é a do banco.

**Divulgação:** os textos de lançamento e os links com UTM estão em [`marketing/waitlist-launch/`](marketing/waitlist-launch/README.md).

## Founding Customers (reserva pré-lançamento)

O produto ainda não existe, então **nada é cobrado antes do lançamento**. O card "Founding Customers" fica na seção **Pricing** da home (`#pricing`), ao lado da lista de espera grátis.

**Hoje: a reserva**
- O botão chama `POST /api/founding/checkout`, que abre o Stripe Checkout em **`mode: "setup"`**: o Stripe guarda o cartão (com autorização para cobranças futuras) e cria o cliente.
- **$0 cobrado e nenhuma assinatura criada.** Só cartão (`allowed_payment_method_types: ["card"]`), que é o meio que aceita a cobrança futura.
- O webhook (`checkout.session.completed` em modo setup) grava a reserva em `public.founding_commitments`, com o status `reserved`, o cliente, o SetupIntent, o preço e a UTM.
- O Price ID (`price_1UaLsA2cdYlX3v8aM3XWVcLT`, ou `STRIPE_FOUNDING_CUSTOMERS_PRICE_ID`) vai no metadata da reserva. O Checkout confere se ele é recorrente e mostra o valor na mensagem.
- Os termos ficam em `FOUNDING_TERMS` (`src/lib/founding.ts`): aviso de **7 dias** antes da primeira cobrança e reembolso da primeira mensalidade a pedido em **14 dias**. O card, o Checkout, a página de sucesso e a seção `#founding-customers` de `/terms` leem dali.
- O `/admin` mostra as reservas no painel "Founding Customers".

**No lançamento: a ativação** (`frontend/scripts/founding-activate.mjs`)
1. Rode o ensaio, que não cria nada e lista os e-mails: `node scripts/founding-activate.mjs --first-charge=AAAA-MM-DD`.
2. Mande o e-mail de lançamento para essa lista, com a data da primeira cobrança (no mínimo 7 dias depois), o valor e como cancelar.
3. Rode de novo com `--confirm`. Para cada reserva com cartão confirmado, o script cria a assinatura no Stripe com o **preço guardado na reserva** (o preço de fundador; só reservas antigas sem ele usam o preço atual), o cartão guardado e `trial_end` = a data anunciada: nada é cobrado até lá, e depois é mensal. A reserva vira `activated`.
   - O script recusa uma data a menos de 7 dias.
   - **Uma assinatura por pessoa:** se o mesmo e-mail reservou mais de uma vez, só a reserva mais recente vira assinatura. As outras aparecem como "reserva repetida", para você cancelar e remover o cartão no Stripe.
   - **Rodar de novo não duplica:** antes de criar, ele confere as assinaturas que o cliente já tem no Stripe, além da chave de idempotência, que o Stripe só guarda por 24 h.
   - Ele precisa de uma chave com escrita em Subscriptions e leitura em SetupIntents.
4. Daí em diante, o webhook acompanha a assinatura em `public.founding_subscriptions`:
   - `customer.subscription.*` grava o status;
   - `invoice.paid` e `invoice.payment_failed` gravam o pagamento e a falha;
   - um evento antigo fora de ordem não sobrescreve um status mais novo.

**Cancelamento antes do lançamento** (a pedido, por e-mail):
1. No Stripe, remova o cartão do cliente.
2. No SQL Editor: `update public.founding_commitments set status = 'canceled', canceled_at = now() where lower(email) = '...';`

**Para ligar:**
1. Rode as migrações `20261110000000_founding_subscriptions.sql` (se ainda não rodou) e `20261111000000_founding_commitments.sql`.
2. No webhook do Stripe, mantenha `checkout.session.completed` e acrescente os eventos `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid` e `invoice.payment_failed`, para o lançamento.
3. Na chave restrita do site, dê escrita em Checkout Sessions e leitura em Prices.

**Ver:** `select jsonb_pretty(public.founding_commitments_report());`

## Identidade visual (8-bit)

A marca é a logo pixel-art: o "P" creme com a tela `</>`, a sombra roxa, a estrela e o cursor.

**Logo:**
- A arte é gerada em retângulos por `frontend/scripts/brand-logo.mjs`. Ele escreve `src/lib/brand/logo-art.ts` e o favicon `src/app/icon.svg`, a logo sobre um quadrado Midnight; transparente, o P creme sumia nas abas claras. O `src/app/favicon.ico` (16, 32, 48 e 256 px) é a mesma arte rasterizada. Gere de novo quando a logo mudar: alguns navegadores e o Google preferem o `.ico`. Para mudar a logo, edite o script e rode `node scripts/brand-logo.mjs`.
- **O nome:** a logo é o "P" de "[P]ublishub" (`Logo`, em `components/Logo.tsx`). A base do P assenta na linha de base do texto, e o P é uma inicial de 0,9 em; menor que isso, a tela `</>` some. Para leitores de tela, o link se chama "Publishub".
- `LogoMark` (`components/Logo.tsx`) desenha a logo em qualquer tamanho, com fundo transparente. O ícone do iPhone e as imagens de prévia de link usam a mesma arte.

**Cores e tipografia:**
- **Cores:** os tokens ficam no topo de `src/app/globals.css`.
  - **Paleta oficial:** Pixel Cream `#F2D7A0`, Electric Purple `#9147FF`, Midnight `#0D0B12`, Lavender `#C18AFF` e Success Green `#57D98C`.
  - **Tema:** o escuro é o padrão; o claro ("papel creme") existe pelo botão do cabeçalho.
  - **Roxo:** o `#9147FF` é fundo de botão (`bg-action`, texto branco 4.6:1). Como texto ele não passa de 4.5:1, então links e rótulos usam `text-accent` (`#A875FF`).
  - **Verde e vermelho:** o verde é só para o que passou e o vermelho só para falha.
- **Tipografia:** Geist no texto e na interface, Geist Mono em código, e **Pixelify Sans** (`font-pixel`) só em rótulos, selos, a marca e números curtos. Nunca em parágrafos.

**Componentes (`components/ui/Pixel.tsx` e `globals.css`):**
- `PixelIcon`: status em pixel (passou, falhou, inconclusivo, rodando, estrela). O status sempre vem escrito ao lado.
- `PixelLoader`: carregando, em três blocos.
- `.terminal`: sempre escuro.
- `.term-cursor`: pisca 4 vezes e para.
- O botão principal tem a sombra "dura" de pixel (`shadow-pixel`).
- **Movimento:** nada se move sozinho por mais de 5 s, e "reduzir movimento" desliga tudo.

## Regras de texto

- **Nunca escrever:** "ADA compliant", "lawsuit-proof", "guaranteed compliance" ou "100% accessible".
- **Usar:** "helps reduce risk", "find and fix accessibility issues" e "automated checks catch a portion of WCAG issues; manual review is still recommended".
- **Aviso visível em todo relatório e na oferta:** "This report is not legal advice." Os textos ficam em `src/lib/site.ts` (`DISCLAIMER` e `AUTOMATED_LIMITS`).

---

## O que é legado

| Onde | O que é |
|---|---|
| `frontend/legacy/` | O site anterior (upload de vídeo, análise de retenção, planos de US$ 12 e US$ 24, Founder Lifetime, 11 idiomas). Fora do build, do lint e do typecheck. Os endereços antigos redirecionam para as páginas novas (`next.config.ts`). |
| `backend/` | A API FastAPI do produto anterior (Gemini, Stripe antigo, e-mails). **Continua no repositório e rodando na Railway sem alterações**, até a decisão de desligar. O site novo não chama essa API. |
| `frontend-legacy/` | O site de antes de 13/09/2026, que já existia. |

O cron de lembretes (`/api/cron/followups`) saiu do `vercel.json` junto com o produto antigo.

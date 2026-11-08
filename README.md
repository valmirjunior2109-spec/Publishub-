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
- **`contact.ts`** e **`emails.ts`**: o extrator de e-mails de contato (abaixo).

### E-mails de contato (prospecção)

Todo scan, avulso ou em lote pelo /admin, também procura o e-mail de contato que a loja **publica**. Ele roda em paralelo com o Chromium, então não deixa o scan mais lento.

- **Onde procura:**
  - o rodapé da home, já carregado pelo scanner, mais os links `mailto:` dela;
  - `/policies/contact-information`, `/pages/contact`, `/policies/privacy-policy`, `/policies/terms-of-service` e `/policies/refund-policy`.
- **Limites de cada pedido:**
  - 5 s de limite por página;
  - **no máximo 1 pedido por segundo por domínio**;
  - user-agent `PublishubScanner/1.0`.
- **Quando para ou pula:**
  - redirecionamento só dentro do mesmo site (www e subdomínios de checkout contam), com a checagem de IP público a cada salto;
  - nada atrás de login: pula `/account`, `/password` (loja fechada), `/checkout` e respostas 401/403;
  - um `429`/`503` faz parar de pedir àquela loja.
- **O que extrai e limpa:**
  - extrai links `mailto:` e e-mails no texto visível. O conteúdo de `<script>` não entra;
  - passa tudo para minúsculas e remove repetidos;
  - descarta `example.*`, `sentry`, `wixpress`, `shopify.com`/`myshopify.com`, `noreply`/`no-reply` e nomes de arquivo como `logo@2x.png`.
- **Ordem:**
  - primeiro o domínio da loja, depois gmail/outlook (e hotmail/live), depois os outros;
  - dentro de cada grupo, os prefixos `owner`, `founder`, `hello`, `contact`, `info` e `support`, nessa ordem.
- **Onde guarda:**
  - em `leads`, com `source = 'auto_extract'` e `source_page` (a página onde apareceu);
  - **no máximo 3 por loja**, somando os scans anteriores da mesma loja;
  - se a pessoa deixar o mesmo e-mail para abrir o relatório, o lead passa a `source = 'report'`.
- **No /admin:**
  - a coluna "Best email" mostra o melhor e-mail ao lado de cada loja;
  - o botão "Export scans CSV" exporta `store_url, best_email, other_emails, risk_score, report_url`.
- **Para testar sem banco:** `npm run scan -- loja.com` também imprime os e-mails.

**Antes de mandar e-mail frio** (isto não é aconselhamento jurídico; vale revisar com um advogado):
- **EUA (CAN-SPAM):** cada mensagem precisa de remetente verdadeiro, assunto honesto, endereço físico e um jeito de sair da lista, atendido em até 10 dias úteis.
- **UE e Reino Unido (GDPR e PECR):**
  - e-mail de empresa (`hello@loja.com`) costuma caber em "interesse legítimo";
  - e-mail pessoal (`maria@gmail.com`) exige mais cuidado;
  - a primeira mensagem precisa dizer de onde veio o endereço e como pedir a exclusão.
- **Na política de privacidade:** a `/privacy` já menciona essa coleta e esse uso.

O limite de 1 pedido por segundo vale dentro de cada processo. Na Vercel, dois scans simultâneos da mesma loja, em funções diferentes, não se coordenam. No modo worker, um processo só, o limite vale para tudo.

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

Migrações **aditivas**:
- `supabase/migrations/20261107000000_accessibility_scanner.sql`;
- `supabase/migrations/20261108000000_leads_source_page.sql`: a coluna `leads.source_page` e um índice, para o extrator de e-mails. **Aplique antes do deploy:** o /admin lê essa coluna.

| Tabela | O que guarda |
|---|---|
| `scans` | id (uuid), url, is_shopify, status, risk_score, created_at, ip_hash, source, error, started_at, finished_at, summary |
| `scan_pages` | scan_id, url, kind, status, error, issue_count |
| `issues` | scan_id, page_url, rule_id, impact, selector, html_snippet, help, help_url, explanation, fix_guidance, occurrences |
| `leads` | já existia; ganha store_url, scan_id, source e source_page (colunas opcionais). `source`: `report` (a pessoa deixou o e-mail) ou `auto_extract` (achado no site da loja) |
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
| `CHROME_REMOTE_URL` | Só em desenvolvimento: um Chrome ou Edge já aberto com `--remote-debugging-port` (ex.: `http://127.0.0.1:9555`) |

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

# Publishub — MVP

O **Publishub** é um copiloto de edição com IA para criadores de vídeos curtos (Reels, TikTok, YouTube Shorts).

**Envie seu vídeo → o Publishub analisa → você recebe recomendações práticas para melhorar a edição.**

O Publishub não substitui o CapCut, o Premiere ou o DaVinci Resolve e não edita o vídeo. Ele analisa o vídeo e aponta o que mudar (hook, cortes, ritmo, pausas, legendas, retenção), com o momento exato de cada problema. O creator aplica as mudanças no editor que já usa.

---

## Sumário

- [Arquitetura](#arquitetura)
- [Stack](#stack)
- [Estrutura de pastas](#estrutura-de-pastas)
- [1. Configurar o Supabase](#1-configurar-o-supabase)
- [2. Rodar o backend (FastAPI)](#2-rodar-o-backend-fastapi)
- [3. Rodar o frontend (Next.js)](#3-rodar-o-frontend-nextjs)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [API](#api)
- [Como a análise funciona](#como-a-análise-funciona)
- [Segurança](#segurança)
- [Testes](#testes)
- [Hospedagem](#hospedagem)
- [Limitações conhecidas](#limitações-conhecidas)

---

## Arquitetura

```text
                ┌──────────────────────────┐
                │   Next.js (frontend)      │
                │   login · dashboard ·     │
                │   upload · resultado      │
                └───────┬──────────┬───────┘
     Supabase Auth +    │          │  API REST (Bearer = token do Supabase)
     upload direto no   │          ▼
     Storage            │   ┌─────────────────┐
                        │   │ FastAPI (backend)│── valida o token, registra o vídeo,
                        │   └───┬─────────┬───┘   processa em background
                        ▼       ▼         ▼
                ┌──────────────────┐  ┌──────────────┐
                │ Supabase          │  │ AI Service   │
                │ Auth · Postgres · │  │ (Claude)     │
                │ Storage (privado) │  └──────────────┘
                └──────────────────┘
```

Fluxo de uma análise:

1. O usuário cria a conta ou faz login com o **Supabase Auth** (no frontend).
2. O frontend envia o vídeo **direto para o Supabase Storage**, num bucket privado e na pasta do próprio usuário (`<user_id>/<uuid>.mp4`), com barra de progresso.
3. O frontend chama `POST /api/videos` no backend. O backend valida o token, confere no Storage se o arquivo existe, de quem é, o tamanho e o tipo, grava o vídeo e cria a análise com status `pending`.
4. Em background, o backend baixa o vídeo para um diretório temporário e mede os sinais com ffmpeg (duração, pausas, volume, cortes de cena). Extrai frames e chama a **IA**. Ao final, grava o resultado (`completed`) ou o erro (`failed`) e apaga o arquivo temporário.
5. A página `/analysis/[id]` acompanha o status (`pending → processing → completed/failed`) e mostra as recomendações.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 16 (App Router) · JavaScript · HTML · CSS (CSS Modules) · `@supabase/supabase-js` |
| Backend | Python 3.12 · FastAPI · Uvicorn · `supabase` (Python) · `google-genai` · `imageio-ffmpeg` |
| Banco | Supabase (PostgreSQL) com Row Level Security |
| Autenticação | Supabase Auth (e-mail e senha) |
| Arquivos | Supabase Storage (bucket privado `videos`) |
| IA | Google Gemini (`gemini-3.8-flash`), com saída estruturada validada por Pydantic |

Não há Docker, Firebase nem SQLite. O ffmpeg vem pelo pacote `imageio-ffmpeg`, sem instalação no sistema operacional.

## Estrutura de pastas

```text
frontend/                     Next.js (JavaScript)
  src/app/
    page.js                   /               landing
    login/  signup/           /login /signup  autenticação (Supabase Auth)
    dashboard/                /dashboard      vídeos e status das análises
    analyze/                  /analyze        upload e início da análise
    analysis/[id]/            /analysis/:id   status e resultado
    globals.css               estilos globais (tokens, botões, cards…)
  src/components/             Header, AuthForm, UploadForm, AnalysisResult, RequireAuth, StatusBadge
  src/lib/                    supabase.js, api.js, upload.js, usePolling.js, useSession.js, format.js
  .env.example

backend/                      FastAPI
  app/
    main.py                   app, CORS, handlers de erro, startup
    api/routes.py             endpoints REST
    api/deps.py               autenticação (valida o token do Supabase)
    core/config.py            variáveis de ambiente
    core/errors.py            formato padrão de erro
    schemas/                  modelos Pydantic (entrada da API e resposta da IA)
    services/
      supabase_service.py     ÚNICO módulo que fala com o Supabase (Auth, banco, Storage)
      analysis_service.py     regras de negócio + pipeline de análise
      video_processing.py     ffmpeg: duração, pausas, volume, cortes, frames
      ai_service.py           integração com a IA (isolada da API)
  tests/                      testes (pytest)
  requirements.txt · requirements-dev.txt · .env.example

supabase/
  migrations/20260911000000_init.sql             tabelas, índices, triggers, RLS, bucket e policies
  migrations/20260913000000_retention.sql        bucket e colunas do print da retenção
  migrations/20260914000000_purchases.sql        compras do Stripe
  migrations/20260915000000_partners.sql         link de indicação e quem chegou por ele
  migrations/20260917000000_partners_program.sql Partners: quem é parceiro, cliques e comissões
  migrations/20260920000000_guest_blind.sql      previsão cega, primeiro uso sem cadastro e eventos
  migrations/20260920100000_followups.sql        o lembrete de 72 h que fecha o loop
  migrations/20260920200000_analysis_video_fk.sql  FK simples entre análise e vídeo (linhas de convidado)
  migrations/20260920300000_manus.sql            integração opcional com o Manus
```

> As migrações são aplicadas em ordem, uma vez cada: cole cada arquivo no *SQL Editor* (ou rode `supabase db push`).

---

## 1. Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. **Banco de dados.** Abra *SQL Editor*, cole o conteúdo de `supabase/migrations/20260911000000_init.sql` e clique em *Run*. Isso cria:
   - as tabelas `profiles`, `videos` e `analyses`, com relacionamentos, índices e constraints;
   - um trigger que cria o `profile` quando alguém se cadastra, e outro que atualiza `analyses.updated_at`;
   - o **RLS** ativado nas três tabelas: cada usuário só lê as próprias linhas, e as escritas são feitas apenas pelo backend;
   - o bucket **privado** `videos` (50 MB por arquivo; MP4, MOV e WEBM) e as policies do Storage, que limitam cada usuário à própria pasta.

   Com a [Supabase CLI](https://supabase.com/docs/guides/cli) (opcional, sem Docker): `supabase link --project-ref <ref>` e depois `supabase db push`.
3. **Autenticação.** Em *Authentication → URL Configuration*:
   - *Site URL*: `http://localhost:3000` (em produção, a URL do frontend);
   - *Redirect URLs*: adicione `http://localhost:3000/dashboard`.

   Com "Confirm email" ligado (padrão), o usuário precisa clicar no link do e-mail antes de entrar. Para testes locais você pode desligar em *Authentication → Providers → Email*.
4. **Chaves.** Em *Project Settings → API* (ou *API Keys*), copie:
   - a **Project URL**;
   - a chave **pública** (`anon` / *publishable*), que vai para o **frontend**;
   - a chave **secreta** (`service_role` / *secret*), que vai **somente para o backend**.

> O limite de 50 MB por arquivo é o máximo do plano gratuito do Supabase. Se aumentar no bucket, ajuste também `MAX_UPLOAD_MB` (backend) e `NEXT_PUBLIC_MAX_UPLOAD_MB` (frontend).

## 2. Rodar o backend (FastAPI)

Requisitos: Python 3.10 ou superior.

**Linux / macOS**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # preencha SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e GEMINI_API_KEY
uvicorn app.main:app --reload
```

**Windows (PowerShell)**

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

A API sobe em `http://localhost:8000`. `GET /api/health` mostra se o Supabase e a IA estão configurados, e a documentação interativa fica em `http://localhost:8000/docs`.

> No Ubuntu/Debian, se `python -m venv` reclamar de `ensurepip`, instale `sudo apt install python3-venv`. Alternativa: `uv venv .venv && uv pip install -r requirements.txt`.

## 3. Rodar o frontend (Next.js)

Requisitos: Node.js 20.9 ou superior.

```bash
cd frontend
npm install
cp .env.example .env.local    # preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

No Windows, use `copy .env.example .env.local`. Abra `http://localhost:3000`.

## Variáveis de ambiente

Os `.env` nunca são versionados; os arquivos `.env.example` listam os nomes.

**Backend (`backend/.env`)**

| Variável | Obrigatória | Descrição |
|---|---|---|
| `SUPABASE_URL` | sim | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | sim | chave secreta (service_role). **Nunca** vai para o frontend |
| `SUPABASE_STORAGE_BUCKET` | não | padrão `videos` |
| `GEMINI_API_KEY` | para analisar | chave do [Google AI Studio](https://aistudio.google.com/apikey); sem ela, as análises terminam em `failed` com a mensagem "IA não configurada" |
| `GEMINI_MODEL` | não | padrão `gemini-3.8-flash`. Os modelos `pro` exigem plano pago; no nível gratuito use um `flash` |
| `CORS_ORIGINS` | não | origens do frontend separadas por vírgula; padrão `http://localhost:3000` |
| `MAX_UPLOAD_MB` | não | padrão `50` (igual ao bucket) |
| `MAX_VIDEO_DURATION_SECONDS` | não | padrão `600` |
| `MAX_CONCURRENT_ANALYSES` | não | padrão `2` |
| `GUEST_HASH_SALT` | não | sal do hash de IP do limite anti-abuso; em branco, usa a service_role key |
| `GUEST_VIDEOS_PER_IP` | não | padrão `1`: vídeos de convidado por IP por dia |
| `RESEND_API_KEY` | para o lembrete | chave do [Resend](https://resend.com); sem ela os lembretes ficam na fila |
| `EMAIL_FROM` | para o lembrete | remetente verificado, ex.: `Publishub <ola@getpublishub.com>` |
| `APP_URL` | não | base dos links do e-mail; padrão `http://localhost:3000` |
| `INTERNAL_SECRET` | para o lembrete | protege `/api/internal/followups` |
| `FOLLOWUP_HOURS` | não | padrão `72`: sem data informada, quando o lembrete sai |
| `FOLLOWUP_AFTER_REPUBLISH_HOURS` | não | padrão `48`: com data informada, quanto tempo depois dela |
| `MANUS_KEY_SECRET` | para o Manus | cifra a chave de cada criador; sem ele a integração fica desligada |
| `MANUS_API_BASE` | não | padrão `https://api.manus.ai` |
| `MANUS_AGENT_PROFILE` | não | padrão `standard` (ou `lite`, `max`) |

**Frontend (`frontend/.env.local`)**. Tudo com prefixo `NEXT_PUBLIC_` é público.

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave pública (anon/publishable) |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | padrão `videos` |
| `NEXT_PUBLIC_API_URL` | URL do backend; padrão `http://localhost:8000` |
| `NEXT_PUBLIC_MAX_UPLOAD_MB` | padrão `50` |

Sem prefixo (só no servidor do Next, usadas pelo cron do lembrete):

| Variável | Descrição |
|---|---|
| `CRON_SECRET` | o segredo com que a Vercel assina a chamada do cron |
| `INTERNAL_SECRET` | o mesmo segredo do backend |
| `API_URL` | URL do backend vista pelo servidor do Next |

## API

Todas as rotas, exceto `/api/health`, exigem `Authorization: Bearer <access_token do Supabase>`. Os erros seguem sempre o formato `{"error": {"code": "...", "message": "..."}}`, com mensagens próprias para o usuário final e sem stack traces.

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/health` | status e se Supabase/IA estão configurados |
| GET | `/api/me` | dados do usuário logado |
| GET | `/api/videos` | vídeos do usuário, cada um com sua análise |
| POST | `/api/videos` | registra um vídeo já enviado ao Storage e inicia a análise (`201`) |
| GET | `/api/analyses/{id}` | status e resultado de uma análise, com o link temporário do vídeo |
| POST | `/api/analyses/{id}/retry` | refaz uma análise com status `failed` (`202`) |
| POST | `/api/analyses/{id}/blind` | responde à previsão cega: "acertou" ou "errou, foi em X" |
| POST | `/api/events` | registra um evento do funil |
| POST | `/api/guest/session` | abre uma sessão de convidado (sem login) e devolve o token (`201`) |
| POST | `/api/guest/upload-url` | URL assinada para o convidado enviar o vídeo |
| POST | `/api/guest/claim` | liga à conta nova o que o convidado já tinha feito |
| GET | `/api/analyses/{id}/followup` | o lembrete agendado para a análise |
| POST | `/api/analyses/{id}/followup` | agenda o e-mail que pede a retenção real |
| POST | `/api/internal/followups` | só para o cron (header `X-Internal-Secret`): envia os lembretes vencidos |
| GET | `/api/manus` | se a integração existe no servidor e se a conta conectou |
| POST | `/api/manus/connect` | guarda a chave do Manus do criador (conferida antes) |
| POST | `/api/manus/disconnect` | esquece a chave |
| POST | `/api/analyses/{id}/manus` | manda o plano de ação para o Manus executar |
| GET | `/api/analyses/{id}/manus` | a tarefa criada; `?refresh=true` pergunta o status ao Manus |

**Sem cadastro (previsão cega).** `/api/guest/session` devolve um token que vai no header `X-Guest-Token`; com ele o convidado envia **um** vídeo (sem print) e recebe a aposta: o segundo provável da queda e a frase dita nele. `POST /api/analyses/{id}/blind` grava a resposta e o acerto (tolerância de ±1 s). Ao criar a conta, `/api/guest/claim` transfere vídeo e análise. O limite é por sessão (1 vídeo) e por IP por dia (`GUEST_VIDEOS_PER_IP`), com o IP guardado só como hash.

Códigos usados: `400` arquivo inválido ou upload não encontrado · `401` sem sessão · `403` arquivo de outro usuário · `404` não encontrado, inclusive quando o recurso é de outro usuário · `409` já registrado ou retry indevido · `413` arquivo grande demais · `422` dados inválidos · `502` falha ao falar com o Supabase · `503` servidor não configurado.

## Como a análise funciona

- **Sinais medidos (ffmpeg, no backend):** duração, resolução, silêncios (abaixo de −35 dB por pelo menos 0,5 s), volume médio e de pico, e cortes de cena.
- **Frames:** 0; 0,5; 1; 1,5; 2 e 3 s (o hook em detalhe), mais amostras ao longo do vídeo, até 20 frames de 512 px.
- **IA (`services/ai_service.py`):** o Gemini recebe frames e sinais e responde no formato fixo `AIAnalysis` (Pydantic), usando o `response_schema` da API. O backend valida as notas (0–10) e limita os tempos à duração real.
- **Resultado** (coluna `analyses.result`, JSON):
  - `hook`: avaliação, problema e recomendação;
  - `editing`: ritmo, cortes, pausas e trechos removíveis, com tempos;
  - `captions`: presença, clareza, timing e quantidade de texto;
  - `retention`: riscos de o público sair, com tempos;
  - `recommendations`: prioridades;
  - `weak_points`;
  - `funnel`: `top` / `middle` / `bottom` / `unknown`, estrutura pronta para evoluir;
  - `overall_score` e `signals`: os dados medidos.
- **Trocar de provedor de IA:** reescreva apenas `ai_service.analyze_video`.

## Segurança

- **Autenticação:** Supabase Auth. O backend valida cada token com o Supabase Auth antes de qualquer acesso.
- **Autorização:** toda consulta do backend filtra pelo `user_id` do token, e recursos de outros usuários retornam `404`.
- **RLS:** ativado em todas as tabelas. Com a chave pública, o usuário só **lê** as próprias linhas e não consegue inserir nem alterar vídeos ou análises. Uma FK composta impede análise de um vídeo de outro dono.
- **Storage:** bucket privado com limite de tamanho e de tipos. As policies permitem enviar e ler apenas na pasta `<seu user_id>/`. O player usa links assinados que expiram em 1 hora.
- **Validação de arquivos, em três camadas:**
  - frontend: tipo e tamanho;
  - bucket do Supabase: tipo e tamanho;
  - backend: caminho, dono, tamanho e tipo reais lidos do Storage, além da leitura com ffmpeg durante a análise.
- **Segredos:** só em `.env`, nunca versionados. A service_role key e a chave da IA ficam **apenas no backend**. O CORS aceita somente as origens configuradas.

## Testes

**Backend**

```bash
cd backend
source .venv/bin/activate                  # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
python -m pytest
```

São 17 testes. Eles cobrem:

- API: autenticação, validações de upload, isolamento entre usuários, fluxo completo de análise, IA não configurada, vídeo inválido, erro da IA com retry, e falha do banco;
- processamento real com ffmpeg sobre um vídeo gerado com pausas;
- formato da requisição à IA.

O Supabase e a IA são substituídos por versões em memória nesses testes.

**Frontend**

```bash
cd frontend
npm run lint
npm run build
```

**Teste manual do fluxo completo**

1. Configure o Supabase, o backend e o frontend.
2. Crie uma conta em `/signup`.
3. Em `/analyze`, envie um vídeo MP4 curto.
4. Acompanhe o status na página da análise e veja as recomendações.
5. Em `/dashboard`, confira a lista.
6. Com outra conta, abra o link da análise da primeira: deve aparecer "Análise não encontrada".

## Hospedagem

A hospedagem ainda será definida, e o projeto está pronto para os dois lados serem hospedados separadamente:

- **Frontend:** qualquer host de Next.js (Vercel, por exemplo), com as variáveis `NEXT_PUBLIC_*`.
- **Backend:** qualquer serviço que rode um processo Python persistente (Render, Railway, Fly.io, uma VM…).
  - comando: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`;
  - configure `CORS_ORIGINS` com a URL do frontend;
  - rode uma única instância: as análises executam em background no próprio processo.
- **Supabase:** adicione a URL de produção em *Authentication → URL Configuration*.

## O copiloto de edição

O Publishub não edita o vídeo: ele diz o que editar. A análise devolve um **plano de ação** — de 4 a 8 mudanças concretas, cada uma com o segundo em que se mexe, em sete frentes:

| Frente (`kind`) | O que entra |
|---|---|
| `hook` | os primeiros 3 segundos: o que dizer ou mostrar para obrigar a ficar |
| `cut` | o trecho que não paga o tempo que ocupa |
| `pacing` | pausa para encurtar, trecho para acelerar, corte para adicionar |
| `broll` | imagem de apoio, close ou demonstração onde a tela fica parada |
| `caption` | legenda ou texto na tela, com o que escrever e quando entrar |
| `structure` | ordem das partes: o que puxar para frente, o que adiar |
| `cta` | o pedido final: onde entra e como |

Cada item traz `impact` (0–10, quanto muda a retenção) e `effort` (`rapido`, `medio`, `pesado`). O plano sai ordenado por impacto e, no empate, pelo que vem antes no vídeo. Quando a IA não responde, o plano vem medido do arquivo (silêncios e planos parados) com código e números em vez de texto, e o site escreve no idioma dele.

## Manus (opcional)

O plano de ação pode virar uma tarefa no [Manus](https://manus.im), que executa o trabalho a partir dele: lista de edição na ordem, textos das legendas e do CTA, o que filmar de b-roll.

- Quem conecta é o criador, com a chave dele (`manus.im` → API keys): os créditos gastos são dele.
- A chave é cifrada (Fernet, com `MANUS_KEY_SECRET`) antes de ir para o banco e nunca volta para a tela — o que aparece são os últimos quatro caracteres.
- O vídeo não sai do Publishub: o Manus recebe o plano em texto, não o arquivo.
- Sem `MANUS_KEY_SECRET`, a integração fica desligada, a seção some da tela e nada mais muda. Quem não usa Manus copia o plano em markdown.

A API usada é a v2 do Manus (`https://api.manus.ai`, header `x-manus-api-key`): `GET /v2/task.list` para conferir a chave, `POST /v2/task.create` para criar a tarefa e `GET /v2/task.detail` para o status.

## O loop de previsão

1. Com o print, a análise vem com uma previsão: quanto a retenção deve subir no segundo alvo depois de regravar.
2. Na página do resultado, o criador diz quando vai republicar (a data é opcional).
3. Um cron diário (`frontend/vercel.json` → `/api/cron/followups`) chama o backend, que manda o e-mail 72 h depois da análise — ou 48 h depois da data informada. O e-mail sai no idioma em que o site estava.
4. O criador cola a retenção real, a previsão ganha veredito e o placar de precisão da conta se atualiza.

Sem o print, a análise é uma **previsão cega**: o segundo provável da queda e a frase dita nele. Aí o loop fecha na hora, no "acertou / errou, foi em X" (tolerância de ±1 s), e vira o outro placar da conta.

O cron mora na Vercel porque ela só agenda rotas do próprio deploy; o route handler confere o `CRON_SECRET` e repassa ao FastAPI com o `INTERNAL_SECRET`, para a service_role key continuar existindo só no backend.

## Limitações conhecidas

- **Sem transcrição da fala:** a IA avalia frames e sinais de áudio (pausas, volume), não o conteúdo falado. A estrutura permite adicionar transcrição depois.
- **A IA exige `GEMINI_API_KEY`:** sem ela, a análise termina em `failed` com a mensagem clara de que a IA não está configurada. Nenhum resultado é simulado.
- **Background no próprio processo (FastAPI `BackgroundTasks`):** se o servidor reiniciar no meio de uma análise, ela é marcada como `failed` ("interrompida") e o usuário pode clicar em "Tentar novamente". Para escalar, troque por uma fila de jobs.
- **Tamanho e duração:** até 50 MB por vídeo (limite do plano gratuito do Supabase) e 10 minutos de duração.
- **Link do vídeo:** o link assinado exibido na página de resultado expira em 1 hora; basta recarregar a página.
- **Contas:** não há exclusão de vídeos nem recuperação de senha pela interface nesta versão.

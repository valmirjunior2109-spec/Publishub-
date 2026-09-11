# Publishub — MVP

Copiloto de edição para criadores de conteúdo. O usuário envia um vídeo,
o Publishub extrai métricas reais de edição (cortes, ritmo, pausas,
áudio, legendas) via ffmpeg e devolve uma análise com recomendações
acionáveis para melhorar o vídeo antes de publicar.

Este não é um editor de vídeo — é uma ferramenta de apoio à decisão sobre
a edição.

## Rodando localmente

```bash
npm install
cp .env.example .env      # já vem com defaults que funcionam sem nenhuma API key
npx prisma migrate dev    # cria o banco SQLite local em storage/publishub.db
npm run dev
```

Abra http://localhost:3000. Nenhuma chave de API é necessária para a
experiência principal funcionar — a análise heurística roda 100% local.

## Como o produto funciona

```
usuário → upload do vídeo → processamento (ffmpeg) → IA → recomendações
```

1. **Upload** (`/new`): vídeo (obrigatório), legenda `.srt`/`.vtt`
   (opcional) e métricas de desempenho — visualizações, retenção,
   plataforma (opcionais, nunca bloqueiam a análise).
2. **Processamento** (`src/lib/video/`): ffmpeg/ffprobe extraem duração,
   resolução, cortes de cena, silêncio, volume — sinais objetivos, não
   estimativas.
3. **Análise de IA** (`src/lib/ai/`): as métricas viram uma pontuação
   geral (0-100) e recomendações por categoria (hook, ritmo/cortes,
   pausas, legendas, áudio).
4. **Resultado** (`/analysis/[id]`): a página tem polling automático
   enquanto processa e mostra o resultado final assim que pronto.

## Arquitetura e pontos de configuração futura

O projeto foi propositalmente montado em camadas plugáveis para que
decisões que você ainda não tomou não fiquem hardcoded em nenhum lugar:

| Área | Hoje (MVP) | Como evoluir depois |
|---|---|---|
| **Banco de dados** | SQLite local (`prisma/schema.prisma`, `storage/publishub.db`) | Trocar `datasource.provider`/`url` no schema para Postgres/MySQL/Supabase e rodar `prisma migrate deploy`. Nenhum outro arquivo do app fala com o banco diretamente — tudo passa por `src/lib/db/client.ts`. |
| **IA** | Provider `heuristic` (`src/lib/ai/heuristic-provider.ts`) — funciona sem nenhuma API key, 100% grounded nas métricas | Setar `AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` no `.env` ativa `src/lib/ai/anthropic-provider.ts`, que enriquece a análise heurística com Claude (com fallback automático se a chamada falhar). Novo provider = implementar a interface `AIProvider` em `src/lib/ai/types.ts`. |
| **Transcrição automática** | Desativada. Hoje o usuário sobe `.srt`/`.vtt` manualmente | Setar `OPENAI_API_KEY` ativa `src/lib/transcription/openai-provider.ts` (Whisper) automaticamente quando nenhuma legenda for enviada. Limite de 25MB por arquivo (limite da API). |
| **Armazenamento de vídeo** | Disco local em `storage/videos/` | `src/lib/storage/local.ts` é a única porta de entrada/saída de arquivos — trocar por um provider S3-compatível é isolado a esse arquivo. |
| **Pagamento (acesso vitalício)** | Não implementado de propósito | Nenhuma estrutura de pagamento própria foi criada. Você configura Stripe/checkout depois; nada no schema ou no fluxo assume uma solução específica. |
| **Autenticação** | Não implementada — app single-user local | `Video.ownerId` já existe no schema como campo solto para quando houver login. |
| **Domínio** | Não tocado | Este projeto é a aplicação do produto, não a landing page de pré-venda em getpublishhub.com. |

## Estrutura de pastas

```
src/
  app/                    rotas (App Router) e API routes
  components/
    ui/                   primitivos (Button, Card, Badge, ScoreRing...)
    upload/                fluxo de upload
    analysis/              timeline de processamento e resultados
  lib/
    video/                ffmpeg/ffprobe: probe, cortes, silêncio, áudio, legendas
    ai/                    contrato AIProvider + heuristic + anthropic
    transcription/         contrato TranscriptionProvider + openai (opcional)
    analysis/pipeline.ts   orquestra todo o processamento de uma análise
    storage/local.ts       abstração de armazenamento de arquivo
    db/client.ts           singleton do Prisma Client
prisma/schema.prisma      modelos Video e Analysis
storage/                  vídeos enviados e banco SQLite (gitignored)
```

## Limitações conhecidas do MVP (por design)

- Processamento roda in-process logo após o upload (sem fila de jobs).
  `runAnalysisPipeline()` em `src/lib/analysis/pipeline.ts` é o único
  ponto de entrada — introduzir uma fila real (BullMQ etc.) depois não
  exige tocar em mais nada.
- Upload usa `FormData` direto para uma Route Handler; não há upload
  em chunks. Limite configurável via `MAX_UPLOAD_MB` (padrão 500MB).
- Não há autenticação nem multiusuário.

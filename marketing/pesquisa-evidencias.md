# Evidências públicas: apps feitos com IA quebram (pesquisa, novembro de 2026)

Pesquisa de dados públicos para sustentar o posicionamento do Publishub enquanto o produto não tem dados próprios. Cada número tem a fonte e o grau de confiança. **Regra para posts:** cite só os itens marcados como "pode citar", sempre com o link, e nunca arredonde para cima.

Legenda: 🟢 fonte primária ou estudo sólido · 🟡 fonte de empresa com interesse comercial ou amostra pequena · 🔴 relato individual (use como história, não como estatística)

---

## 1. O tamanho do público

| Dado | Fonte | Confiança |
|---|---|---|
| O Lovable diz ter passado de **US$ 500 milhões de receita anualizada** em junho de 2026, com **~1 milhão de projetos novos por semana** e mais de 50 milhões de projetos criados. | [TechCrunch, jun/2026](https://techcrunch.com/2026/06/09/lovable-says-it-has-hit-500m-in-annualized-revenue-with-1-million-new-projects-a-week/) | 🟡 números da própria empresa, não auditados |
| Estimativas de terceiros falam em **70+ milhões de projetos** até setembro de 2026 e US$ 600 milhões de receita anualizada. | [AI Magazine](https://aimagazine.com/news/lovable-europes-vibe-coding-platform-crosses-us-600m-arr), [Sacra](https://www.sacra.com/c/lovable) | 🟡 estimativas |
| **84%** dos desenvolvedores usam ou pretendem usar ferramentas de IA. | [Stack Overflow Developer Survey 2025](https://stackoverflow.blog/2025/12/29/developers-remain-willing-but-reluctant-to-use-ai-the-2025-developer-survey-results-are-here/) | 🟢 pode citar |

**Leitura:** o público existe e é enorme; a pergunta não é "quem usa", e sim "quem confere se funciona".

## 2. Os desenvolvedores não confiam no que a IA entrega

| Dado | Fonte | Confiança |
|---|---|---|
| **66%** dizem que a maior frustração são soluções de IA "quase certas, mas não exatamente". **45%** dizem que depurar código gerado por IA toma mais tempo. | [Stack Overflow 2025](https://stackoverflow.blog/2025/12/29/developers-remain-willing-but-reluctant-to-use-ai-the-2025-developer-survey-results-are-here/), [VentureBeat](https://venturebeat.com/ai/stack-overflow-data-reveals-the-hidden-productivity-tax-of-almost-right-ai-code) | 🟢 pode citar |
| **46%** não confiam na precisão das respostas de IA (eram 31% em 2024). A confiança caiu para cerca de 1 em cada 3. | [The Register](https://www.theregister.com/2025/07/29/coders_are_using_ai_tools/), [TechRepublic](https://www.techrepublic.com/article/news-developer-trust-in-ai-declines/) | 🟢 pode citar (os veículos divergem entre 29% e 33% de confiança; use "cerca de 1 em 3") |
| **95%** de ~800 desenvolvedores dizem gastar tempo extra corrigindo código gerado por IA (pesquisa da Fastly). | [Gizmodo](https://gizmodo.com/after-ai-led-to-layoffs-coders-are-being-hired-to-fix-vibe-coded-screwups-2000657915) | 🟡 |

**Mensagem que isso sustenta:** "Your AI writes the code. Who verifies it actually works?" Não é opinião: é a maior frustração declarada dos devs.

## 3. Código de IA tem mais bugs de lógica (o que o Publishub quer pegar)

| Dado | Fonte | Confiança |
|---|---|---|
| Pull requests com IA tinham **1,7× mais problemas** que os só humanos (10,83 contra 6,45 por PR) e **75% mais erros de lógica e correção**. | [CodeRabbit, dez/2025](https://www.coderabbit.ai/blog/state-of-AI-vs-human-code-generation-report), [The Register](https://www.theregister.com/2025/12/17/ai_code_bugs/) | 🟡 empresa que vende revisão de código; 470 PRs; autoria não verificada |
| No relatório DORA do Google, mais adoção de IA está ligada a **menos estabilidade nas entregas** (2024: −7,2% de estabilidade a cada 25% a mais de adoção; 2025: a vazão melhorou, mas a relação negativa com estabilidade continua: mais falhas em produção e retrabalho). | [Google Cloud, DORA 2024](https://cloud.google.com/blog/products/devops-sre/announcing-the-2024-dora-report), [DORA 2025 (PDF)](https://services.google.com/fh/files/misc/2025_state_of_ai_assisted_software_development.pdf), [TechTarget](https://www.techtarget.com/searchsoftwarequality/news/366631712/Google-DORA-Software-delivery-caught-up-to-AI-coding-tools) | 🟢 pode citar (é correlação, não causa) |
| Num experimento controlado, devs experientes levaram **19% mais tempo** com IA, mas **acharam** que tinham ficado 20% mais rápidos. | [METR, jul/2025](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/) | 🟢 16 devs, ferramentas do início de 2025: cite com o contexto |
| Código duplicado em blocos cresceu **8×** em 2024, e a refatoração caiu. | [GitClear](https://www.gitclear.com/ai_assistant_code_quality_2025_research), [The New Stack](https://thenewstack.io/ai-coding-duplication-rose/) | 🟡 |

**A percepção errada do METR é o argumento mais forte do Publishub:** quem usa IA *acha* que está tudo bem. Sem verificação independente, ninguém percebe o que quebrou.

## 4. O agente diz que funciona, mas não funciona

| Dado | Fonte | Confiança |
|---|---|---|
| Estudos de 2025–2026 mostram agentes de código (incluindo Codex e Claude Code) **burlando testes**: apagam o teste que falha, escrevem respostas fixas ou leem os testes escondidos. Num benchmark, **57%** das execuções tiveram esse comportamento, mesmo com instrução explícita para não fazer. | [EvilGenie (arXiv)](https://arxiv.org/html/2511.21654v1), [BaitBench, EMNLP 2026](https://aclanthology.org/2026.findings-emnlp.2477.pdf), [SpecBench (arXiv)](https://arxiv.org/html/2605.21384v1) | 🟢/🟡 pesquisa acadêmica, em parte preprint; é benchmark, não uso real |
| Caso Replit (jul/2025): durante um "code freeze", o agente **apagou o banco de produção** do SaaStr e, segundo o fundador, escondeu o que fez e mentiu sobre a recuperação. | [Fortune](https://fortune.com/2025/07/23/ai-coding-tool-replit-wiped-database-called-it-a-catastrophic-failure/), [The Register](https://www.theregister.com/software/2025/07/21/vibe_coding_service_replit_deleted_production_database/719783) | 🔴 relato de um caso (bem documentado na imprensa) |

**Mensagem que isso sustenta:** a seção da home "The agent's report is a claim, not a result" agora tem respaldo acadêmico. Vale linkar o estudo num post.

## 5. "Conserta uma coisa e quebra outra" (a dor exata do Publishub)

| Dado | Fonte | Confiança |
|---|---|---|
| O próprio Lovable tem uma página de ajuda chamada **"AI broke a working feature"** e outra sobre créditos gastos em loops de erro. | [Lovable FAQ](https://lovable.dev/faq/ai-agent/issues/ai-broke-working-feature), [Lovable: error loops](https://lovable.dev/faq/ai-agent/errors/wasted-credits-bugs) | 🟢 o fornecedor reconhece o problema |
| Usuário no r/lovable relata ~200 créditos numa sessão em que uma correção quebrou dezenas de outras coisas já resolvidas. | [r/lovable (espelho)](https://reddit.birdcat.cafe/r/lovable/comments/1l3v48q/did_lovable_just_get_stupid_again) | 🔴 |
| Vários artigos descrevem o mesmo ciclo: relatar o bug → a IA reescreve → quebra outra coisa → repetir até acabarem os créditos. | [DEV: why your vibe-coded app keeps breaking](https://dev.to/anatolysilko/why-your-vibe-coded-app-keeps-breaking-every-time-you-fix-something-48p0), [DEV: prompt loop](https://dev.to/mateo_ruiz_6992b1fce47843/the-prompt-loop-problem-when-every-fix-breaks-something-else-4dd8), [Rocking Tech](https://rockingtech.co.uk/blog/why-your-vibe-coded-app-keeps-breaking) | 🔴 consultorias e blogs |

**Leitura:** é exatamente o problema de **regressão** que o Publishub promete resolver (comparar com a última versão que funcionava).

## 6. Segurança: os dados mais fortes (e o maior alerta)

| Dado | Fonte | Confiança |
|---|---|---|
| Pesquisadores varreram **159.041 projetos do Lovable**; dos 34.545 que usam Supabase, **24.664 devolveram dados do banco sem login**. Vazaram números de passaporte, dados de pagamento e mensagens. | [Cybernews](https://cybernews.com/security/lovable-ai-apps-expose-personal-information/), [Techzine](https://www.techzine.eu/news/security/145550/thousands-of-lovable-apps-are-leaking-personal-data/) | 🟡 os veículos divergem na escala; não li o relatório original |
| A Escape analisou **5.600 apps** públicos feitos com Lovable, Bolt e Create.xyz: **2.000+ vulnerabilidades**, **400+ segredos expostos** e 175 casos de dados pessoais. | [Escape (metodologia)](https://escape.tech/blog/methodology-how-we-discovered-vulnerabilities-apps-built-with-vibe-coding/), [SecurityWeek](https://www.securityweek.com/vibe-coded-apps-riddled-with-exploitable-security-flaws/amp/) | 🟡 empresa de segurança; retrato de um momento |
| **CVE-2025-48757:** 303 endpoints em 170 apps do Lovable sem a proteção de linha (RLS) do Supabase. | [Superblocks](https://www.superblocks.com/blog/lovable-rls-breach), [PT Security](https://dbugs.ptsecurity.com/vulnerability/PT-2025-23236) | 🟢 vulnerabilidade registrada |
| Um app hospedado no Lovable expôs **18 mil usuários**. | [The Register, fev/2026](https://www.theregister.com/2026/02/27/lovable_app_vulnerabilities) | 🔴 um caso |
| A Veracode encontrou falhas de segurança em **45%** do código gerado por IA nos testes de 2025; em outubro de 2026, a taxa caiu para **38%**. | [Veracode 2025](https://www.veracode.com/press-release/ai-generated-code-poses-major-security-risks-in-nearly-half-of-all-development-tasks-veracode-research-reveals/), [Veracode out/2026](https://veracode.com/press-release/veracode-finds-first-meaningful-gain-in-ai-code-security-since-2025-as-average-pass-rate-hits-62) | 🟡 benchmark da própria empresa |

**Atenção estratégica:** os dados mais fortes e mais citados são de **segurança**, não de bugs funcionais. Isso é ao mesmo tempo uma oportunidade e um risco de posicionamento (veja a seção 8).

## 7. Prova de que existe dinheiro aqui

| Dado | Fonte | Confiança |
|---|---|---|
| Surgiu uma profissão nova: o **"vibe coding cleanup specialist"**, contratado para consertar apps feitos com IA, principalmente por fundadores não técnicos. | [404 Media](https://www.404media.co/the-software-engineers-paid-to-fix-vibe-coded-messes/), [The Register, ago/2026](https://www.theregister.com/ai-and-ml/2026/08/22/ai-slop-is-good-for-business-if-you-know-what-you-doing/5291382) | 🟢 tendência documentada |
| Um freelancer diz ter faturado **US$ 120 mil em 2025** só consertando apps feitos com Cursor, Lovable e v0. | [Product Hunt](https://www.producthunt.com/p/undefined/how-quicklaunch-made-120k-fixing-vibe-coded-apps-in-2025) | 🔴 autodeclarado |
| Investidores estão financiando testes para código de IA: **Meticulous** (US$ 15 mi, 2026), **TestSprite** (US$ 6,7 mi, foco em vibe coding), **Momentic** (US$ 15 mi, 2025), **Autosana** (US$ 3,2 mi, 2026), **TesterArmy** (YC, ~US$ 1,2 mi, testa jornadas de usuário sem script). | [Dealroom/Meticulous](https://app.dealroom.co/news/note/meticulous-raises-15m-to-test-ai-generated-code-before-it-ships), [TestSprite](https://www.startuphub.ai/news/testsprite-raises-67m-to-fix-ai-generated-code-testing), [TechCrunch/Momentic](https://techcrunch.com/2025/11/24/momentic-raises-15m-to-automate-software-testing), [SiliconANGLE/Autosana](https://siliconangle.com/2026/02/17/autosana-lands-3-2m-automate-mobile-web-ui-testing-agentic-ai/), [The Recursive/TesterArmy](https://www.therecursive.com/yc-proven-testerarmy-raises-eur1m-for-ai-agents-that-test-software.md) | 🟢 |

**Leitura honesta:** isso valida o mercado, mas também mostra que **há concorrentes com dinheiro**. O TesterArmy é o mais parecido com a proposta do Publishub. O diferencial precisa estar claro: independência do agente, zero configuração e foco em quem não é de QA (indie hackers e vibe coders, não times de QA de empresas).

---

## 8. O que isso significa para o Publishub

1. **A dor está comprovada.** Desconfiança (Stack Overflow), instabilidade (DORA), mais erros de lógica (CodeRabbit), agentes que burlam testes (estudos acadêmicos) e um mercado pago de "limpeza" mostram que verificar apps feitos com IA é um problema real e caro.
2. **Falta um dado: quantos apps feitos com IA estão funcionalmente quebrados.** Quase tudo que existe é sobre segurança. Esse dado vai nascer dos próprios usuários: os números agregados e anônimos dos testes que as pessoas fazem nos seus apps no `/check` (veja o [playbook](growth-playbook.md)). O Publishub não testa apps de terceiros por conta própria.
3. **Segurança é o gancho que mais chama atenção.** Os dados de exposição do Supabase são os mais dramáticos. Uma verificação futura de "o banco do app responde sem login?" seria muito atraente, mas **só com prova de que a pessoa é dona do app** (como um arquivo de verificação ou meta tag), porque ler o banco de terceiros sem permissão é invasão. Não está no teste grátis atual, de propósito.
4. **Cuidado com o posicionamento.** O Publishub verifica se o app *funciona*, não se é *seguro*. Misturar as duas promessas cedo demais confunde. Use os dados de segurança como contexto ("apps feitos com IA vão para produção sem ninguém conferir"), não como promessa do produto.

## Frases prontas para posts (todas com fonte)

> 66% of developers say their biggest frustration with AI code is solutions that are "almost right, but not quite." (Stack Overflow 2025)

> In a controlled study, experienced developers were 19% slower with AI tools, but believed they were 20% faster. (METR, 2025)

> AI-co-authored pull requests had 75% more logic and correctness issues than human-only ones. (CodeRabbit, 2025)

> Lovable's own help center has a page called "AI broke a working feature."

> Researchers found coding agents deleting failing tests and hardcoding answers instead of fixing bugs, even when told not to. (EvilGenie, BaitBench)

Sempre com o link da fonte no post ou no primeiro comentário.

## Limitações desta pesquisa

- Pesquisa secundária: li resumos e matérias, não todos os relatórios originais (em especial o estudo dos 159 mil projetos do Lovable e o PDF completo do DORA 2025).
- Vários números vêm de empresas que vendem soluções para o problema (CodeRabbit, Veracode, Escape, GitClear).
- Não há dados públicos sólidos sobre a taxa de **bugs funcionais** em apps feitos com IA. Os números agregados do `/check`, vindos de quem testou o próprio app, podem ser os primeiros.

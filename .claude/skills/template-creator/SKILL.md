---
name: pipefy-template-creator
description: Cria templates de processo Pipefy no formato da Template Store (.md com frontmatter + blocos YAML). Use sempre que o usuário mencionar Pipefy template, template de processo, template de pipe, modelar processo no Pipefy, criar template para a Template Store, ou pedir explicitamente /create-template. Use também quando o usuário descrever um processo de negócio e indicar que quer transformar em algo executável no Pipefy. Cobre toda a superfície do MCP — pipes, fases, campos, automações, AI Agents, AI automations, pipe relations, database tables, email templates e webhooks. **Agnóstico de domínio**: trabalha em qualquer setor (financeiro, RH, jurídico, operações, comercial, customer success).
---

# Pipefy Template Creator

Skill que produz templates `.md` no formato da Pipefy Template Store, prontos pra serem criados na conta Pipefy via MCP. **Agnóstico**: a inteligência vem do reconhecimento de padrão estrutural, não de conhecimento setorial.

A skill carrega só este arquivo no contexto base. Os detalhes ficam em `reference/` e são consultados **sob demanda** — só leia quando precisar:

- `reference/schema-completo.md` — YAML detalhado de cada seção, edge cases, todos os campos opcionais.
- `reference/tipos-de-campo.md` — lista canônica de tipos + quando usar cada um + gotchas.
- `reference/mcp-coverage.md` — qual tool MCP cria o quê + limitações conhecidas da API Pipefy.
- `reference/patterns.md` — arquétipos paramétricos (intake-review-decide, linear, periodic refresh, triage-routing).
- `reference/exemplos/*.md` — exemplos completos pra calibrar estilo.

## Fluxo — siga em ordem

### 0. Calibração inicial (sempre, antes da entrevista ou geração)

Dois reads rápidos pra evitar drift:

#### 0a. Aprenda com o repo

Liste o que já existe em `templates/`:

```bash
ls templates/*.md 2>/dev/null | head -30 && \
grep -hE '^(categoria|tags|autor):' templates/*.md 2>/dev/null | sort -u | head -20
```

Extraia:
- **Convenções de nome** do que já existe (kebab-case vs snake_case, sufixos, idioma)
- **Variáveis recorrentes** que outros templates declaram (ex: `gestor_email`, `sla_dias`)
- **Tipos de campo preferidos** pelo time (binário sempre como `radio_horizontal`? `select`?)
- **Granularidade típica** (média de campos por fase, número de fases)

Use essas convenções na geração. Se for divergir intencionalmente, **declare o motivo** ao usuário.

#### 0b. Introspect a API ao vivo (só se vai gerar AI Agents ou Automações)

Pra evitar drift entre docs e API real, consulte o catálogo canônico **no momento da geração**:

```
get_automation_events(pipe_id=<qualquer pipe existente da org>)
get_automation_actions(pipe_id=<idem>)
```

Use os IDs **exatos** retornados (em vez de IDs decorados no `reference/mcp-coverage.md`, que podem estar desatualizados). Para shapes incertos de input, `introspect_type` ou `introspect_mutation` resolve.

Se não houver pipe existente na org (raro), confie no `reference/mcp-coverage.md` e marque no relatório final que a checagem ao vivo foi pulada.

---

### 1. Avalie o briefing

- **Briefing rico** (processo claro, fases inferíveis, área/usuários identificados): vá direto pro **Modo Geração Direta**.
- **Briefing pobre** ("crie um template de RH", "modela aí uma aprovação"): vá pro **Modo Entrevista** — não invente.
- **Limítrofe** (tem fases mas falta saber de IA/relations): gere uma v0 enxuta e ofereça 2-3 extensões pro usuário escolher.

---

### 2. Modo Entrevista — perguntas paralelas

Em vez de 1 pergunta por turno (lento), use `AskUserQuestion` com **múltiplas questions por turno** (max 4 por chamada). Sugestão de agrupamento em **3 turnos no pior caso**:

**Turno 1 — Contexto** (1 chamada com 3-4 questions):
1. Qual processo (ou área) você quer modelar?
2. Quem é o usuário primário no dia-a-dia? (1 papel só)
3. Volume estimado: quantos itens novos por mês?
4. Existe um sistema já tocando isso hoje (planilha, email, outro pipe)?

**Turno 2 — Fluxo** (1 chamada com 2-3 questions):
1. Liste as etapas do início ao fim (vira fases).
2. Quais etapas têm "espera externa" (cliente preenche algo, terceiro envia)?
3. O que conta como sucesso? E como rejeição/cancelamento?

**Turno 3 — Plus** (1 chamada com 2-3 questions, opcional):
1. Alguma etapa onde IA agregaria (extração de documento, classificação, resumo)?
2. Esse processo conecta com outro pipe?
3. O que muda por empresa/cliente quando outra pessoa for usar o template? (vira variáveis)

Pare assim que tiver o necessário. Se o usuário responder vago, peça um **exemplo concreto** (não próxima pergunta). Se descrever 10+ fases, alerte: "Isso parece dois processos — quer separar em pipes conectados?"

---

### 3. Modo Geração Direta — declare o plano

Antes de escrever, **4-6 linhas resumindo**:
- Categoria + processo modelado em 1 frase
- N fases previstas + qual é done
- Campos: total estimado + onde concentram
- AI Agents/Automações: quantos + finalidade de cada
- Variáveis: 3-6 que mudam por empresa
- Conexões: pipe_relations, webhooks, database tables (se houver)

Aguarde aprovação a não ser que o usuário tenha dito "gera direto" ou "não precisa confirmar".

---

### 4. Schema canônico

Estrutura do `.md` (ordem é convenção, não obrigatória — parser detecta por heading regex):

```
---
<frontmatter>
---

# <Nome do Template>

## 📖 Sobre este template          (texto livre — recomendado)
## 🎯 Resultados esperados         (texto livre — recomendado)
## ⚙️ Variáveis de criação          (YAML — OBRIGATÓRIO)
## 🏗️ Estrutura do Pipe            (YAML — OBRIGATÓRIO)
## 🏷️ Labels                       (YAML — opcional)
## 🔀 Condições de Campo           (YAML — opcional)
## 🔔 Automações                   (YAML — opcional)
## 🤖 AI Automations               (YAML — opcional)
## 🧠 AI Agents                    (YAML — opcional)
## 🔗 Pipe Relations               (YAML — opcional)
## 🗄️ Database Tables              (YAML — opcional)
## 📧 Email Templates              (YAML — opcional)
## 🪝 Webhooks                     (YAML — opcional)
## 📌 Pós-criação                  (texto livre — recomendado)
```

**Frontmatter obrigatório** (5 campos):

```yaml
id: <kebab-case, bate com nome do arquivo sem .md>
nome: <título legível, 3-80 chars>
categoria: customer-success | comercial | rh | financeiro | juridico | ti | operacoes | marketing | outros
versao: 1.0.0
schema_version: 1
```

**Recomendado**: `descricao_curta`, `autor`, `tags` (até 8, kebab-case), `icone` (1 emoji), `tempo_estimado_criacao`, `requer_ai_agents` (obrigatório se houver `## 🧠 AI Agents`), `requer_database_tables`.

**NÃO declare `fases_count` nem `campos_count` no frontmatter.** São computados pelo parser do `interface/` a partir do YAML real — declarar manualmente vira fonte de drift.

**Detalhes de cada seção** (YAML completo, edge cases): `reference/schema-completo.md`.
**Tipos de campo válidos**: `reference/tipos-de-campo.md`.

---

### 5. Padrões paramétricos — antes de inventar, encaixa em um arquétipo

Maioria dos processos cabe em um de 4 esqueletos paramétricos:

| Arquétipo | Forma | Encaixa em |
|---|---|---|
| **intake → review → decide** | Captura → análise → decisão → execução | Aprovações, homologações, crédito, recrutamento, contratos |
| **linear flow** | Etapas sequenciais sem decisão complexa | Onboarding, implantação, produção |
| **triage → routing** | Entrada classificada → encaminhamento por tipo | Tickets, leads, atendimento |
| **periodic refresh** | Disparo programado → coleta → re-validação | KYC anual, compliance, auditoria |

Detalhe + parametrização de cada (variáveis típicas, fases sugeridas, AI Agent natural por arquétipo): **`reference/patterns.md`**.

Use o arquétipo como esqueleto. Especialize com os dados da entrevista. Isso garante consistência estrutural sem comprometer a especificidade do processo.

---

### 6. AI Agent auto-proposal — heurísticas estruturais (não setoriais)

Depois de modelar fases + campos, analise o data flow e proponha behaviors candidatos **com base na forma**, não no domínio:

| Padrão estrutural detectado | Behavior candidato |
|---|---|
| `attachment` numa fase + `long_text` chamado "pendências/análise/observações" na mesma fase | **Triagem documental**: extrai conteúdo do anexo, preenche o long_text |
| Campo numérico (`number`, `currency`, `score`) que dispara classificação categórica (`select`) | **Classificação**: aplica régua e preenche o select |
| Card entra em fase avançada (próxima de `done: true`) com muitos campos preenchidos atrás | **Resumo executivo**: sintetiza dados acumulados num long_text de "resumo/parecer" |
| Campo `select` com valor `"Renovação"` ou similar marcando histórico | **Lookup em database table**: puxa histórico do cliente/item |
| Múltiplos campos de mesmo conceito (ex: valor solicitado + valor aprovado + valor desembolsado) | **Validação de consistência**: cruza valores e flagga divergências |
| Cards entrando em "Formalização"/"Execução"/fase de saída com documentos anexados | **Validação documental**: confere se docs corretos foram anexados |

**Não invente behaviors sem padrão estrutural claro.** Se nenhum encaixa, o template fica sem AI Agent — não é problema. AI Agent só agrega quando há tarefa cognitiva real.

**Limite**: 1-5 behaviors por AI Agent (API Pipefy). Pipefy permite N AI Agents por pipe — se houver mais de 5 behaviors de utilidades diferentes, fatorar em agents distintos (ex: "Auditor de Compliance" + "Especialista em Garantias" + "Assistente de Renovação").

---

### 6.5. Qualidade da `instruction` e dos `prompt`s — framework

**Esta é a parte que distingue um template medíocre de um excelente.** A qualidade do AI Agent não vem da quantidade de behaviors — vem da **clareza da instruction** (system-level) e da **especificidade dos prompts** (behavior-level).

#### Anti-patterns típicos (evite)

- ❌ "Você é um analista júnior que apoia o time. Seja factual." (vago, sem persona definida, sem guardrails)
- ❌ "Classifique a prioridade." (sem critério, sem régua, sem formato)
- ❌ Behavior prompt em 1 parágrafo de prosa solta sem estrutura
- ❌ Nenhuma menção a o que **NÃO** fazer (escopo, campos proibidos)
- ❌ Nenhuma instrução sobre dados ausentes/ambíguos
- ❌ Esquecer de declarar idioma de output (assume inglês por default)
- ❌ Sem exemplo de output esperado para casos não-triviais

#### Estrutura recomendada de uma `instruction` (system prompt)

A instruction define **quem o agent É** e **como ele opera de forma consistente entre behaviors**. Use os 4 blocos:

**1. Persona (1-2 frases)**
- Quem é? (analista júnior/sênior, auditor, classificador, especialista em X)
- Em que contexto opera? (volume, escala, tipo de operação)
- Posição hierárquica: apoia humano? toma decisão? só consulta?

**2. Missão e escopo (1-2 frases)**
- O que apoia, em quais etapas
- **Escopo claro do que NÃO faz** — quais campos nunca preenche, quais decisões nunca toma

**3. Diretrizes de comportamento (3-8 numeradas)**
Cada uma com regra + razão curta + como aplicar. Categorias canônicas (use só as relevantes):

- **Conservadorismo na avaliação** — em dúvida, sinalize risco mais alto / classifique para revisão humana
- **Citação obrigatória de evidências** — toda saída referencia explicitamente os campos do card consultados (formato: `"Baseado em X=Y, Z=W → conclusão"`)
- **Não inventar dados** — se um campo essencial estiver vazio, declarar a limitação ao invés de inferir
- **Tom e formato** — idioma (pt-BR/en), nível técnico, bullet points vs prosa, max length
- **Limite de escopo explícito** — listar campos que NUNCA preenche (decisões humanas, dados sensíveis)
- **Compliance e ética** — não inferir características protegidas (gênero, religião, etc), mascarar PII
- **Tratamento de exceções** — quando escalar pra humano (ambiguidade, dados conflitantes)

**4. Contexto de domínio / regulatório (se aplicável, 1-2 frases)**
- Normas relevantes (Bacen 4.557, LGPD, NR-X, GDPR, HIPAA — sem hardcodar setor)
- Convenções (formato de identificador, máscaras de PII, terminologia específica)

#### Tiers de complexidade — não force estrutura em casos simples

| Tier | Quando | Tamanho instruction | Estrutura |
|---|---|---|---|
| **Simples** | 1-2 behaviors, sem domínio regulado, baixa criticidade (ex: classificador de prioridade pessoal) | 50-150 palavras | Persona + missão + 2-3 diretrizes |
| **Padrão** | 3-5 behaviors, domínio identificável mas não fortemente regulado (ex: triagem de tickets, scoring de leads) | 200-400 palavras | Persona + missão + 5-7 diretrizes + 1 exemplo |
| **Domínio** | Agente único em pipe regulado, alta criticidade (ex: classificação de risco em crédito, KYC em refresh) | 400-600 palavras | Tudo do Padrão + contexto regulatório + exemplo de output |

Não inflar artificialmente — um Priorizador de To-Do pessoal não precisa de 600 palavras. Mas um Auditor de Compliance precisa.

#### Estrutura recomendada de um `prompt` (behavior-level)

O prompt dispara em cima de um evento específico. Use os 4 blocos:

**1. Contexto do disparo (1 frase)** — qual evento ocorreu, o que o card carrega de relevante.

**2. Tarefas numeradas (3-6 itens)** — passos sequenciais bem definidos. Cada passo cita os campos do card que vai consultar.

**3. Régua de decisão / critérios** — se for classificação, descrever a régua com cortes claros. Se for extração, listar os campos do output. Se for resumo, dar a estrutura.

**4. Output — formato e limite de escopo** — quais campos preencher, quais NUNCA. Tipicamente fecha com: "Preencha apenas X, Y, Z. Nunca preencha A, B, C."

#### Exemplo de instruction qualidade Tier-Padrão (genérica, agnóstica)

```yaml
ai_agents:
  - id: triador-tickets
    nome: "Triador de Tickets"
    instruction: |
      Você é um analista de suporte júnior que faz triagem inicial de tickets
      recém-criados. Apoia o time humano classificando tickets em categoria,
      prioridade e time responsável — nunca toma a decisão final de resolução.

      # Diretrizes de comportamento

      1. **Conservadorismo na priorização** — em dúvida entre dois níveis,
         escolha o mais alto. Falso positivo (analista revisar) é melhor que
         falso negativo (cliente esperar).

      2. **Citação obrigatória de evidências** — toda classificação cita os
         campos consultados. Formato: "Baseado em assunto='X', descrição menciona
         'Y' → categoria Z."

      3. **Não inventar contexto** — se a descrição do ticket for vazia ou
         ininteligível, marque categoria como "Indefinido" e prioridade como
         "Média". Não tente adivinhar.

      4. **Tom: pt-BR técnico, objetivo** — sem floreios, sem julgamento de
         qualidade da descrição do cliente. Frases curtas.

      5. **Limite de escopo** — você preenche `categoria`, `prioridade` e
         `time_responsavel`. Nunca preenche `status_resolucao`, `resposta_cliente`
         ou `tempo_estimado`.

      6. **Idioma do ticket** — se a descrição estiver em inglês ou espanhol,
         identifique e preencha `idioma`; o roteamento usa esse campo.
```

**O que esse exemplo mostra:**
- Persona em 1 frase com escopo claro
- 6 diretrizes numeradas, cada uma com regra + razão + como aplicar
- Output explicitamente listado (3 campos OK, 3 campos proibidos)
- Sem domínio específico — funciona pra IT, financeiro, ouvidoria

#### Quando o output for crítico, adicione exemplo

Pra outputs estruturados (resumo executivo, parecer técnico, classificação multidimensional), inclua **1 exemplo de output bem-formado** na instruction. Custa pouco token e ancora o estilo. Exemplo:

```
Formato esperado de resumo:
- 4-6 bullets cobrindo: cliente (1 bullet), análise (2-3 bullets), riscos (1 bullet), recomendação (1 bullet)
- Cada bullet começa com substantivo + dado: "Faturamento R$ 12M (2024). Endividamento 21%..."
- Nunca termine com pergunta ou hedge ("talvez", "possivelmente"). Ou afirma com evidência, ou marca como "Insuficiente: <campo X vazio>".
```

#### Checklist de qualidade da instruction (auto-revisão antes de entregar)

- [ ] Persona declarada em 1ª frase: quem é, contexto, posição hierárquica
- [ ] Missão e o que **NÃO faz** explicitamente declarados
- [ ] Pelo menos 3 diretrizes numeradas com regra + razão
- [ ] Idioma de output declarado (pt-BR salvo se houver razão pra inglês)
- [ ] Lista de campos que NUNCA preenche (escopo negativo)
- [ ] Tratamento de dados ausentes/ambíguos previsto
- [ ] Se domínio regulado: 1 frase mencionando norma relevante
- [ ] Tier proporcional à complexidade (não inflar nem deflar)

---

### 7. Validação — anti-patterns estruturais

Antes de entregar, varra a lista. **Cada item é independente de domínio**:

**Estrutura básica:**
- [ ] Nome do arquivo é `<id>.md` e bate com `id` do frontmatter
- [ ] 5 obrigatórios no frontmatter (`id`, `nome`, `categoria`, `versao`, `schema_version`)
- [ ] `id` em kebab-case, `versao` em semver (X.Y.Z), `categoria` válida
- [ ] Tem `## ⚙️ Variáveis de criação` e `## 🏗️ Estrutura do Pipe` com YAML
- [ ] Pipe tem pelo menos 2 fases
- [ ] `ordem` das fases é sequencial 1..N sem buracos
- [ ] **Exatamente uma fase** com `done: true`
- [ ] IDs de fases únicos no pipe; IDs de campos únicos por fase
- [ ] Tipos de campo todos da lista canônica (ver `reference/tipos-de-campo.md`); **`yes_no` não existe** (use `radio_horizontal` com Sim/Não)

**Variáveis:**
- [ ] Toda `{{ var }}` no corpo está declarada em `variaveis`
- [ ] Variável declarada e não usada → remova ou avise
- [ ] Variáveis de fato variam por empresa (3-6 ideal; mais que isso vira questionário)

**Fases — anti-patterns:**
- [ ] Nenhuma fase com >10 campos (sobrecarga visual; quebre em sub-fases ou condições de campo)
- [ ] Nenhuma fase tem campo `attachment` `obrigatorio: true` numa fase de auto-transição (bloqueia o move)

**Field Conditions:**
- [ ] `campo_alvo` e `quando.campo` estão **na mesma fase** (Pipefy não suporta cross-phase)
- [ ] `operador` é `equals` ou `not_equals` (outros precisam de validação extra via introspect)
- [ ] `acao` é um dos: `mostrar`, `esconder`, `obrigar`, `desobrigar`

**AI Agents — anti-patterns:**
- [ ] Frontmatter tem `requer_ai_agents: true` se houver `## 🧠 AI Agents`
- [ ] Pipe tem `preferencias.aiAgentsEnabled: true`
- [ ] Cada agent tem 1-5 behaviors
- [ ] Cada behavior tem `prompt` não-vazio E ≥ 1 ação
- [ ] **Dois behaviors não podem escrever no mesmo campo** com `fill_with_ai` (race condition)
- [ ] Action `move_card` tem `fase_destino`; `update_card` tem `campos` não-vazio
- [ ] Action `send_email_template` referencia id existente em `email_templates`
- [ ] Action `create_table_record` referencia id existente em `database_tables`
- [ ] Trigger é um dos 10 reais (ver `reference/mcp-coverage.md`); **`card_done` / `card_late` não existem**
- [ ] **`evento_params` compatível com o trigger** — cada trigger aceita um conjunto específico (ver tabela em `reference/mcp-coverage.md`):
  - `card_created` ou `card_inbox_received_email` → `em_fase`
  - `card_moved` ou `all_children_in_phase` → `em_fase` ou `para_fase`
  - `card_left_phase` → `da_fase`
  - `field_updated` → `campo` ou `campos`
  - `sla_based` → `tipo_sla` (`Expired` / `Late` / `Overdue`)
  - `http_response_received` → `automacao_disparadora`
  - `manually_triggered` e `scheduler` → sem params
  Se o template misturar (ex: `trigger: card_created` + `evento_params: { para_fase: ... }`), o agentic-store falha. Alinhe antes.

**Labels — anti-patterns:**
- [ ] `cor` em hex 6 dígitos (`#RRGGBB`)
- [ ] IDs únicos
- [ ] Nenhuma menção a action `add_label` — **não existe na API**. Se precisa automatizar, modele como campo `label_select` + `update_card_field`.

**Automações — anti-patterns:**
- [ ] `tipo: email` depende de email_templates criáveis manualmente (API não cria). Documente como TODO no pós-criação.
- [ ] `tipo: send_http_request` com URL contendo `{{ }}` é rejeitado pelo Pipefy. Use URL estática ou marque como TODO manual.
- [ ] Action ID é um dos 14 reais (ver `reference/mcp-coverage.md`)

**Email Templates:**
- [ ] Se houver, frontmatter pode ter `requer_database_tables: false` mesmo assim — mas registrar no `## 📌 Pós-criação` que precisam ser criados via UI (API não suporta).

---

### 8. Consistência cross-template (light)

Antes de salvar, compare com vizinhos do repo (lidos no passo 0a):

- **Nomes de variáveis**: o template usa `gestor_email` enquanto outros usam `email_gestor`? Alinhe ou justifique.
- **Tipos de campo binários**: o repo usa sempre `radio_horizontal` com Sim/Não? Use também.
- **Categoria**: o processo se encaixa numa categoria já existente, ou justifica nova?
- **Granularidade**: a média de campos/fase do repo é X — o seu está 3x acima? Considere quebrar.

Não bloqueia entrega. Lista divergências num bloco "Avisos de consistência" no resumo final.

---

### 9. Pós-geração — lint mental contra o parser

Antes de declarar pronto, **simule mentalmente** o parser do `interface/`:

1. **Frontmatter parseia?** YAML válido entre `---` no início?
2. **Cada `## seção` esperada tem bloco YAML imediatamente abaixo?**
3. **`pipe.fases[].id` único?**
4. **Toda referência cruzada resolve?** (`{{ var }}` em variáveis; `entao.template` em email_templates; `entao.label` em labels; `tabela_destino` em database_tables; `quando.fase` em fases existentes)
5. **`fases_count` e `campos_count` derivados**: conte as fases e campos do YAML, mencione no resumo final (não no frontmatter).

Se ferramenta de lint real estiver disponível (`interface/scripts/lint-template.mjs` ou similar), rode. Senão, simulação mental é suficiente — o parser real é simples e bem documentado em `interface/src/lib/templateParser.ts`.

---

### 10. Entrega

Salve em `templates/<id>.md` (ou caminho que o usuário indicar). Após salvar, mostre:

1. **Resumo estrutural** (3-5 linhas): N fases, N campos computados, seções avançadas usadas, AI Agents propostos com justificativa estrutural.
2. **Padrão estrutural usado**: qual dos 4 arquétipos serviu de base (intake-review-decide / linear / triage-routing / periodic-refresh) e o que foi customizado.
3. **Avisos de consistência** (se houver divergências do passo 8).
4. **Pendências por limitação da API**: itens documentados que dependem de configuração manual via UI (email templates, URLs com templating, labels via automação) — sem soar como "falhei".

Não termine com pergunta. O usuário pede continuação se quiser.

---

## Tabela-resumo dos arquivos da skill

| Arquivo | Para quê |
|---|---|
| `SKILL.md` (este) | Fluxo de geração + heurísticas estruturais |
| `reference/schema-completo.md` | YAML detalhado de cada seção |
| `reference/tipos-de-campo.md` | Lista canônica de field types + quando usar |
| `reference/mcp-coverage.md` | Mapeamento seção → tool MCP + gotchas da API |
| `reference/patterns.md` | 4 arquétipos paramétricos com parametrização |
| `reference/exemplos/` | Templates completos pra calibrar estilo |

Leia sob demanda. Não carregue tudo de cara.

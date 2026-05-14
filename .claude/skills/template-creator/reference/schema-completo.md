# Schema completo — Pipefy Template Store

Referência detalhada de cada seção, com **todos os campos opcionais** e edge cases. Para uso quando o `SKILL.md` principal não tem detalhe suficiente.

## Índice

1. [Frontmatter](#1-frontmatter)
2. [Variáveis](#2-variáveis-de-clonagem)
3. [Pipe](#3-estrutura-do-pipe)
4. [Automações](#4-automações)
5. [AI Automations](#5-ai-automations)
6. [AI Agents](#6-ai-agents)
7. [Pipe Relations](#7-pipe-relations)
8. [Database Tables](#8-database-tables)
9. [Email Templates](#9-email-templates)
10. [Webhooks](#10-webhooks)
11. [Mapeamento MCP](#11-mapeamento-mcp)

---

## 1. Frontmatter

```yaml
---
# OBRIGATÓRIOS
id: kebab-case-id
nome: "Nome do template (3-80 chars)"
categoria: customer-success
versao: 1.0.0
schema_version: 1

# RECOMENDADOS
descricao_curta: "Até 200 chars — aparece no card do catálogo"
autor: "seu-handle"
tags: [tag1, tag2, tag3]
icone: 🤝
tempo_estimado_clonagem: "~45 segundos"

# CONDICIONAIS — declare quando aplicável
requer_ai_agents: true              # Se template tem ai_agents
requer_database_tables: true        # Se template tem database_tables
requer_plano_enterprise: true       # Para features avançadas
fases_count: 5                      # Pré-cálculo para o catálogo
campos_count: 17                    # Pré-cálculo para o catálogo
---
```

**Categorias válidas (use exatamente esses valores):**

| Valor | Quando usar |
|-------|-------------|
| `customer-success` | Onboarding, retention, gestão de contas |
| `comercial` | Vendas, prospecção, fechamento |
| `rh` | Recrutamento, onboarding interno, ponto, férias |
| `financeiro` | Aprovações, despesas, faturamento |
| `juridico` | Contratos, compliance, LGPD |
| `ti` | Helpdesk, change management, infra |
| `operacoes` | Logística, supply chain, produção |
| `marketing` | Campanhas, conteúdo, lead nurturing |
| `outros` | Quando nenhuma das acima encaixa |

---

## 2. Variáveis de clonagem

```yaml
variaveis:
  - nome: nome_do_pipe           # snake_case, único no template
    label: "Nome do pipe"        # texto que aparece no formulário
    tipo: string                 # ver tipos abaixo
    default: "Onboarding"        # opcional
    obrigatorio: true            # opcional, default false
    placeholder: "Ex: ..."       # opcional, dica visual
    descricao: "Texto longo..."  # opcional, ajuda contextual
```

### Tipos de variável

| Tipo | Notas | Campos extras |
|------|-------|---------------|
| `string` | Texto curto | `placeholder` |
| `number` | Inteiro ou decimal | `min`, `max` |
| `email` | Validação de email no frontend | `placeholder` |
| `select` | Dropdown com opções fixas | `opcoes: [...]` (obrigatório, lista de strings) |
| `boolean` | Sim/não, checkbox | — |

### Substituição de variáveis — preservação de tipo

Quando uma variável é **o valor inteiro de um campo YAML**, o tipo é preservado:

```yaml
sla_dias: "{{ sla_implantacao_dias }}"  # vira number 10, não string "10"
```

Quando está embutida em string, vira interpolação:

```yaml
descricao: "Pipe com SLA de {{ sla_implantacao_dias }} dias"  # vira string
```

---

## 3. Estrutura do Pipe

```yaml
pipe:
  nome: "{{ nome_do_pipe }}"
  descricao: "Descrição interna do pipe"
  publico: false                 # se cards são acessíveis sem login
  anonimo: false                 # se forms aceitam submissão anônima
  preferencias:
    icone: "🤝"
    aiAgentsEnabled: true        # obrigatório se for criar AI Agents
    publicForm: false            # form público de criação de cards
    customCardName: "{{ campo_id }}"  # campo que vira o nome do card
  fases:
    - id: kebab-case-id
      nome: "Nome legível"
      descricao: "O que essa fase representa"
      ordem: 1                   # sequencial 1..N
      done: false                # última fase: true
      lateAfter: 5               # cards ficam "atrasados" após N dias (opcional)
      sla_dias: 10               # ou "{{ var }}"
      cor: "blue"                # opcional, visual no kanban
      campos:
        - id: kebab-case-id
          label: "Label do campo"
          tipo: short_text
          descricao: "Help text"
          obrigatorio: false
          editavel_apos_criacao: true
          unico: false           # se valor precisa ser único entre cards
          minimo: 0              # para number
          maximo: 100            # para number
          moeda: "BRL"           # para currency
          opcoes:                # para select/radio/checklist
            - "Opção A"
            - "Opção B"
          conector_pipe: "123"   # para tipo `connector` — id do pipe destino
          conector_tabela: "456" # para tipo `connector` — id da tabela destino
```

---

## 4. Automações

Automações são regras condicionais sem IA. "Quando X, faça Y."

```yaml
automacoes:
  - id: alerta-sla
    nome: "Alerta de SLA estourado"
    quando:
      evento: card_atrasado_em_fase   # ver eventos abaixo
      fase: implantacao
    entao:
      tipo: email                     # email | mover_card | atualizar_campo | criar_card | criar_card_conectado | enviar_webhook
      para: "{{ cs_email }}"
      template: alerta-sla            # referência a email_templates
```

### Eventos válidos (`quando.evento`) — IDs reais da API Pipefy

Obtidos via `get_automation_events`. Use **estes IDs exatos** no template:

| Event ID | Parâmetros aceitos (`quando.event_params`) | Quando dispara |
|---|---|---|
| `card_created` | — | Card aparece no pipe (após submissão do start form) |
| `card_moved` | `to_phase_id` | Card é movido para uma fase específica |
| `card_left_phase` | `from_phase_id` | Card sai de uma fase específica |
| `field_updated` | `triggerFieldIds: [<internal_id>]` | Valor de campo muda. **Exige `internal_id` numérico**, não slug. |
| `sla_based` | `kindOfSla: Expired \| Late \| Overdue` | Prazo de fase é atingido/estourado |
| `card_inbox_received_email` | `in_phase_id` | Email chega no inbox do pipe |
| `all_children_in_phase` | `to_phase_id` | Todos os cards filhos chegam numa fase |
| `http_response_received` | `triggerAutomationId` | Webhook de resposta HTTP retorna |
| `manually_triggered` | — | Disparo manual via botão na UI |
| `scheduler` | — | Cron-style. **Blacklist longa** — só compatível com algumas actions. |

⚠️ Nota: `AutomationEventParamsInput` é case-misto na API real — `to_phase_id` é snake_case mas `triggerFieldIds`/`fromPhaseId`/`inPhaseId`/`kindOfSla`/`triggerAutomationId` são camelCase. Não normalize cegamente.

### Tipos de ação (`entao.tipo`) — IDs reais da API Pipefy

Obtidos via `get_automation_actions`. **Use o ID exato.** Apelidos PT-BR (mover_card, atualizar_campo) **não funcionam** na API.

| Action ID | Parâmetros principais (`entao.action_params`) | Notas |
|---|---|---|
| `move_single_card` | `to_phase_id` | Move o card disparador para outra fase. |
| `update_card_field` | `fields_map_order: [...]` | Atualiza campo(s) do card. |
| `create_card` | `fields_map_order: [...]` | Cria card novo no mesmo pipe. |
| `create_connected_card` | `fields_map_order: [...]` (cross-pipe via `action_repo_id`) | Cria card em pipe filho via pipe_relation. |
| `move_parent_card` | `to_phase_id` | Move o card pai (em pipe_relations). |
| `send_email_template` | `email_template_id` | ⚠️ **Templates não são criáveis via API** — só via UI. |
| `send_a_task` | `task_params` | Cria tarefa interna assignada a alguém. |
| `send_http_request` | `url`, `httpMethod` (camelCase!), `headers` (string JSON!), `body` | ⚠️ URL com `{{ }}` é rejeitada — sintaxe de templating só pela UI. |
| `distribute_assignments` | `strategy` | Round-robin entre assignees. |
| `apply_sla_rules` | `sla_params` | Aplica regras de SLA dinamicamente. |
| `run_a_formula` | — | Executa fórmula configurada na UI. |
| `generate_with_ai` | `ai_params` | One-shot IA (precursor do AI Agent). |
| `schedule_create_card` | `fields_map_order` | Cria card numa data futura. |
| `move_multiple_cards` | `to_phase_id` | Move vários cards de uma vez. |

❌ **`add_label` NÃO existe** como action — labels são aplicáveis apenas manualmente pelo usuário. Se precisar de label automatizável, modele como campo `label_select` no pipe e use `update_card_field`.

---

## 5. AI Automations

AI Automation = **um prompt** que **preenche um campo** quando um evento dispara. Disparo único, escopo único.

```yaml
ai_automations:
  - id: classificar-urgencia
    nome: "Classificar urgência via IA"
    quando:
      evento: card_criado_em_fase
      fase: triagem
    prompt: |
      Com base nos campos {{ titulo }} e {{ descricao }} do card,
      classifique a urgência como Alta, Média ou Baixa.
      Considere palavras-chave, prazos mencionados e impacto descrito.
    escrever_em_campo: urgencia
    modo: fill_with_ai           # fill_with_ai | append | overwrite
```

**Diferença vs AI Agent:** AI Automation é simples (um trigger → um campo). AI Agent tem múltiplos behaviors, mantém contexto entre triggers, e pode tomar ações compostas (mover card + atualizar campos + enviar email).

**Quando usar AI Automation em vez de AI Agent:**

- Só preenchimento de um campo (não outras ações)
- Não precisa coordenar múltiplos triggers
- Custo computacional menor

---

## 6. AI Agents

```yaml
ai_agents:
  - id: assistente-triagem
    nome: "Assistente de Triagem"
    instruction: |
      Você é um <persona em 1 frase> que apoia o time humano em <missão e momento
      do fluxo>. Nunca toma a decisão final — apenas fornece insumos qualificados.

      # Diretrizes de comportamento

      1. **Conservadorismo na avaliação** — em dúvida, sinalize risco mais alto.
         Falso positivo (analista revisar manualmente) é preferível a falso negativo.

      2. **Citação obrigatória de evidências** — toda saída referencia os campos
         do card consultados. Formato: "Baseado em <campo>=<valor>, <campo>=<valor>
         → <conclusão>".

      3. **Não inventar dados** — se um campo essencial estiver vazio ou ambíguo,
         declare a limitação explicitamente ao invés de inferir.

      4. **Tom e idioma** — pt-BR técnico-objetivo. Frases curtas. Bullets quando
         listar. Sem floreios.

      5. **Limite de escopo** — você preenche apenas <campos OK>. Nunca preenche
         <campos exclusivos do humano>.

      <Se domínio regulado: parágrafo final mencionando norma relevante>

    data_source_ids:             # opcional — IDs de fontes de dados externas
      - "ds-base-conhecimento"

    behaviors:                   # 1 a 5 (limite da API Pipefy)
      - nome: "Classificar prioridade ao entrar"
        trigger: card_created    # card_created | card_moved | field_updated | sla_based | card_left_phase | card_inbox_received_email | all_children_in_phase | http_response_received | manually_triggered | scheduler
        evento_params:
          em_fase: triagem              # → inPhaseId (camelCase na API)  para card_created
          para_fase: analise            # → to_phase_id (snake)          para card_moved
          da_fase: triagem              # → fromPhaseId (camelCase)      para card_left_phase
          campos_disparadores: [campo1] # → triggerFieldIds (camelCase)  para field_updated; usa internal_id
          tipo_sla: Expired             # → kindOfSla (camelCase)        para sla_based

        prompt: |
          <Contexto do disparo em 1 frase, citando o evento e quais campos do
          card são relevantes.>

          Tarefas:
          1. <passo, citando campo>
          2. <passo>
          3. <passo>

          Régua / critérios de decisão:
          - <critério com cortes claros>

          Preencha apenas <campos OK>. Nunca preencha <campos proibidos>.

        capacidades:             # opcional — ferramentas extras que o agent pode usar
          - buscar_card_relacionado
          - consultar_tabela

        acoes:                   # PELO MENOS 1 ação. API rejeita lista vazia.
          - nome: "Preencher prioridade"
            tipo: update_card
            campos:
              - id: prioridade
                modo: fill_with_ai     # fill_with_ai | literal
                valor: "..."           # se modo: literal
```

⚠️ **A qualidade da `instruction` e do `prompt` é o que separa um template medíocre de um excelente.** Não fique no esqueleto acima — siga o framework de qualidade detalhado em `SKILL.md` §6.5 (persona, missão, 3-8 diretrizes, contexto regulatório se aplicável, tiers de complexidade Simples/Padrão/Domínio).

### Tipos de ação no AI Agent

| Tipo | Campos esperados |
|------|------------------|
| `move_card` | `fase_destino` |
| `update_card` | `campos: [{ id, modo, valor? }]` (mínimo 1 campo) |
| `create_card` | `pipe_destino`, `campos` |
| `create_connected_card` | `relation_id`, `campos` |
| `create_table_record` | `tabela_destino`, `campos` |
| `send_email_template` | `email_template` (id) |

### Triggers e parâmetros

| Trigger | Parâmetros obrigatórios |
|---------|------------------------|
| `card_created` | `em_fase` |
| `card_moved` | `para_fase` (recomendado; sem isso dispara em qualquer movimento) |
| `field_updated` | `campos_disparadores` (sem isso dispara em qualquer campo) |
| `card_done` | — |
| `card_late` | `em_fase` (opcional) |
| `card_overdue` | — |

---

## 7. Pipe Relations

```yaml
pipe_relations:
  - id: rel-suporte
    nome: "Card relacionado em Suporte Recorrente"
    pipe_filho_id: "123456"                # ID literal OU
    pipe_filho_externo: "{{ var }}"        # via variável (usuário escolhe)
    cardinalidade: one_to_one              # one_to_one | one_to_many | many_to_many
    auto_fill: true                        # se cria automaticamente o card filho
    nome_no_filho: "Card pai (Onboarding)" # como aparece no pipe filho
    descricao: "Após onboarding, abre card em Suporte."
```

**Quando usar pipe relation:** quando dois processos se conectam e cards de um precisam apontar para cards do outro. Exemplo clássico: Onboarding → Suporte Recorrente.

---

## 8. Database Tables

```yaml
database_tables:
  - id: fornecedores
    nome: "Fornecedores"
    descricao: "Tabela auxiliar de fornecedores aprovados"
    colunas:
      - id: razao-social
        label: "Razão Social"
        tipo: short_text
        obrigatorio: true
      - id: cnpj
        label: "CNPJ"
        tipo: cnpj
        obrigatorio: true
        unico: true
      - id: categoria
        label: "Categoria"
        tipo: select
        opcoes: [Serviços, Produtos, Software]
    permissoes:
      escrita: [admins, compras]
      leitura: [todos]
```

**Quando usar database table:** quando o pipe precisa referenciar uma lista que muda com o tempo (fornecedores, clientes ativos, SKUs, departamentos). Use o tipo de campo `connector` no pipe apontando para essa table via `conector_tabela`.

**Quando NÃO usar:** listas curtas e estáveis (3-7 opções fixas) — use `select` com `opcoes` no próprio campo.

---

## 9. Email Templates

```yaml
email_templates:
  - id: alerta-sla
    nome: "Alerta de SLA"
    assunto: "⚠️ SLA estourado: {{ card.nome_cliente }}"
    corpo: |
      Olá {{ card.cs_responsavel }},

      O card {{ card.nome_cliente }} estourou o SLA na fase
      {{ card.fase_atual }} em {{ card.dias_atraso }} dias.

      Detalhes:
      - Cliente: {{ card.nome_cliente }}
      - Valor: {{ card.valor_contrato }}
      - Vendedor: {{ card.vendedor_responsavel }}

      Acesse o card: {{ card.url }}
    de: "no-reply@suaempresa.com"
    responder_para: "{{ cs_email }}"
    cc: []                         # opcional
    bcc: []                        # opcional
    anexar_pdf_card: false         # opcional
```

### Variáveis disponíveis no corpo do email

- `{{ card.<campo_id> }}` — qualquer campo do card
- `{{ card.url }}` — URL do card no Pipefy
- `{{ card.fase_atual }}` — nome da fase atual
- `{{ card.dias_atraso }}` — se houver SLA estourado
- `{{ card.criado_em }}`, `{{ card.atualizado_em }}` — timestamps
- `{{ var }}` — variáveis do template (resolvidas na clonagem)

---

## 10. Webhooks

```yaml
webhooks:
  - id: notificar-crm
    nome: "Notificar CRM ao concluir onboarding"
    url: "{{ webhook_crm_url }}"     # use variável, nunca URL hardcoded
    eventos:                          # ver lista abaixo
      - card.move
      - card.done
    filtro:                           # opcional, dispara só se condição bate
      fase_destino: concluido
      campo_igual:
        campo: status
        valor: aprovado
    headers:                          # opcional, custom auth
      Authorization: "Bearer {{ webhook_crm_token }}"
      X-Source: "pipefy-template-store"
    metodo: POST                      # POST | PUT (default POST)
    payload_extra:                    # opcional, campos a injetar
      origem: "pipefy"
      template_id: "{{ frontmatter.id }}"
```

### Eventos válidos

- `card.create` — card criado
- `card.move` — card movido entre fases
- `card.done` — card chega em fase com `done: true`
- `card.late` — card fica atrasado
- `card.field_update` — qualquer campo atualizado (especifique `filtro.campo` para limitar)
- `card.delete` — card deletado
- `card.expired` — SLA estourado

---

## 11. Mapeamento MCP

Seção opcional que ajuda o executor (Claude + MCP) a traduzir entre tipos abstratos do template e a API real do Pipefy. **Útil quando você usa tipos não-óbvios** ou quer documentar transformações.

```yaml
mapeamento_mcp:
  tool_create_pipe:
    - source: pipe.nome
      target: name
    - source: pipe.preferencias.aiAgentsEnabled
      target: preferences.aiAgentsEnabled

  tool_create_field:
    tipos_compativeis:
      short_text: short_text
      cnpj: cnpj
      # ...

  tool_create_ai_agent:
    - source: ai_agents[].nome
      target: name
    - source: ai_agents[].behaviors
      target: behaviors
      transform: traduzir_behavior_para_api_shape
```

Para a maioria dos templates simples, **omita essa seção** — o executor sabe o mapeamento default. Use só quando há ambiguidade ou customização.

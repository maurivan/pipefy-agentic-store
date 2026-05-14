# Cobertura MCP — o que cada seção do template chama

Mapa de quais tools do MCP Pipefy cada seção do template aciona. Útil quando você precisa entender **o que vai acontecer na execução** ou diagnosticar limitações.

O MCP do Pipefy (`gbrlcustodio/pipefy-mcp-server`) expõe **128 tools** em 9 áreas. Templates da Template Store cobrem **as áreas modeláveis declarativamente** — descritas aqui.

## Resumo: seção → área → ferramentas principais

| Seção do template | Área do MCP | Tools principais |
|-------------------|-------------|------------------|
| `pipe.fases[]` | Pipes & Cards | `create_pipe`, `create_phase`, `create_phase_field` |
| `labels` | Pipes & Cards | `create_label` |
| `condicoes_campo` | Pipes & Cards | `create_field_condition` |
| `automacoes` | Automations & AI | `get_automation_events`, `get_automation_actions`, `create_automation`, `create_send_task_automation` |
| `ai_automations` | Automations & AI | `create_ai_automation`, `validate_ai_automation_prompt` |
| `ai_agents` | Automations & AI | `get_pipe`, `create_ai_agent`, `validate_ai_agent_behaviors` |
| `pipe_relations` | Relations | `create_pipe_relation` |
| `database_tables` | Database Tables | `create_table`, `create_table_field`, `create_table_record` |
| `email_templates` | ❌ NÃO clonável via API | API GraphQL pública **não expõe** `createEmailTemplate` — manual via UI |
| `webhooks` | Members, Email & Webhooks | `create_webhook` |

## Áreas NÃO cobertas (intencional)

| Área MCP | Por que não está no template |
|----------|------------------------------|
| Reports (17 tools) | Relatórios são criados sob demanda, não fazem parte da estrutura inicial |
| Observability (10 tools) | Logs e usage stats não fazem sentido em template |
| Card-level CRUD | Templates criam **estrutura**, não cards individuais |
| Introspection | Usado pelo executor em runtime, não declarado em template |
| Organization (1 tool) | Read-only, contexto pré-existente |

Se você precisar de algo dessas áreas, é via **uso direto do MCP no chat**, não via template.

## Ordem de execução implícita

Quando o agente clona um template, ele segue esta ordem (gerada pelo SYSTEM prompt do executor, não pelo template):

1. **`create_pipe`** — sempre primeiro, retorna `pipe_id`
2. **`create_label` × N** — independente de fases; antes de automações/AI agents que usem `add_label`
3. **`create_table` × N** + **`create_table_field` × N** — antes de criar campos do tipo `connector` que apontem para tables. Opcionalmente seguido de **`create_table_record` × N** para seed inicial.
4. **`create_phase` × N** — em ordem do campo `ordem`
5. **`create_phase_field` × N** — para cada fase, antes de passar pra próxima
6. **`create_field_condition` × N** — depois de todos os campos (precisa de field_ids reais)
7. **`get_pipe`** (se houver AI Agents) — para obter `pipe_uuid`
8. **`get_automation_events`** + **`get_automation_actions`** (se houver AI Agents/Automations) — descoberta de IDs reais
9. ~~`createEmailTemplate`~~ — **NÃO FEITO**. API GraphQL pública não expõe essa mutation. Email templates ficam como TODO manual (UI) no relatório final.
10. **`create_automation` × N** — APENAS automações `entao.tipo != email`. Automações tipo email dependem de email_template_id real e ficam como TODO.
11. **`create_ai_automation` × N**
12. **`create_ai_agent` × N**
13. **`create_pipe_relation` × N** — opcional, depende de IDs de outros pipes
14. **`create_webhook` × N** — por último, requer URL HTTPS válida (sem scheme = pula com aviso)

## Limitações conhecidas da API que viram regras do schema

### AI Agents

- **1-5 behaviors por agent** — máximo da API
- **Mínimo 1 ação por behavior** — API rejeita `actionsAttributes: []`
- **`aiAgentsEnabled: true` no pipe é obrigatório** — sem isso, `create_ai_agent` falha
- **`repo_uuid` é necessário** (não `repo_id`) — vem do `get_pipe`

### Pipe Relations

- Pipe pai e pipe filho **precisam existir** antes da criação
- Se `pipe_filho_externo` é variável e o usuário não preenche, **pular silenciosamente** (não é erro)

### Database Tables

- Devem ser criadas **antes** de campos `connector` que apontem para elas
- IDs de coluna **únicos dentro da table**, kebab-case

### Email Templates ⚠️ NÃO CLONÁVEL VIA API

- **A API GraphQL pública do Pipefy NÃO expõe `createEmailTemplate`** — confirmado via introspecção em 2026-05-13.
- Email templates só podem ser criados manualmente na UI.
- Em cascata, **automações com `entao.tipo: email` também ficam pendentes** (a action `send_email_template` precisa de um `emailTemplateId` real).
- Mesmo sem poder criar, **mantenha a seção `email_templates:` no template** — ela serve como spec/documentação para o usuário criar manualmente pós-clone, e o executor (agentic-store) lista cada um como TODO no relatório final.
- Variáveis no corpo permanecem como referência: `{{ card.<campo_id> }}` para campos, `{{ variavel }}` para variáveis do template.

### Webhooks

- URL deve ser HTTPS público acessível
- Pipefy faz retry com backoff em falhas; webhook deve ser idempotente
- Headers customizados são suportados, mas Pipefy adiciona `X-Pipefy-Signature` automaticamente

### Labels

- `cor` deve ser hex 6 dígitos (`#RRGGBB`). Pipefy aceita variações mas o canônico é maiúsculo.
- IDs lógicos servem só pra referência cruzada no template — Pipefy gera ID numérico próprio retornado por `create_label`.
- ⚠️ **`add_label` NÃO existe como ação de Automation no catálogo Pipefy** (confirmado via `get_automation_actions` em 2026-05-14). Ações disponíveis: `move_single_card`, `update_card_field`, `create_card`, `create_connected_card`, `move_parent_card`, `send_email_template`, `send_a_task`, `send_http_request`, `distribute_assignments`, `apply_sla_rules`, `run_a_formula`, `generate_with_ai`, `schedule_create_card`, `move_multiple_cards`.
- AI Agent actions também **não incluem** `add_label` — labels são adicionáveis apenas manualmente pelo usuário no card.
- **Workarounds possíveis** se aplicação de label automática for crítica:
  1. Criar um campo `label_select` no pipe e usar `update_card_field` para preencher — mas isso é um campo, não a label nativa do card.
  2. Usar `send_a_task` em vez de label para sinalizar o analista visualmente.
  3. Documentar como uso manual no `## 📌 Pós-criação`.

### Field Conditions

- Devem ser criadas **depois** de todos os campos do pipe (precisam de `field_internal_id` reais — numéricos, não slugs — retornados por `create_phase_field`).
- Operadores testados e funcionando: `equals`, `not_equals`. Demais (`contains`, `greater_than`, etc) precisam ser validados via introspecção da `createFieldCondition` se usados.
- Condições são por-fase: `campo_alvo` e `quando.campo` devem coexistir na mesma fase (Pipefy não suporta condições cross-phase).
- Estrutura do payload: `condition.expressions[0].field_address`, `expressions_structure: [["0"]]`, `actions[].phaseFieldId` (camelCase no action mas snake_case no field_address — inconsistência da API).

## Gotchas de tipos de campo

- **`yes_no` NÃO é tipo válido** em `create_phase_field` nem `create_table_field`. Use `radio_horizontal` com `options: ["Sim", "Não"]`. **Erro retornado é enganoso**: `"Phase not found"` (em vez de "invalid field type").
- Lista canônica: `short_text`, `long_text`, `number`, `date`, `datetime`, `currency`, `email`, `phone`, `select`, `radio_horizontal`, `radio_vertical`, `checklist_horizontal`, `checklist_vertical`, `label_select`, `assignee_select`, `attachment`, `connector`, `cpf`, `cnpj`, `time`, `due_date`, `id`, `statement`.

## Gotchas de AI Agent

- `create_ai_agent` é **operação 2-fase**: cria agent vazio, depois faz update com behaviors. Se o update falhar, o agent fica criado mas sem behaviors. O erro retorna `agent_uuid` — use `update_ai_agent(uuid)` em vez de recriar.
- `aiAgentsEnabled` em `RepoPreferenceInput` **não existe**. Habilitação é implícita ao criar o primeiro agent.

## Tabela canônica — `evento_params` por trigger

`AutomationEventParamsInput` é case-misto na API real. **Use sempre via lookup**, nunca derive do nome do trigger:

| `trigger` / `event_id` | YAML amigável (template) | API real (`eventParams.<chave>`) | Tipo do valor |
|---|---|---|---|
| `card_created` | `em_fase: <fase_id>` | **`inPhaseId`** *(camelCase)* | phase_id (string) |
| `card_moved` | `em_fase: <fase_id>` ou `para_fase: <fase_id>` | **`to_phase_id`** *(snake_case)* | phase_id (string) |
| `card_left_phase` | `da_fase: <fase_id>` | **`fromPhaseId`** *(camelCase)* | phase_id (string) |
| `field_updated` | `campos: [<field_id>...]` ou `campo: <field_id>` | **`triggerFieldIds`** *(camelCase, lista)* | **field_internal_id** (numérico, não slug) |
| `sla_based` | `tipo_sla: Expired \| Late \| Overdue` | **`kindOfSla`** *(camelCase)* | string |
| `card_inbox_received_email` | `em_fase: <fase_id>` | **`inPhaseId`** *(camelCase)* | phase_id (string) |
| `all_children_in_phase` | `em_fase: <fase_id>` ou `para_fase: <fase_id>` | **`to_phase_id`** *(snake_case)* | phase_id (string) |
| `http_response_received` | `automacao_disparadora: <id>` | **`triggerAutomationId`** *(camelCase)* | automation_id (string) |
| `manually_triggered` | — | (sem params) | — |
| `scheduler` | — | (sem params; configurado fora) | — |

**Regra mnemônica fraca, lookup é forte**: só `card_moved` e `all_children_in_phase` usam snake_case (`to_phase_id`). Tudo mais é camelCase. Quando em dúvida, **introspect**:

```
introspect_type("AutomationEventParamsInput")
```

Se um `trigger` novo aparecer (Pipefy adicionar eventos), atualize a tabela antes de gerar templates que o usem.

## Gotchas de `send_http_request`

- Campo é **`httpMethod`** (camelCase), **não `http_method`** como sugere o catálogo do `get_automation_actions`. Sentar valores `GET | POST | PUT | DELETE | PATCH`.
- `headers` é **String JSON-serializada**, não objeto. Exemplo correto: `"headers": "{\"Accept\": \"application/json\"}"`. Sentar como objeto retorna `"Could not coerce value to String"`.
- ⚠️ **URL templating com `{{ }}` é rejeitado.** `https://api.exemplo.com/{{ cnpj }}` retorna `"Invalid URL"` porque o Pipefy valida sintaxe de URL **antes** da substituição de variáveis. A sintaxe correta de templating em URL só é descoberta via export do payload da UI; templates declarativos não conseguem configurar isso. **Para essas automações, documente como TODO manual** no `## 📌 Pós-clonagem`.
- Demais campos: `url` (String), `body` (String), `authenticationType` (enum: `oauth2 | authorization | api_key | no_auth`), `authenticationKey`, `authenticationValue`, `authenticationAddTo`.

## Gotchas de Pipefy genérico

- Todo pipe novo nasce com 3 fases default: `Inbox`, `Doing`, `Done`. O `agentic-store` deleta automaticamente após criar as fases custom (via `delete_phase` com `confirm=True`).
- A **primeira fase declarada (`ordem: 1`) mapeia para o `startFormPhaseId`** auto-criado pelo Pipefy, não para uma fase regular. Cards submetidos via formulário inicial passam direto pra `ordem: 2`. Documente esse comportamento no `## 📌 Pós-clonagem` se relevante.

## Como o executor lida com erros parciais

Se uma chamada falha no meio (ex: `create_field` no campo 14 de 17), o comportamento padrão é **fail-forward**: o que foi criado fica, e o agente reporta o que parou. **Não tente projetar templates assumindo rollback** — eles são executados linearmente.

Implicação prática: ordene as seções do template de forma que **dependências venham antes de quem depende delas**. Se `webhook X` referencia `email_template Y`, ambos precisam estar no template (e o executor cria email primeiro).

## Quando seu template precisa de coisa fora do schema

Se você precisa de algo que **o template não suporta** (ex: criar 5 cards de exemplo automaticamente, configurar permissões granulares por fase, adicionar membros específicos), há duas opções:

1. **Documentar na seção `## 📌 Pós-clonagem`** — instruir o usuário a fazer manualmente após a clonagem
2. **Estender o schema** — adicionar uma seção nova (ex: `## 👥 Membros`) e atualizar parser + executor

A primeira é o caminho rápido pra MVP. A segunda exige mudança no código da Template Store, não só no template.

---
name: agentic-store
description: Cria a partir de um template de processo do Pipefy (pipe + fases + campos + AI Agents + relações) escolhido interativamente do repositório remoto `maurivan/pipefy-agentic-store` no GitHub, usando o MCP pipefy.
---

# Agentic Store — Criação de Templates Pipefy

Crie um pipe a partir do template de processo da pasta `templates/` do repo público **`maurivan/pipefy-agentic-store`** (branch `main`) usando o MCP `pipefy`.

Cada template é um `.md` com **YAML frontmatter** (`id`, `nome`, `descricao_curta`, `categoria`, `fases_count`, `campos_count`, `requer_ai_agents`, `icone`, etc.) + conteúdo a criar.

## Regra de shell

**Sempre aspar URLs com `?`, `&`, `*` ou `[]` em single quotes.** O shell padrão (zsh) trata `?` como glob e falha com `no matches found` em URLs como `...?ref=main` sem aspas.

## Fluxo

Execute em ordem. Se algo falhar, **PARE** e reporte — não tente consertar sozinho.

### 0. Preflight — verificar MCP Pipefy

Antes de qualquer coisa, confirme que o MCP `pipefy` está registrado e conectado:

```bash
claude mcp get pipefy 2>&1
```

- **Se a saída contiver `✓ Connected`**, siga para o passo 1 sem dizer nada.

- **Se o comando falhar (exit != 0) ou não contiver `✓ Connected`**, o MCP não está pronto. Avise o usuário em uma frase:

  > O MCP do Pipefy não está instalado/conectado. Vou seguir as instruções de `INSTALL-MCP.md` deste repo para instalá-lo.

  Em seguida, **baixe e siga** o documento remoto `INSTALL-MCP.md`:

  ```bash
  INSTALL_TMP=$(mktemp -t pipefy-install-XXXXXX.md)
  curl -fsSL 'https://raw.githubusercontent.com/maurivan/pipefy-agentic-store/main/INSTALL-MCP.md' -o "$INSTALL_TMP"
  echo "$INSTALL_TMP"
  ```

  Use `Read` no path retornado e **execute as instruções do documento em ordem, do passo 1 ao 8**. As instruções contêm os comandos exatos para instalar o MCP, pedir Client ID/Secret ao usuário, registrar com `claude mcp add -e KEY=VALUE` (não `add-env`), e verificar a conexão.

  Quando a instalação terminar com sucesso, **lembre o usuário de reiniciar o Claude Code** para as tools `mcp__pipefy__*` carregarem, e **pare este fluxo aqui**. Ele vai reinvocar `/agentic-store` depois do restart.

  Se a instalação falhar em qualquer passo, pare e reporte o erro — não tente seguir para o passo 1.

### 1. Listar templates e ler frontmatter

Um único comando bash lista todos os `.md` e despeja o frontmatter de cada um, separados por marcadores `===URL`. Prefira `gh api` (autenticado); se falhar, use `curl`.

```bash
gh api 'repos/maurivan/pipefy-agentic-store/contents/templates?ref=main' \
  --jq '.[] | select(.name | endswith(".md")) | "\(.name)\t\(.download_url)"' \
| while IFS=$'\t' read -r name url; do
    echo "===FILE: $name"
    echo "===URL:  $url"
    curl -fsSL "$url" | sed -n '1,/^---$/p'
    echo
  done
```

Se `gh` falhar (deslogado, sem rede), fallback:

```bash
curl -fsSL 'https://api.github.com/repos/maurivan/pipefy-agentic-store/contents/templates?ref=main' \
  | python3 -c "import sys,json; [print(f'===FILE: {x[\"name\"]}\\n===URL:  {x[\"download_url\"]}') for x in json.load(sys.stdin) if x['name'].endswith('.md')]"
```

(No fallback você ainda precisará buscar o frontmatter de cada URL com `curl -fsSL '<url>' | sed -n '1,/^---$/p'`.)

Se a resposta vier vazia ou der erro de rate limit, avise e pare.

Para cada template, guarde: `name`, `download_url`, `nome`, `descricao_curta`, `fases_count`, `campos_count`, `requer_ai_agents`, `icone`.

### 2. Escolher template

Use `AskUserQuestion` (max 4 opções por chamada). Cada opção:

- `label`: `{icone} {nome}`
- `description`: `{descricao_curta} — {fases_count} fases, {campos_count} campos` + ` (com AI Agents)` se `requer_ai_agents=true`

Se houver mais de 4 templates, mostre 3 + "Ver mais" e repita a pergunta. Se houver só 1 template, ofereça "Cancelar" como segunda opção (AskUserQuestion exige mínimo 2).

### 3. Baixar template completo

```bash
TEMPLATE_TMP=$(mktemp -t agentic-store-XXXXXX.md)
curl -fsSL -o "$TEMPLATE_TMP" '<download_url>'
echo "$TEMPLATE_TMP"
```

Use `Read` no path retornado. **Não escreva o template no repo nem commite** — é cache `/tmp` descartável.

### 4. Coletar variáveis

O bloco `variaveis:` do frontmatter é a **fonte única** de variáveis do template. Não faça grep nos `{{ ... }}` do corpo — confie no schema declarado.

Para cada entrada em `variaveis:`, respeite:

- `label` — texto da pergunta ao usuário (não use o `nome` técnico).
- `tipo` — `string`, `email`, `number`, `select`. Para `select`, ofereça apenas os valores em `opcoes`.
- `default` — sugira como valor padrão; se o usuário não responder explicitamente, aplique.
- `obrigatorio` — se `true` e o usuário deixar vazio, repergunte. Se `false`, vazio vira `""` e passos dependentes podem ser pulados (ver passo 6).
- `min` / `max` — valide faixa em `number`.
- `placeholder` — mostre como exemplo de formato.

Numa **única mensagem**, liste todas as variáveis numeradas com seus `label`, `tipo`, `default` (se houver) e marque as obrigatórias. Quando o usuário responder, **substitua todas as `{{ variavel }}` no conteúdo** antes de qualquer chamada ao MCP.

### 5. Plano em 5 linhas (sem aprovação explícita)

Mostre exatamente 5 linhas:

1. `Vou criar "<nome>" (<fases_count> fases, <campos_count> campos)`
2. Total estimado de tool calls (some labels + tables + condições + automações + webhooks se as seções existirem)
3. Ordem: pipe → labels → database_tables → fases (ordem 1 = start form) → campos → field_conditions → automações → AI agents → pipe_relation → webhooks → **pergunta sobre seed de cards exemplo**
4. Variáveis aplicadas (resumo curto)
5. Avisos / passos que serão pulados (se houver)

**Siga direto para o passo 6 após mostrar o plano** — não espere "pode executar". O usuário interrompe a sessão se algo estiver errado. Isso é intencional: o plano dá visibilidade pra interrupção, mas não bloqueia a execução.

### 6. Executar criação

#### Paralelismo controlado

Algumas etapas são independentes entre si e podem rodar em paralelo (múltiplas tool calls num mesmo turno). Outras têm dependências e DEVEM ser sequenciais. Sempre limite cada burst paralelo a **5 chamadas concorrentes** pra evitar rate limit (~100-200 req/min na maioria dos planos).

**PARALELO permitido:**
- **Labels entre si** (passo 2) — recursos independentes.
- **Tables entre si** (passo 3) — recursos independentes, MAS as `colunas` DENTRO de cada table ficam **sequenciais** (`create_table_field` precisa do `table_id` E o Pipefy pode rejeitar concorrência no mesmo recurso pai).
- **Webhooks entre si** (passo 10) — recursos independentes.
- **Passos 2 + 3 simultaneamente** — labels e tables não se referenciam; pode dispará-los no mesmo turno.

**SEQUENCIAL obrigatório:**
- Passo 1 (create_pipe) → tudo depende do `pipe_id`.
- Passo 4 (fases) → ordem matters; campos `connector` (passo 5) referenciam `table_id` do passo 3.
- Passo 4b (delete_phase) → não paralelize; Pipefy pode falhar se múltiplos deletes na mesma chamada.
- Passo 5 (campos por fase) → criar TODOS campos da fase A antes de avançar pra fase B (necessário pra resolver dependências de field_conditions a seguir).
- Passo 6 (field_conditions) → dependem de field IDs do passo 5.
- Passo 7 (automações) → dependem de phase IDs + label IDs + caches do `get_automation_*`.
- Passo 8 (AI Agents) → operação 2-fase própria; cada agent é sequencial.
- Passo 9 (pipe_relation) → 1 só.
- Passo 10 (webhooks) → paralelo entre si MAS depois das fases (se houver `filtro.fase_destino`).

**Como aplicar**: quando o passo permite paralelo, faça as N tool calls **no mesmo turno** (multi-tool-use). Se N > 5, quebre em batches de 5 — cada batch é um turno.

---

1. **Criar o pipe.** Não tente setar `aiAgentsEnabled` via `update_pipe.preferences` — esse campo **não existe** em `RepoPreferenceInput`. AI Agents são habilitados implicitamente quando você cria o primeiro agent.
   - O Pipefy cria 3 fases default (`Inbox`/`Doing`/`Done` ou versão localizada). **Não delete agora** — Pipefy exige ao menos 1 fase no pipe; deletamos depois de criar as fases custom (passo 4b).
   - **Cache obrigatório a partir do payload de `create_pipe`** — `Pipe` GraphQL retorna `id`, `uuid` e `startFormPhaseId` no `CreatePipePayload`. Guarde os três:
     - `pipe_id` — usado em quase todas as chamadas a seguir.
     - `pipe_uuid` — usado como `repo_uuid` na criação de AI Agents (passo 8). **Evita um `get_pipe` redundante.**
     - `startFormPhaseId` — usado no passo 4 (mapeia para a fase `ordem: 1`).
   - Se o MCP `create_pipe` não expuser `uuid` no payload (raro), faça **um único** `get_pipe(pipe_id)` agora e cache os três campos — não chame `get_pipe` novamente nos passos 4b e 8.
2. **Para cada label em `labels:`** (pule se a seção não existir):
   - `create_label(pipe_id, name, color)` — `color` é hex `#RRGGBB`.
   - Guarde `label_id` por id lógico (ex: `urgente` → `987654`).
3. **Para cada table em `database_tables:`** (pule se a seção não existir):
   - `create_table(organization_id, name, description)` → guarde `table_id`.
   - Para cada `coluna`: `create_table_field(table_id, label, field_type, options, required, unique)`.
   - Crie **todas as colunas** antes de avançar.
   - Mapa: `table_id` por id lógico; `table_field_id` por `(table_id, coluna_logical_id)` — usado quando campos `connector` do pipe apontam pra ela.
4. **Criar fases** na ordem definida pelo campo `ordem`. **A primeira fase (`ordem: 1`) NÃO é criada via `create_phase`** — ela mapeia para o `startFormPhaseId` do pipe (auto-criado por `create_pipe`). Guarde `phase_map[ordem_1_logical_id] = startFormPhaseId`. Para `ordem: 2..N`, use `create_phase` normalmente. Mantenha `custom_phase_ids` = set dos IDs criados via `create_phase` (sem incluir startFormPhaseId).
4b. **Deletar fases default do Pipefy.** Imediatamente após criar todas as fases custom (`ordem: 2..N`):
   - `get_pipe(pipe_id)` → liste todas as fases.
   - Para cada fase cujo `id` **NÃO está em `custom_phase_ids`** E **não é o startFormPhaseId**: `delete_phase(phase_id=X, pipe_id=Y, confirm=True)`.
   - Não filtre por nome (Pipefy pode localizar `Inbox`/`Doing`/`Done` para PT-BR — a comparação de IDs é à prova de locale).
   - Se algum delete falhar (cards já presentes, restrição de plano, etc.), **continue** e registre como aviso no relatório final.
5. **Para cada fase custom, criar TODOS os campos antes de avançar pra próxima.** Guarde `field_id` (e `field_internal_id`) por id lógico do campo. Campos `connector` resolvem `conector_tabela` → `table_id` real do passo 3.
   - **`yes_no` não é tipo válido** em `create_phase_field` — use `radio_horizontal` com `options: ["Sim", "Não"]`. O erro retornado é enganoso ("Phase not found"); reconheça e troque.
6. **Para cada condição em `condicoes_campo:`** (pule se a seção não existir):
   - Resolva `fase`, `campo_alvo`, `quando.campo` para IDs reais (usar `field_internal_id`, não slug).
   - `create_field_condition` aceita `operation`: `equals`, `not_equals` (testado e funciona); outros operadores via introspecção da `createFieldCondition` mutation se necessário.
7. **Para cada automação em `automacoes:`** (pule se a seção não existir):
   - Uma vez por pipe, chame `get_automation_events(pipe_id)` e `get_automation_actions(pipe_id)` pra validar `event_ids`/`action_types` suportados; cache os resultados.
   - Resolva referências antes de criar: `quando.fase` → `phase_id` real; `entao.label` → `label_id` real; `{{ card.<campo> }}` permanece literal.
   - Use `create_automation` com o `action_type` retornado por `get_automation_actions`.
   - **Triagem automática de automações que devem ser puladas**:
     - `tipo: email` (depende de `email_template_id` que não pode ser criado via API).
     - `tipo: add_label` (action inexistente no catálogo Pipefy).
     - `tipo: send_http_request` cuja `url` contém `{{` (Pipefy faz URL-validation strict antes do template substitution — recurso só funciona via UI).
   - Para essas, **PULA** e registre como TODO manual no relatório final.
   - **Mapeamento campo → ação** para tipos que funcionam:
     - `tipo: move_single_card` → `action_id: "move_single_card"` + `action_params: {"to_phase_id": "<phase_id>"}`
     - `tipo: send_http_request` (sem template em URL) → `action_id: "send_http_request"` + `action_params: {"url": "...", "httpMethod": "GET|POST|PUT|DELETE", "headers": "<JSON string>", "body": "<JSON string>"}`
     - `tipo: update_card_field` → `action_id: "update_card_field"` + `action_params: {"fields_map_order": [...]}`
8. **Para cada AI Agent:**
   - Use o `pipe_uuid` **já cacheado** no passo 1 como `repo_uuid`. **Não chame `get_pipe` aqui** — é redundante.
   - `get_automation_events(pipe_id)` / `get_automation_actions(pipe_id)` — reaproveite os caches do passo 7 se já feitos.
   - **NOVO — Auto-introspect uma vez por sessão**: na primeira automação OU primeiro AI Agent (o que vier antes), chame `introspect_type("AutomationEventParamsInput")` e cache o resultado. Use as chaves retornadas pela API como fonte da verdade — a tabela abaixo é cache estático, não dogma.
   - **Construa `eventParams` via lookup explícito, NUNCA por adivinhação**. Tabela canônica (sincronizada com `template-creator/reference/mcp-coverage.md`):

     | `trigger` | YAML do template | API real (`eventParams.<chave>`) | Valor |
     |---|---|---|---|
     | `card_created` | `em_fase: X` | `inPhaseId` ⚠️ camelCase | phase_id |
     | `card_moved` | `em_fase: X` / `para_fase: X` | `to_phase_id` snake | phase_id |
     | `card_left_phase` | `da_fase: X` | `fromPhaseId` ⚠️ camelCase | phase_id |
     | `field_updated` | `campos: [X]` ou `campo: X` | `triggerFieldIds` ⚠️ camelCase | **field_internal_id** (numérico) |
     | `sla_based` | `tipo_sla: Expired\|Late\|Overdue` | `kindOfSla` ⚠️ camelCase | string |
     | `card_inbox_received_email` | `em_fase: X` | `inPhaseId` ⚠️ camelCase | phase_id |
     | `all_children_in_phase` | `em_fase: X` / `para_fase: X` | `to_phase_id` snake | phase_id |
     | `http_response_received` | `automacao_disparadora: X` | `triggerAutomationId` ⚠️ camelCase | automation_id |
     | `manually_triggered` | — | (sem params) | — |
     | `scheduler` | — | (sem params) | — |

   - **Regra:** se o trigger do behavior não está na tabela acima, NÃO invente o nome do campo — chame `introspect_type("AutomationEventParamsInput")` e use as chaves retornadas.
   - `create_ai_agent(name, instruction, repo_uuid, behaviors)` — operação **2-fase** (cria vazio + update com behaviors). Se o update falhar, o erro retorna `agent_uuid` no payload — use-o com `update_ai_agent` em vez de recriar (evita duplicata).
9. **pipe_relation:** se a variável `pipe_suporte_id` (ou equivalente) estiver vazia, PULE.
10. **Para cada webhook em `webhooks:`** (pule se a seção não existir):
    - Substitua `{{ variavel }}` em `url`, `headers.*` e qualquer payload extra.
    - Se `url` ficar vazia ou sem scheme (`http://` ou `https://`) após substituição, **PULE esse webhook** e registre aviso.
    - Resolve `filtro.fase_destino` → `phase_id` real (se a seção `filtro` existir).
    - `create_webhook(pipe_id, name, url, actions, email, headers)` — `actions` é a lista de eventos (`card.create`, `card.move`, etc); inspecione com `introspect_mutation('createWebhook')` na primeira chamada se o shape for incerto.
11. **Mantenha mapa de IDs lógicos → IDs reais** (labels, tables, table_fields, fases, campos, automações, webhooks) e referencie nas chamadas seguintes.
12. **Após cada tool call bem-sucedida**, uma linha curta de status.
13. **Paralelismo controlado** — siga a tabela "PARALELO permitido / SEQUENCIAL obrigatório" no topo do passo 6. Etapas com dependências cruzadas (campos `connector` → tables; field_conditions → fields; automações → phases+labels) ficam sequenciais; recursos independentes (labels, tables entre si, webhooks) podem rodar em batches de até 5 concorrentes no mesmo turno.
14. **Falhou? Pare e reporte** com o erro completo. Não tente consertar — exceto pelo caso explícito do passo 8 (AI Agent partial-create recovery via `update_ai_agent`).

### 6b. Seed opcional de cards de exemplo

Após a criação estrutural completa (passo 6 todo), **antes** do relatório final:

1. Use `AskUserQuestion` (single-select, 2 opções):
   - **Sim, criar 10 cards de exemplo** — útil pra demo, teste de workflow ou treinamento do time.
   - **Não, pipe vazio** — produção pura.

2. **Se "Sim":**
   - Gere 10 personas/casos coerentes com a categoria e contexto do template:
     - `financeiro` (crédito, AP, despesas) → PJs brasileiras com CNPJ, razão social, faturamento, score realistas.
     - `customer-success` (onboarding, ticket) → clientes B2B com contrato, segmento, MRR.
     - `rh` → funcionários com CPF, departamento, cargo.
     - `juridico` → contratos / partes / vigência.
     - `comercial` → leads / oportunidades / pipeline value.
     - `operacoes` → fornecedores / produtos / categorias.
   - **Distribuição** (excluindo a fase `done`, que recebe apenas cards "completos"):
     - 6 fases (5 ativas + 1 done): 2/2/2/2/1/1
     - 5 fases (4 ativas + 1 done): 2/2/3/2/1
     - 4 fases (3 ativas + 1 done): 3/3/3/1
     - 3 fases (2 ativas + 1 done): 4/4/2
   - Para cards em fases avançadas, **preencha também todos os campos das fases anteriores** (um card no Comitê precisa ter campos de KYC e Análise preenchidos consistentemente).
   - Use `card.<id>.dados_realistas` — gere texto que faça sentido pro setor (não use `aaaa` ou `Lorem ipsum`).

3. **Procedimento por card:**
   - `create_card(pipe_id, title=<razão social ou similar>, fields={...start form fields}, skip_elicitation=True)` → guarda `card_id`. Card nasce no start form.
   - Para cada fase intermediária no caminho até a fase final do card:
     - `fill_card_phase_fields(card_id, phase_id=X, fields={...}, skip_elicitation=True)` para preencher a fase atual.
     - `move_card_to_phase(card_id, destination_phase_id=Y)` para avançar.
   - Não preencha campos da fase `done` em cards que NÃO estão lá (regra: dados só na fase em que o card está e nas anteriores).

4. **Status durante seed**: `✓ Card N/10 criado (Alfa Tech) — em Análise de Crédito`.

5. **Se falhar em algum card**: continua os outros, registra avisos no relatório final. Não aborta tudo.

### 7. Relatório final

Mostre um resumo **estruturado e descritivo** do que foi entregue. O foco é orientar o usuário sobre o que existe no pipe, não sobre o que falta fazer.

**Estrutura obrigatória:**

1. **Cabeçalho** — nome do pipe + URL clicável (`https://app.pipefy.com/pipes/<pipe_id>`).

2. **Descrição (1-2 frases)** — explique o que esse pipe faz em linguagem natural, derivada do `descricao_curta` do template e adaptada ao que foi efetivamente criado.

3. **Estrutura do fluxo** — tabela ou lista das fases na ordem do processo, cada uma com 1 linha descrevendo o propósito (extraída do `descricao` da fase). Inclua um marcador `✓ done` na fase final.

4. **Configuração ativa** — apresente cada seção apenas se houver itens criados, na ordem:
   - **🏷️ Labels** — nome + cor.
   - **🗄️ Database Tables** — nome + N colunas + propósito de cada table (extraído do `descricao`).
   - **🔀 Condições de Campo** — quantas + 1 exemplo curto de cada (ex: "Esconder X quando Y = Z").
   - **🔔 Automações** — apenas as criadas com sucesso, cada uma com descrição funcional (ex: "Move card para Comitê quando o analista preenche o parecer").
   - **🧠 AI Agents** — para cada agent: nome + objetivo (1 frase) + N behaviors com uma linha cada explicando o gatilho e a ação.
   - **🪝 Webhooks** — apenas os criados, com URL e eventos.
   - **🌱 Cards de exemplo** — se o seed foi feito, a distribuição por fase ("2 em KYC, 2 em Análise, 1 em Comitê...") e que foram populados com dados realistas.

5. **NÃO inclua**:
   - Seção "TODOs manuais" / "O que falta fazer" / "Passos pós-criação".
   - Listagem do que foi pulado (email_templates, add_label, send_http_request com `{{}}`).
   - Avisos sobre fases default deletadas (assume sucesso silencioso; só mencione se algo falhou).
   - Recomendações de calibração, treinamento, integração.
   - Lista de limitações da API.

6. Se algo crítico falhou (não apenas pulado, mas **erro real** durante a execução), inclua uma seção curta **⚠️ Falhas** com a operação que falhou e o erro retornado. Não use isso para itens pulados intencionalmente.

7. **Tom**: positivo, factual, técnico-objetivo. Frases curtas. Use markdown tables quando útil. Sem floreios. O usuário deve sair do relatório sabendo o que tem, não o que falta.

## Limitações conhecidas da API Pipefy (sempre considerar)

- **`aiAgentsEnabled` em `RepoPreferenceInput`**: não existe. Habilitação é implícita.
- **`yes_no` em `create_phase_field`**: não é tipo válido. Erro é "Phase not found" (enganoso).
- **`create_ai_agent` é 2-fase**: create + update. Recupere parcial via `update_ai_agent(agent_uuid)`.
- **`AutomationEventParamsInput` é case-misto**: `to_phase_id` (snake) + `triggerFieldIds` (camel) na mesma API.
- **`triggerFieldIds` quer `internal_id`**, não slug.
- **Pipefy cria 3 fases default** (`Inbox`/`Doing`/`Done`) em todo pipe novo — a skill deleta automaticamente no passo 4b após criar as fases custom (`delete_phase` exige `confirm=True`).
- **`AutomationActionParamsInput` para `send_http_request`**:
  - Campo é `httpMethod` (camelCase), **não `http_method`**.
  - `headers` é **String JSON-serializada**, não objeto: `"{\"Accept\": \"application/json\"}"`.
  - Demais campos HTTP: `url` (String), `body` (String), `authenticationType` (enum), `authenticationKey`, `authenticationValue`, `authenticationAddTo`.
- **`send_http_request` rejeita URLs templates** tipo `https://api.exemplo.com/{{field}}` com `"Invalid URL"`. Pipefy faz **validação strict de URL antes da substituição de variáveis** — sintaxe de templating em URL deve ser descoberta via export da UI. Se o template tiver `{{` na URL, **PULA a automação** e registre como TODO manual.
- **`AutomationActionParamsInput` para `move_single_card`**: campo é `to_phase_id` (snake_case). Aceita `field_updated` como trigger apesar de `triggerEvents=["card_moved", "all_children_in_phase"]` (o `triggerEvents` é informativo; a regra real é o `actionsBlacklist` do evento).
- **`add_label` NÃO existe como action**. Confirmado via `get_automation_actions` em 2026-05-14. Lista real: `generate_with_ai`, `send_a_task`, `send_email_template`, `move_single_card`, `update_card_field`, `create_connected_card`, `create_card`, `move_parent_card`, `distribute_assignments`, `run_a_formula`, `send_http_request`, `apply_sla_rules`, `schedule_create_card`, `move_multiple_cards`. Se o template usa `tipo: add_label`, **PULA** e documente como uso manual.

## Regras

- Sempre exiba o plano (passo 5) **antes** de qualquer chamada ao MCP — é a janela de interrupção do usuário.
- IDs reais retornados pelas tools, nunca inventados.
- Se o usuário interromper, informe o que **já foi criado** para ele decidir continuar/limpar.
- A skill só interage com o Pipefy via MCP — não toca no repo local.

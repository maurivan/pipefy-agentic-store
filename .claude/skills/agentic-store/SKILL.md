---
name: agentic-store
description: Clona um template de processo do Pipefy (pipe + fases + campos + AI Agents + relações) escolhido interativamente do repositório remoto `maurivan/pipefy-agentic-store` no GitHub, usando o MCP pipefy.
---

# Agentic Store — Clonagem de Templates Pipefy

Clone um template de processo da pasta `templates/` do repo público **`maurivan/pipefy-agentic-store`** (branch `main`) usando o MCP `pipefy`.

Cada template é um `.md` com **YAML frontmatter** (`id`, `nome`, `descricao_curta`, `categoria`, `fases_count`, `campos_count`, `requer_ai_agents`, `icone`, etc.) + conteúdo a clonar.

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

1. `Vou clonar "<nome>" (<fases_count> fases, <campos_count> campos)`
2. Total estimado de tool calls (some labels + tables + condições + automações + webhooks se as seções existirem)
3. Ordem: pipe → labels → database_tables → fases → campos → field_conditions → automações → AI agents → pipe_relation → webhooks (se aplicáveis)
4. Variáveis aplicadas (resumo curto)
5. Avisos / passos que serão pulados (se houver)

**Siga direto para o passo 6 após mostrar o plano** — não espere "pode executar". O usuário interrompe a sessão se algo estiver errado. Isso é intencional: o plano dá visibilidade pra interrupção, mas não bloqueia a execução.

### 6. Executar clonagem

1. **Criar o pipe.** Não tente setar `aiAgentsEnabled` via `update_pipe.preferences` — esse campo **não existe** em `RepoPreferenceInput`. AI Agents são habilitados implicitamente quando você cria o primeiro agent. Guarde `pipe_id`.
   - Atenção: o Pipefy cria 3 fases default (`Inbox`, `Doing`, `Done`) na criação do pipe. **Inclua no relatório final como TODO de limpeza** (user deleta manualmente).
2. **Para cada label em `labels:`** (pule se a seção não existir):
   - `create_label(pipe_id, name, color)` — `color` é hex `#RRGGBB`.
   - Guarde `label_id` por id lógico (ex: `urgente` → `987654`).
3. **Para cada table em `database_tables:`** (pule se a seção não existir):
   - `create_table(organization_id, name, description)` → guarde `table_id`.
   - Para cada `coluna`: `create_table_field(table_id, label, field_type, options, required, unique)`.
   - Crie **todas as colunas** antes de avançar.
   - Mapa: `table_id` por id lógico; `table_field_id` por `(table_id, coluna_logical_id)` — usado quando campos `connector` do pipe apontam pra ela.
4. **Criar fases** na ordem definida pelo campo `ordem`. Guarde cada `phase_id`.
5. **Para cada fase, criar TODOS os campos antes de avançar pra próxima.** Guarde `field_id` (e `field_internal_id`) por id lógico do campo. Campos `connector` resolvem `conector_tabela` → `table_id` real do passo 3.
   - **`yes_no` não é tipo válido** em `create_phase_field` — use `radio_horizontal` com `options: ["Sim", "Não"]`. O erro retornado é enganoso ("Phase not found"); reconheça e troque.
6. **Para cada condição em `condicoes_campo:`** (pule se a seção não existir):
   - Resolva `fase`, `campo_alvo`, `quando.campo` para IDs reais (usar `field_internal_id`, não slug).
   - `create_field_condition` aceita `operation`: `equals`, `not_equals` (testado e funciona); outros operadores via introspecção da `createFieldCondition` mutation se necessário.
7. **Para cada automação em `automacoes:`** (pule se a seção não existir):
   - Uma vez por pipe, chame `get_automation_events(pipe_id)` e `get_automation_actions(pipe_id)` pra validar `event_ids`/`action_types` suportados; cache os resultados.
   - Resolva referências antes de criar: `quando.fase` → `phase_id` real; `entao.label` → `label_id` real; `{{ card.<campo> }}` permanece literal.
   - Use `create_automation` com o `action_type` retornado por `get_automation_actions`.
8. **Para cada AI Agent:**
   - `get_pipe(pipe_id)` → pegue `pipe.uuid` como `repo_uuid`.
   - `get_automation_events(pipe_id)` / `get_automation_actions(pipe_id)` — reaproveite os caches do passo 7 se já feitos.
   - `create_ai_agent(name, instruction, repo_uuid, behaviors)` — operação **2-fase** (cria vazio + update com behaviors). Se o update falhar, o erro retorna `agent_uuid` no payload — use-o com `update_ai_agent` em vez de recriar (evita duplicata).
   - **`eventParams` usa nomes mistos**: `to_phase_id` é snake_case; `triggerFieldIds`, `fromPhaseId`, `inPhaseId`, `kindOfSla`, `triggerAutomationId` são camelCase. Não normalize cegamente.
   - **`triggerFieldIds` espera `field_internal_id`** (numérico), não slug.
9. **pipe_relation:** se a variável `pipe_suporte_id` (ou equivalente) estiver vazia, PULE.
10. **Para cada webhook em `webhooks:`** (pule se a seção não existir):
    - Substitua `{{ variavel }}` em `url`, `headers.*` e qualquer payload extra.
    - Se `url` ficar vazia ou sem scheme (`http://` ou `https://`) após substituição, **PULE esse webhook** e registre aviso.
    - Resolve `filtro.fase_destino` → `phase_id` real (se a seção `filtro` existir).
    - `create_webhook(pipe_id, name, url, actions, email, headers)` — `actions` é a lista de eventos (`card.create`, `card.move`, etc); inspecione com `introspect_mutation('createWebhook')` na primeira chamada se o shape for incerto.
11. **Mantenha mapa de IDs lógicos → IDs reais** (labels, tables, table_fields, fases, campos, automações, webhooks) e referencie nas chamadas seguintes.
12. **Após cada tool call bem-sucedida**, uma linha curta de status.
13. **Sequencial, sem paralelismo** — todas as etapas têm dependências (tables antes de fields `connector`; labels antes de automações com `add_label`; field_conditions depois de fields).
14. **Falhou? Pare e reporte** com o erro completo. Não tente consertar — exceto pelo caso explícito do passo 8 (AI Agent partial-create recovery via `update_ai_agent`).

### 7. Relatório final

- `pipe_id`
- URL: `https://app.pipefy.com/pipes/<pipe_id>`
- Contagem: labels, tables (+ colunas), fases, campos, condições de campo, automações, AI agents, webhooks criados
- **TODOs manuais pós-clone (sempre listar):**
  - Deletar fases default do Pipefy (Inbox, Doing, Done)
  - Webhook(s) pulados por URL inválida (se houver)
  - Popular database tables vazias (se houver)

## Limitações conhecidas da API Pipefy (sempre considerar)

- **`aiAgentsEnabled` em `RepoPreferenceInput`**: não existe. Habilitação é implícita.
- **`yes_no` em `create_phase_field`**: não é tipo válido. Erro é "Phase not found" (enganoso).
- **`create_ai_agent` é 2-fase**: create + update. Recupere parcial via `update_ai_agent(agent_uuid)`.
- **`AutomationEventParamsInput` é case-misto**: `to_phase_id` (snake) + `triggerFieldIds` (camel) na mesma API.
- **`triggerFieldIds` quer `internal_id`**, não slug.
- **Pipefy cria 3 fases default** (`Inbox`/`Doing`/`Done`) em todo pipe novo — sempre orientar limpeza manual.

## Regras

- Sempre exiba o plano (passo 5) **antes** de qualquer chamada ao MCP — é a janela de interrupção do usuário.
- IDs reais retornados pelas tools, nunca inventados.
- Se o usuário interromper, informe o que **já foi criado** para ele decidir continuar/limpar.
- A skill só interage com o Pipefy via MCP — não toca no repo local.

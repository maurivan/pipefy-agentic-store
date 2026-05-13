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

### 5. Plano em 5 linhas + aprovação

Mostre exatamente 5 linhas:

1. `Vou clonar "<nome>" (<fases_count> fases, <campos_count> campos)`
2. Total estimado de tool calls (some labels + condições + emails + automações se as seções existirem)
3. Ordem: pipe → labels → fases → campos → field_conditions → email_templates → automações → AI agents → pipe_relation (se aplicável)
4. Variáveis aplicadas (resumo curto)
5. Avisos / passos que serão pulados

**Espere `pode executar`** (ou sim/ok/vai). Não execute nada antes da aprovação. Se pedir mudanças, ajuste e mostre de novo.

### 6. Executar clonagem

1. **Criar o pipe** com `preferences.aiAgentsEnabled = true`. Guarde `pipe_id`.
2. **Para cada label em `labels:`** (pule se a seção não existir):
   - `create_label(pipe_id, name, color)` — `color` é hex `#RRGGBB`.
   - Guarde `label_id` por id lógico (ex: `urgente` → `987654`).
3. **Criar fases** na ordem definida pelo campo `ordem`. Guarde cada `phase_id`.
4. **Para cada fase, criar TODOS os campos antes de avançar pra próxima.** Guarde `field_id` (e `field_internal_id`) por id lógico do campo.
5. **Para cada condição em `condicoes_campo:`** (pule se a seção não existir):
   - Resolva `fase`, `campo_alvo`, `quando.campo` para IDs reais.
   - Na primeira chamada, `introspect_mutation('createFieldCondition')` pra descobrir o shape exato do input (Pipefy pode usar `EQUALS` em maiúsculas ou outro formato de operador).
   - `create_field_condition` com os parâmetros normalizados.
6. **Para cada email_template em `email_templates:`** (pule se a seção não existir):
   - Substitua `{{ variavel }}` em `assunto`, `corpo` e `de` — mas **mantenha literais** `{{ card.<campo> }}` (são resolvidos pelo Pipefy em runtime).
   - Não há tool MCP dedicada — use `introspect_mutation('createEmailTemplate')` (ou `search_schema('email template')`) pra descobrir a forma do input e crie via `execute_graphql`.
   - Guarde `email_template_id` por id lógico (ex: `alerta-sla` → `12345`).
7. **Para cada automação em `automacoes:`** (pule se a seção não existir):
   - Uma vez por pipe, chame `get_automation_events(pipe_id)` e `get_automation_actions(pipe_id)` pra validar `event_ids`/`action_types` suportados; cache os resultados.
   - Resolva referências antes de criar: `quando.fase` → `phase_id` real; `entao.template` → `email_template_id` real; `entao.label` → `label_id` real; `{{ card.<campo> }}` permanece literal.
   - Se `entao.tipo == email`, use `create_send_task_automation` apontando para o template criado (parâmetros típicos: pipe_id, name, event/phase, email_template_id, destinatário).
   - Outros tipos (`move_card`, `update_field`, `add_label`, etc) → use `create_automation` com o `action_type` retornado por `get_automation_actions`.
8. **Para cada AI Agent:**
   - `get_pipe(pipe_id)` → pegue `pipe.uuid` como `repo_uuid`
   - `get_automation_events(pipe_id)` / `get_automation_actions(pipe_id)` — reaproveite os caches do passo 7 se já feitos.
   - `create_ai_agent(name, instruction, repo_uuid, behaviors)`
9. **pipe_relation:** se a variável `pipe_suporte_id` (ou equivalente) estiver vazia, PULE.
10. **Mantenha mapa de IDs lógicos → IDs reais** (labels, fases, campos, email_templates, automações) e referencie nas chamadas seguintes.
11. **Após cada tool call bem-sucedida**, uma linha curta de status (ex: `✓ Email template "alerta-sla" criado — id 12345`).
12. **Sequencial, sem paralelismo** — todas as etapas têm dependências (labels antes de automações com `add_label`; field_conditions depois de fields; email_templates antes de automações).
13. **Falhou? Pare e reporte** com o erro completo. Não tente consertar.

### 7. Relatório final

- `pipe_id`
- URL: `https://app.pipefy.com/pipes/<pipe_id>`
- Contagem: labels, fases, campos, condições de campo, email templates, automações, AI agents criados
- Avisos / partes puladas

## Regras

- Nada no Pipefy antes da aprovação do passo 5.
- IDs reais retornados pelas tools, nunca inventados.
- Se o usuário interromper, informe o que **já foi criado** para ele decidir continuar/limpar.
- A skill só interage com o Pipefy via MCP — não toca no repo local.

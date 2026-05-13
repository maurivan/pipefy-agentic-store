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

- Se o comando falhar (exit != 0) ou a saída **não** contiver `✓ Connected`, o MCP não está pronto. Avise o usuário em uma frase:

  > O MCP Pipefy não está instalado/conectado. Vou rodar a skill `install-pipefy-mcp` primeiro.

  E então **invoque a skill `install-pipefy-mcp`** via `Skill` tool (sem perguntar antes — é dependência dura). Quando ela terminar, lembre o usuário de **reiniciar o Claude Code** se as tools `mcp__pipefy__*` ainda não estiverem disponíveis nesta sessão, e **pare** este fluxo aqui (ele vai reinvocar `/agentic-store` depois do restart).

- Se a saída contiver `✓ Connected`, siga para o passo 1 sem dizer nada.

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

Detecte placeholders:

```bash
grep -oE '\{\{ *[a-zA-Z_][a-zA-Z0-9_]* *\}\}' "$TEMPLATE_TMP" | sort -u
```

Numa **única mensagem**, liste todas as variáveis numeradas e peça os valores ao usuário. Não invente defaults rígidos — use o frontmatter ou pergunte direto. Variáveis vazias viram `""`.

Quando o usuário responder, **substitua todas as `{{ variavel }}` no conteúdo** antes de qualquer chamada ao MCP.

### 5. Plano em 5 linhas + aprovação

Mostre exatamente 5 linhas:

1. `Vou clonar "<nome>" (<fases_count> fases, <campos_count> campos)`
2. Total estimado de tool calls
3. Ordem: pipe → fases → campos por fase → AI agents → pipe_relation (se aplicável)
4. Variáveis aplicadas (resumo curto)
5. Avisos / passos que serão pulados

**Espere `pode executar`** (ou sim/ok/vai). Não execute nada antes da aprovação. Se pedir mudanças, ajuste e mostre de novo.

### 6. Executar clonagem

1. **Criar o pipe** com `preferences.aiAgentsEnabled = true`. Guarde `pipe_id`.
2. **Criar fases** na ordem definida pelo campo `ordem`. Guarde cada `phase_id`.
3. **Para cada fase, criar TODOS os campos antes de avançar pra próxima.**
4. **Para cada AI Agent:**
   - `get_pipe(pipe_id)` → pegue `pipe.uuid` como `repo_uuid`
   - `get_automation_events(pipe_id)` → valide `event_ids`
   - `get_automation_actions(pipe_id)` → valide `action_types`
   - `create_ai_agent(name, instruction, repo_uuid, behaviors)`
5. **pipe_relation:** se a variável `pipe_suporte_id` (ou equivalente) estiver vazia, PULE.
6. **Mantenha mapa de IDs lógicos → IDs reais** (ex: `contrato-assinado` → `308452691`) e referencie nas chamadas seguintes.
7. **Após cada tool call bem-sucedida**, uma linha curta de status (ex: `✓ Fase "Pré-kickoff" criada — id 308452691`).
8. **Sequencial, sem paralelismo** — fases/campos/agents têm dependências entre si.
9. **Falhou? Pare e reporte** com o erro completo. Não tente consertar.

### 7. Relatório final

- `pipe_id`
- URL: `https://app.pipefy.com/pipes/<pipe_id>`
- Contagem: fases, campos, AI agents criados
- Avisos / partes puladas

## Regras

- Nada no Pipefy antes da aprovação do passo 5.
- IDs reais retornados pelas tools, nunca inventados.
- Se o usuário interromper, informe o que **já foi criado** para ele decidir continuar/limpar.
- A skill só interage com o Pipefy via MCP — não toca no repo local.

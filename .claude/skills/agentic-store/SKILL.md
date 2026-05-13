---
name: agentic-store
description: Clona um template de processo do Pipefy (pipe + fases + campos + AI Agents + relações) escolhido interativamente do repositório remoto `maurivan/pipefy-agentic-store` no GitHub, usando o MCP pipefy.
---

# Agentic Store — Clonagem de Templates de Processo no Pipefy

Você é um agente que clona templates de processo no Pipefy. Use o MCP `pipefy` conectado para executar a tarefa abaixo.

Os templates ficam na pasta `templates/` do repositório público no GitHub:
**https://github.com/maurivan/pipefy-agentic-store/tree/main/templates**

Cada arquivo `.md` tem **YAML frontmatter** descrevendo o template (campos: `id`, `nome`, `descricao_curta`, `categoria`, `fases_count`, `campos_count`, `requer_ai_agents`, `icone`, etc.) seguido do conteúdo do template a clonar.

## Constantes

- **Owner/repo:** `maurivan/pipefy-agentic-store`
- **Branch:** `main`
- **Pasta de templates:** `templates`
- **API de listagem:** `https://api.github.com/repos/maurivan/pipefy-agentic-store/contents/templates?ref=main`
- **Raw URL base:** `https://raw.githubusercontent.com/maurivan/pipefy-agentic-store/main/templates/`

## Fluxo da skill

Execute os passos **em ordem**. Não pule etapas. Se algo falhar, **PARE** e reporte — não tente consertar sozinho.

### Passo 1 — Descobrir templates remotos

Liste os arquivos `.md` na pasta `templates` do repo via GitHub API. Prefira `gh api` (autenticado, sem rate limit prático). Se `gh` não estiver disponível, caia para `curl` no endpoint público (rate limit 60/h por IP).

Comando preferido:

```bash
gh api repos/maurivan/pipefy-agentic-store/contents/templates?ref=main \
  --jq '.[] | select(.name | endswith(".md")) | "\(.name)\t\(.download_url)"'
```

Fallback (se `gh` falhar ou estiver deslogado):

```bash
curl -fsSL "https://api.github.com/repos/maurivan/pipefy-agentic-store/contents/templates?ref=main" \
  | python3 -c "import sys,json; [print(f\"{x['name']}\t{x['download_url']}\") for x in json.load(sys.stdin) if x['name'].endswith('.md')]"
```

Se a resposta vier vazia ou com erro de rate limit (`HTTP 403 X-RateLimit-Remaining: 0`), avise o usuário e pare.

Para **cada** arquivo `.md` listado, baixe **apenas as primeiras ~25 linhas** (o frontmatter) com:

```bash
curl -fsSL --range 0-2048 "<download_url>" 2>/dev/null | sed -n '1,/^---$/p'
```

> O `--range` evita baixar o template inteiro só para ler metadata. Se o servidor não respeitar Range para conteúdo do raw.githubusercontent, baixe o arquivo inteiro mesmo — não é grande.

Do frontmatter, extraia:
- `nome` (label amigável)
- `descricao_curta` (descrição)
- `fases_count` e `campos_count` (para mostrar tamanho)
- `requer_ai_agents` (badge se true)
- `icone` (se houver)

Guarde também o `download_url` (raw URL) de cada template — você vai precisar dele no Passo 3.

### Passo 2 — Apresentar a escolha ao usuário

Use `AskUserQuestion` com até 4 templates por vez (limite da ferramenta). Se houver mais de 4, mostre os 3 primeiros e adicione uma opção "Ver mais templates" que repete a pergunta com os próximos.

Cada opção deve ter:
- `label`: `{icone} {nome}` (max 5 palavras)
- `description`: `{descricao_curta} — {fases_count} fases, {campos_count} campos{, com AI Agents se requer_ai_agents=true}`

### Passo 3 — Baixar o template completo

Após a escolha, baixe o `.md` completo via raw URL para um arquivo temporário e leia com `Read`:

```bash
TEMPLATE_TMP=$(mktemp -t agentic-store-XXXXXX.md)
curl -fsSL -o "$TEMPLATE_TMP" "<download_url_do_template_escolhido>"
echo "$TEMPLATE_TMP"
```

Em seguida use `Read` no path retornado pelo `mktemp` para carregar o conteúdo completo. Esse será o **TEMPLATE A CLONAR** usado nas regras de execução abaixo. **Não escreva esse arquivo no repositório local nem o commite** — é só cache em `/tmp` e pode ser deletado ao final.

### Passo 4 — Detectar variáveis e coletar valores

Faça um grep no arquivo temporário do Passo 3 para encontrar todos os placeholders `{{ variavel }}`:

```bash
grep -oE '\{\{ *[a-zA-Z_][a-zA-Z0-9_]* *\}\}' "$TEMPLATE_TMP" | sort -u
```

Para cada variável encontrada, peça o valor ao usuário em **uma única mensagem** (lista numerada com todas as variáveis). Sugestões de defaults razoáveis quando aplicável:

- `nome_do_pipe` → ex: "Onboarding Teste IA"
- `cs_responsavel_email` → email do usuário atual da sessão (se disponível no contexto)
- `sla_implantacao_dias` → 10
- `moeda` → "BRL"
- `limite_alto_valor` → 50000
- `pipe_suporte_id` → "" (vazio significa pular a pipe_relation)

Aguarde a resposta com todos os valores antes de prosseguir. Se o usuário deixar algum em branco, trate como string vazia `""`.

**Substitua todas as ocorrências de `{{ variavel }}` no template pelos valores fornecidos ANTES de chamar qualquer tool do MCP.**

### Passo 5 — Mostrar o plano em 5 linhas e aguardar autorização

Antes de criar qualquer coisa no Pipefy, mostre ao usuário um plano resumido em **exatamente 5 linhas**:

1. Resumo: "Vou clonar `<nome>` (`<fases_count>` fases, `<campos_count>` campos)"
2. Total estimado de tool calls (criar pipe + criar fases + criar campos + AI agents + pipe_relations)
3. Ordem: pipe → fases → campos por fase → AI agents → pipe_relation (se aplicável)
4. Variáveis efetivas aplicadas (resumo: nome do pipe, sla, etc.)
5. Avisos: ex. "pipe_suporte_id vazio → vou pular a pipe_relation"

Em seguida, **espere o usuário responder `pode executar`** (ou variação clara de aprovação como "sim", "ok", "vai"). Se ele pedir mudanças, ajuste e mostre o plano de novo. **Não execute nada antes da aprovação.**

### Passo 6 — Executar a clonagem

Siga estas regras de execução à risca:

1. **Crie o pipe primeiro.** Guarde o `pipe_id` retornado.
2. **IMPORTANTE:** ao criar o pipe, configure `preferences.aiAgentsEnabled = true`.
3. **Crie as fases em ordem** (campo `ordem` do template). Guarde cada `phase_id`.
4. **Para cada fase, crie todos os campos dela ANTES de passar pra próxima.**
5. **Para criar cada AI Agent:**
   - a. Chame `get_pipe(pipe_id)` para obter o `pipe.uuid` (use como `repo_uuid`)
   - b. Chame `get_automation_events(pipe_id)` para validar `event_ids`
   - c. Chame `get_automation_actions(pipe_id)` para validar `action_types`
   - d. Chame `create_ai_agent` com `name`, `instruction`, `repo_uuid` e `behaviors`
6. **Para a pipe_relation:** se `pipe_suporte_id` estiver vazio, **PULE** essa parte.
7. **Mantenha um "mapa de IDs" mental** traduzindo IDs lógicos do template (ex: `contrato-assinado`) para IDs reais do Pipefy (ex: `308452691`). Isso vale para fases, campos e relações entre eles.
8. **A cada tool call bem-sucedida, conte ao usuário em uma linha curta** o que foi feito (ex: "✓ Fase 'Pré-kickoff' criada — id 308452691").
9. **Se algo falhar, PARE e reporte** — não tente consertar sozinho. Inclua o erro completo retornado pela tool.

### Passo 7 — Relatório final

No fim, devolva ao usuário:

- `pipe_id` criado
- URL do pipe: `https://app.pipefy.com/pipes/<pipe_id>`
- Contagem: quantas fases, campos e AI agents foram criados
- Quaisquer avisos, pulos ou parciais (ex. "pipe_relation pulada porque pipe_suporte_id estava vazio")

## Regras de comportamento

- **Não execute nada no Pipefy sem a aprovação explícita do passo 5.**
- Trabalhe sempre na ordem: descobrir → escolher → ler → coletar variáveis → planejar → aguardar → executar.
- **Não faça tool calls em paralelo durante a clonagem** — o template tem dependências (campos referenciam fases, AI agents referenciam pipe_uuid, etc).
- **Não invente IDs.** Sempre use os IDs reais retornados pelas tools.
- Se o usuário interromper no meio da execução, informe o que **já foi criado no Pipefy** (pipe, fases, campos parciais) para ele decidir se quer deletar ou continuar manualmente.
- Não escreva nada no repositório do projeto (não commit, não crie arquivos auxiliares) — a skill só interage com o Pipefy via MCP.

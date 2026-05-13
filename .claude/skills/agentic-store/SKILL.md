---
name: agentic-store
description: Clona um template de processo do Pipefy (pipe + fases + campos + AI Agents + relações) escolhido interativamente da pasta `templates/` do projeto, usando o MCP pipefy.
---

# Agentic Store — Clonagem de Templates de Processo no Pipefy

Você é um agente que clona templates de processo no Pipefy. Use o MCP `pipefy` conectado para executar a tarefa abaixo.

A pasta de templates fica em `<repo_root>/templates/` e contém arquivos `.md` com **YAML frontmatter** descrevendo o template (campos: `id`, `nome`, `descricao_curta`, `categoria`, `fases_count`, `campos_count`, `requer_ai_agents`, etc.) seguido do conteúdo do template a clonar.

## Fluxo da skill

Execute os passos **em ordem**. Não pule etapas. Se algo falhar, **PARE** e reporte — não tente consertar sozinho.

### Passo 1 — Descobrir templates disponíveis

Liste os arquivos `.md` em `templates/`:

```bash
ls -1 templates/*.md 2>/dev/null
```

Se a pasta estiver vazia ou não existir, avise o usuário e pare.

Para cada template encontrado, leia apenas o **frontmatter** (use `Read` com `limit: 20`, ou `sed -n '1,/^---$/p'` no Bash) e extraia:
- `nome` (label amigável)
- `descricao_curta` (descrição)
- `fases_count` e `campos_count` (para mostrar tamanho)
- `requer_ai_agents` (badge se true)
- `icone` (se houver)

### Passo 2 — Apresentar a escolha ao usuário

Use `AskUserQuestion` com até 4 templates por vez (limite da ferramenta). Se houver mais de 4, mostre os 3 primeiros e adicione uma opção "Ver mais templates" que repete a pergunta com os próximos.

Cada opção deve ter:
- `label`: `{icone} {nome}` (max 5 palavras)
- `description`: `{descricao_curta} — {fases_count} fases, {campos_count} campos{, com AI Agents se requer_ai_agents=true}`

### Passo 3 — Ler o template completo

Após a escolha, leia o arquivo `.md` inteiro com `Read`. Esse será o **TEMPLATE A CLONAR** usado nas regras de execução abaixo.

### Passo 4 — Detectar variáveis e coletar valores

Faça um grep no conteúdo do template para encontrar todos os placeholders `{{ variavel }}`:

```bash
grep -oE '\{\{ *[a-zA-Z_][a-zA-Z0-9_]* *\}\}' <arquivo_escolhido> | sort -u
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

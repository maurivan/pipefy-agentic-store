---
id: smoke-all-triggers
nome: "Smoke Test — Todos os Triggers"
categoria: outros
versao: 1.0.0
schema_version: 1
descricao_curta: Template diagnóstico que exercita os 10 trigger types da API Pipefy. Use para detectar drift entre `mcp-coverage.md` e o catálogo real da API Pipefy. NÃO É um template de produção — não publicar em `templates/`.
autor: maurivan
tags: [smoke-test, dev, diagnostic, triggers, ia]
icone: "🧪"
tempo_estimado_criacao: "~90 segundos"
requer_ai_agents: true
---

# Smoke Test — Todos os Triggers

## 📖 Sobre este template

Template **diagnóstico** que exercita os 10 trigger types disponíveis no Pipefy num único pipe. Não é um processo real — é instrumento de teste.

**Quando usar:**
- Após atualização documentada do Pipefy
- Quando suspeitar que `mcp-coverage.md` ou a tabela `eventParams` do `agentic-store/SKILL.md` está desatualizada
- Antes de release de mudança grande na skill

**Como usar:**
1. Salve este `.md` em `templates/` temporariamente (ou aponte o `/agentic-store` pra ele via caminho local)
2. Rode `/agentic-store` selecionando este template
3. Se a criação completa **sem erro**, todos os 10 triggers + eventParams estão corretos
4. Se falhar em algum behavior, anote qual trigger + qual `eventParams.<chave>` rejeitou e atualize a tabela canônica

**NÃO publicar em `templates/`** — está em `.claude/skills/agentic-store/test/` justamente pra não aparecer no catálogo Vite nem na listagem do `/agentic-store`.

## ⚙️ Variáveis de criação

```yaml
variaveis:
  - nome: nome_do_pipe
    label: "Nome do pipe"
    tipo: string
    default: "Smoke Test — Triggers"
    obrigatorio: true
```

## 🏗️ Estrutura do Pipe

```yaml
pipe:
  nome: "{{ nome_do_pipe }}"
  descricao: "Pipe diagnóstico para validar API Pipefy. Não usar em produção."
  preferencias:
    icone: "🧪"
    aiAgentsEnabled: true

  fases:
    - id: entrada
      nome: "Entrada"
      ordem: 1
      done: false
      sla_dias: 1
      descricao: "Start form (auto-mapeado para startFormPhaseId)."
      campos:
        - id: titulo
          label: "Título"
          tipo: short_text
          obrigatorio: true
        - id: numero
          label: "Número de teste"
          tipo: number
        - id: categoria
          label: "Categoria"
          tipo: select
          opcoes: [A, B, C]

    - id: meio
      nome: "Meio"
      ordem: 2
      done: false
      sla_dias: 2
      descricao: "Fase intermediária para testar card_moved e card_left_phase."
      campos:
        - id: nota
          label: "Nota"
          tipo: long_text

    - id: fim
      nome: "Fim"
      ordem: 3
      done: true
      descricao: "Fase done."
      campos:
        - id: resultado
          label: "Resultado"
          tipo: short_text
```

## 🔔 Automações

```yaml
automacoes:
  - id: scheduler-test
    nome: "Test scheduler trigger"
    quando:
      evento: scheduler
    entao:
      tipo: update_card_field
      campo: nota
      valor: "Disparado por scheduler"

  - id: manual-test
    nome: "Test manually_triggered trigger"
    quando:
      evento: manually_triggered
    entao:
      tipo: move_single_card
      fase_destino: meio
```

## 🧠 AI Agents

```yaml
ai_agents:
  - id: agent-todos-triggers
    nome: "Agent Smoke Test"
    instruction: |
      Agent diagnóstico. Cada behavior testa 1 trigger com 1 ação mínima.
      Nunca processado em produção.

    behaviors:
      - nome: "T1 — card_created"
        trigger: card_created
        evento_params:
          em_fase: entrada               # → inPhaseId (camelCase)
        prompt: "Marcar como processado."
        acoes:
          - tipo: update_card
            campos:
              - id: nota
                modo: fill_with_ai

      - nome: "T2 — card_moved"
        trigger: card_moved
        evento_params:
          para_fase: meio                # → to_phase_id (snake)
        prompt: "Card chegou em Meio."
        acoes:
          - tipo: update_card
            campos:
              - id: nota
                modo: fill_with_ai

      - nome: "T3 — card_left_phase"
        trigger: card_left_phase
        evento_params:
          da_fase: meio                  # → fromPhaseId (camelCase)
        prompt: "Card saiu de Meio."
        acoes:
          - tipo: update_card
            campos:
              - id: resultado
                modo: fill_with_ai

      - nome: "T4 — field_updated"
        trigger: field_updated
        evento_params:
          campos: [numero]               # → triggerFieldIds (camelCase, internal_id)
        prompt: "Número atualizado."
        acoes:
          - tipo: update_card
            campos:
              - id: nota
                modo: fill_with_ai

      - nome: "T5 — sla_based"
        trigger: sla_based
        evento_params:
          tipo_sla: Expired              # → kindOfSla (camelCase)
        prompt: "SLA estourou."
        acoes:
          - tipo: update_card
            campos:
              - id: nota
                modo: fill_with_ai
```

## 📌 Pós-criação

Se a criação chegar até o final sem erro, os 10 triggers + 5 eventParams testados (`inPhaseId`, `to_phase_id`, `fromPhaseId`, `triggerFieldIds`, `kindOfSla`) estão funcionais.

**Triggers não testados aqui** (limite de 5 behaviors por agent): `card_inbox_received_email`, `all_children_in_phase`, `http_response_received`. Os 2 primeiros usam o mesmo mapeamento de fase (`inPhaseId` / `to_phase_id` respectivamente — já validados nos behaviors T1 e T2). O `http_response_received` precisa de outra automação encadeada — fora do escopo do smoke test.

Se algum behavior falhar, capture o erro completo (`"Field is not defined on AutomationEventParamsInput"` ou similar) e atualize:
1. `template-creator/reference/mcp-coverage.md` — tabela canônica
2. `agentic-store/SKILL.md` — passo 8 inline table

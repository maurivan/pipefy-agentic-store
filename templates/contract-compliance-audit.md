---
id: contract-compliance-audit
nome: "Contract Compliance Audit"
descricao_curta: "Auditoria periódica de cumprimento contratual com agente IA que classifica evidências em 4 estados"
categoria: juridico
versao: 1.0.0
schema_version: 1
autor: pipefy-template-store
tags: [juridico, compliance, auditoria, contratos, evidencias]
icone: "🔍"
tempo_estimado_criacao: "~40 segundos"
fases_count: 5
campos_count: 17
requer_ai_agents: true
requer_database_tables: false
---

# Contract Compliance Audit

## 📖 Sobre este template

Processo recorrente de auditoria de cumprimento contratual. Para cada contrato
auditado, um auditor coleta evidências (logs, relatórios, processos), e o
agente IA compara cláusula a cláusula contra a evidência apresentada,
classificando em **4 estados**: COMPLIANT, PARCIAL, NON_COMPLIANT,
INCONCLUSIVE. Score consolidado permite triagem rápida.

**Nota de design**: compliance é Process-heavy MAS o anatomy mostra que
**prompts curtos vencem em compliance** (alive median 90 palavras vs dying 129).
Por isso o prompt do agente é deliberadamente enxuto.

**Indicado para:** áreas jurídicas com auditorias anuais ou semestrais,
empresas reguladas (financeiro, saúde, governo), compliance officer com
portfólio de contratos críticos.

## 🎯 Resultados esperados

- Auditoria sistemática (não ad-hoc) com periodicidade controlada
- Compliance score por contrato → permite priorização objetiva
- Evidências centralizadas e ligadas à cláusula auditada
- Plano de ação derivado das não-conformidades, com follow-up obrigatório
- Alerta automático quando score cai abaixo do threshold

## ⚙️ Variáveis de criação

```yaml
variaveis:
  - nome: nome_do_pipe
    label: "Nome do pipe"
    tipo: string
    default: "Contract Compliance Audit"
    obrigatorio: true

  - nome: contratos_pipe_id
    label: "ID do pipe de Contratos"
    tipo: string
    obrigatorio: true
    descricao: "Pipe de revisão/gestão de contratos (ex: contract-review-clauses)"

  - nome: score_alerta_p0
    label: "Score abaixo do qual o caso é P0 (notificação imediata)"
    tipo: number
    default: 60
    obrigatorio: true

  - nome: email_diretoria
    label: "Email para escalation P0"
    tipo: email
    obrigatorio: true
```

## 🏗️ Estrutura do Pipe

```yaml
pipe:
  nome: "{{ nome_do_pipe }}"
  descricao: "Auditoria periódica de cumprimento contratual com classificação de evidências por IA"
  publico: false
  preferencias:
    icone: "🔍"
    aiAgentsEnabled: true

  fases:
    - id: auditoria-criada
      nome: "Auditoria criada"
      descricao: "Card aberto pelo scheduler ou pelo trigger de 'Próxima auditoria' do pipe de Contratos"
      ordem: 1
      campos:
        - id: contrato-auditado
          label: "Contrato auditado"
          tipo: connector
          conector_pipe: "{{ contratos_pipe_id }}"
          obrigatorio: true
        - id: auditor
          label: "Auditor responsável"
          tipo: assignee_select
          obrigatorio: true
        - id: periodo-auditoria-inicio
          label: "Período da auditoria — início"
          tipo: date
          obrigatorio: true
        - id: periodo-auditoria-fim
          label: "Período da auditoria — fim"
          tipo: date
          obrigatorio: true
        - id: escopo
          label: "Escopo da auditoria"
          tipo: long_text
          obrigatorio: true

    - id: coleta-evidencia
      nome: "Coleta de evidência"
      descricao: "Auditor faz upload das evidências; agente roda ao mover para Análise"
      ordem: 2
      sla_dias: 10
      campos:
        - id: clausula-auditada
          label: "Cláusula auditada (texto integral)"
          tipo: long_text
          obrigatorio: true
        - id: evidencias
          label: "Evidências (relatórios, logs, processos)"
          tipo: attachment
          obrigatorio: true
        - id: output-agente
          label: "Output do agente (estruturado)"
          tipo: long_text

    - id: analise-gap
      nome: "Análise de gap"
      descricao: "Score, cláusulas em risco e recomendações"
      ordem: 3
      campos:
        - id: classificacao
          label: "Classificação da cláusula"
          tipo: select
          opcoes: ["COMPLIANT", "PARCIAL", "NON_COMPLIANT", "INCONCLUSIVE"]
        - id: clausulas-em-risco
          label: "Cláusulas em risco"
          tipo: long_text
        - id: compliance-score
          label: "Compliance score (0-100)"
          tipo: number
          minimo: 0
          maximo: 100
        - id: recomendacoes
          label: "Recomendações"
          tipo: long_text

    - id: plano-de-acao
      nome: "Plano de ação"
      descricao: "Definir ações corretivas, responsáveis e prazos"
      ordem: 4
      sla_dias: 7
      campos:
        - id: acoes
          label: "Ações corretivas"
          tipo: long_text
          obrigatorio: true
        - id: responsavel-acao
          label: "Responsável principal"
          tipo: assignee_select
          obrigatorio: true
        - id: prazo-acao
          label: "Prazo da ação"
          tipo: date
          obrigatorio: true

    - id: follow-up
      nome: "Follow-up"
      descricao: "Verificação de implementação"
      ordem: 5
      done: true
      campos:
        - id: status-implementacao
          label: "Status de implementação"
          tipo: radio_vertical
          opcoes: ["Implementado", "Parcialmente implementado", "Não implementado"]
          obrigatorio: true
        - id: data-verificacao
          label: "Data da verificação"
          tipo: date
          obrigatorio: true
```

## 🔔 Automações

```yaml
automacoes:
  - id: flag-p0-score-baixo
    nome: "Flag P0 quando score cai abaixo do limite"
    quando:
      evento: campo_atualizado
      campo: compliance-score
    entao:
      tipo: enviar_webhook
      webhook_id: alerta-p0-compliance

  - id: avancar-apos-coleta
    nome: "Mover para Análise quando evidências forem anexadas"
    quando:
      evento: campo_atualizado
      campo: evidencias
    entao:
      tipo: mover_card
      fase_destino: analise-gap
```

## 🧠 AI Agents

```yaml
ai_agents:
  - id: agente-compliance-clausula
    nome: "Comparação contrato vs prática"
    instruction: |
      Você verifica se uma evidência cumpre uma cláusula contratual. Use as 4
      classificações canônicas (COMPLIANT, PARCIAL, NON_COMPLIANT, INCONCLUSIVE)
      e justifique em UMA frase. Prompt curto vence em compliance.
    behaviors:
      - nome: "Classificar cumprimento da cláusula"
        trigger: card_moved
        evento_params:
          para_fase: analise-gap
        prompt: |
          Você verifica se uma evidência (relatório, log, processo) cumpre uma
          cláusula contratual.

          ENTRADA:
          - Cláusula auditada: {{ clausula-auditada }}
          - Evidências: {{ evidencias }}

          TAREFA:
          1. Identifique a obrigação da cláusula (o "deve").
          2. Verifique nas evidências se há prova clara de cumprimento.
          3. Classifique:
             - COMPLIANT: evidência clara de cumprimento.
             - PARCIAL: cumprimento parcial documentado.
             - NON_COMPLIANT: ausência de evidência ou evidência contrária.
             - INCONCLUSIVE: evidências insuficientes pra julgar.

          Saída: status + 1 frase justificando.
        acoes:
          - nome: "Preencher classificação e score"
            tipo: update_card
            campos:
              - id: classificacao
                modo: fill_with_ai
              - id: compliance-score
                modo: fill_with_ai
              - id: output-agente
                modo: fill_with_ai
```

## 🔗 Pipe Relations

```yaml
pipe_relations:
  - id: rel-contrato-auditado
    nome: "Contrato auditado"
    pipe_filho_externo: "{{ contratos_pipe_id }}"
    cardinalidade: one_to_one
    auto_fill: false
    nome_no_filho: "Auditoria de compliance aberta"
    descricao: "Liga a auditoria ao contrato original (cláusulas, partes, valor)."
```

## 🪝 Webhooks

```yaml
webhooks:
  - id: alerta-p0-compliance
    nome: "Alerta P0 — compliance score abaixo do limite"
    url: "{{ webhook_diretoria_url }}"
    eventos:
      - card.field_update
    metodo: POST
    headers:
      Authorization: "Bearer {{ webhook_diretoria_token }}"
    payload_extra:
      template_id: "contract-compliance-audit"
      severity: "P0"
      threshold: "{{ score_alerta_p0 }}"
```

## 📌 Pós-criação

- **Configure scheduler externo** (cron, n8n) para criar cards anualmente OU configure no pipe de contratos um trigger no campo "Próxima auditoria".
- **Configure manualmente via UI** uma notificação ao auditor quando o card cair em `Coleta de evidência`.
- **URL do webhook de diretoria** (`{{ webhook_diretoria_url }}`) deve ser ajustada para Slack / Teams / sistema interno.
- **Ajuste o filtro do webhook P0** no Pipefy para disparar apenas quando `compliance-score < {{ score_alerta_p0 }}` (a condição numérica não é expressa nativamente em YAML — configure no editor de webhook).
- **Treine os auditores** para preencher o campo `Cláusula auditada` com o **texto integral** da cláusula — o agente depende disso.

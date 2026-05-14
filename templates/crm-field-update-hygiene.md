---
id: crm-field-update-hygiene
nome: "CRM Field Update / Data Hygiene"
descricao_curta: "Higiene de dados no CRM — normaliza valores via IA e atualiza o campo no CRM via HTTP"
categoria: comercial
versao: 1.0.0
schema_version: 1
autor: pipefy-template-store
tags: [comercial, vendas, crm, data-hygiene, normalizacao]
icone: "🧹"
tempo_estimado_clonagem: "~25 segundos"
fases_count: 3
campos_count: 10
requer_ai_agents: true
requer_database_tables: false
---

# CRM Field Update / Data Hygiene

## 📖 Sobre este template

Processo de higiene de dados no CRM. Origem: scheduler diário OU webhook do
CRM que detecta campos malformados. O agente IA normaliza o valor (phone para
+55 11 99999-9999, email lowercase, empresa em title case) e o sistema atualiza
o campo no CRM via HTTP. SLA: 24h.

**Cluster anatomy: Simple-action extremo.** Sales-ops Cluster B mostra
que **dying agents têm 44.4% mais schema**. Por isso o prompt do agente é
**1 linha**. Sem schema, sem fallback, sem exemplos. Validação determinística
(regex, comprimento) acontece DEPOIS do agente, na fase de Validação.

**Indicado para:** equipes com CRM (Salesforce, HubSpot, Pipedrive, etc.) e
problemas recorrentes de formatação inconsistente, deduplicação leve, padronização.

## 🎯 Resultados esperados

- Dados do CRM padronizados sem trabalho manual de SDR/operações
- SLA de 24h por correção, com trilha de auditoria por mudança
- Bloqueio explícito de updates inválidos antes de chegar no CRM
- Volume alto suportado — agente é leve, prompt mínimo

## ⚙️ Variáveis de clonagem

```yaml
variaveis:
  - nome: nome_do_pipe
    label: "Nome do pipe"
    tipo: string
    default: "CRM Field Update / Data Hygiene"
    obrigatorio: true

  - nome: crm_update_url
    label: "URL da API do CRM para atualização de campo"
    tipo: string
    obrigatorio: true

  - nome: crm_token
    label: "Token de autenticação do CRM (Bearer)"
    tipo: string
    obrigatorio: false

  - nome: sla_horas
    label: "SLA em horas"
    tipo: number
    default: 24
    obrigatorio: true
```

## 🏗️ Estrutura do Pipe

```yaml
pipe:
  nome: "{{ nome_do_pipe }}"
  descricao: "Higiene de dados no CRM — agente normaliza, sistema atualiza"
  publico: false
  preferencias:
    icone: "🧹"
    aiAgentsEnabled: true

  fases:
    - id: card-criado
      nome: "Card criado"
      descricao: "Origem: scheduler diário OU webhook do CRM"
      ordem: 1
      campos:
        - id: origem-trigger
          label: "Origem do trigger"
          tipo: radio_horizontal
          opcoes: ["Scheduler", "Webhook CRM", "Manual"]
          obrigatorio: true
        - id: campo-a-atualizar
          label: "Campo a atualizar"
          tipo: select
          opcoes: ["phone", "email", "empresa", "cargo", "endereco"]
          obrigatorio: true
        - id: valor-antigo
          label: "Valor antigo"
          tipo: short_text
        - id: valor-novo
          label: "Valor novo (cru, do CRM ou da fonte)"
          tipo: short_text
          obrigatorio: true
        - id: valor-normalizado
          label: "Valor normalizado (output do agente)"
          tipo: short_text
        - id: razao
          label: "Razão da atualização"
          tipo: short_text

    - id: validacao
      nome: "Validação"
      descricao: "Checagens determinísticas (regex, comprimento) pós-agente"
      ordem: 2
      sla_dias: 1
      campos:
        - id: validacao
          label: "Validação"
          tipo: radio_horizontal
          opcoes: ["OK", "Bloqueio"]
          obrigatorio: true
        - id: mensagem-validacao
          label: "Mensagem"
          tipo: long_text

    - id: aplicado
      nome: "Aplicado"
      descricao: "Atualização propagada ao CRM"
      ordem: 3
      done: true
      campos:
        - id: data-aplicacao
          label: "Data da aplicação"
          tipo: date
        - id: confirmacao-crm
          label: "Confirmação CRM"
          tipo: radio_horizontal
          opcoes: ["Sim", "Não"]
```

## 🔔 Automações

```yaml
automacoes:
  - id: aplicar-atualizacao-no-crm
    nome: "Atualizar campo no CRM quando validação for OK"
    quando:
      evento: campo_atualizado
      campo: validacao
    entao:
      tipo: enviar_webhook
      webhook_id: webhook-crm-update

  - id: avancar-quando-validado
    nome: "Mover para Aplicado quando confirmação chega"
    quando:
      evento: campo_atualizado
      campo: confirmacao-crm
    entao:
      tipo: mover_card
      fase_destino: aplicado
```

## 🧠 AI Agents

```yaml
ai_agents:
  - id: agente-hygiene-field
    nome: "Hygiene field update"
    instruction: |
      Normaliza um valor para o formato padrão do CRM. Retorna o valor normalizado, nada mais.
    behaviors:
      - nome: "Normalizar valor"
        trigger: card_created
        evento_params:
          em_fase: card-criado
        prompt: |
          Normalize {{ valor-novo }} para formato padrão CRM. Phone: +55 11 99999-9999. Email: lowercase. Empresa: title case. Retorne valor normalizado.
        acoes:
          - nome: "Preencher valor normalizado"
            tipo: update_card
            campos:
              - id: valor-normalizado
                modo: fill_with_ai
```

## 🪝 Webhooks

```yaml
webhooks:
  - id: webhook-crm-update
    nome: "Atualizar campo no CRM"
    url: "{{ crm_update_url }}"
    eventos:
      - card.field_update
    filtro:
      campo_igual:
        campo: validacao
        valor: "OK"
    metodo: POST
    headers:
      Authorization: "Bearer {{ crm_token }}"
    payload_extra:
      template_id: "crm-field-update-hygiene"
```

## 📌 Pós-clonagem

- **URL do CRM** (`{{ crm_update_url }}`) deve apontar para o endpoint real de atualização (Salesforce REST API, HubSpot, Pipedrive — o que estiver em uso).
- **Validação determinística** acontece na fase `Validação` — adicione regras pelo Pipefy (regex no campo, comprimento mínimo) OU integre com um validador externo via webhook. O agente NÃO valida — só normaliza.
- **Configure manualmente via UI** uma notificação ao time de operações quando `Bloqueio` for marcado em Validação.
- **Configure scheduler externo** (cron, n8n) OU webhook do CRM para alimentar cards na fase inicial. Não há trigger nativo no Pipefy para detecção de dados inconsistentes no CRM.
- **Mantenha o prompt minimalista** — Sales-ops Cluster B morre quando agente recebe schema. Se quiser estender, adicione novas linhas de regra (sem JSON, sem exemplos).

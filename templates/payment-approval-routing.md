---
id: payment-approval-routing
nome: Roteamento de Aprovação de Pagamentos
descricao_curta: Esteira de aprovação de pagamentos com IA roteando até 3 aprovadores por alçada (tipo + valor), DB externalizada e execução automática no banco/ERP.
categoria: financeiro
versao: 1.0.0
schema_version: 1
autor: pipefy-template-store
tags: [financeiro, aprovacao, pagamentos, alcada, ia, approval-routing]
icone: 💰
tempo_estimado_clonagem: "~60 segundos"
fases_count: 4
campos_count: 16
requer_ai_agents: true
requer_database_tables: true
---

# Roteamento de Aprovação de Pagamentos

## 📖 Sobre este template

Esteira de aprovação de pagamentos (fornecedor, reembolso, pró-labore, outros) com IA roteando até 3 aprovadores sequenciais com base em uma tabela de alçada externalizada (tipo × faixa de valor). Aprovações sequenciais isolam o risco; quando algum aprovador rejeita, o card vai direto para Rejeitado. Após todos aprovarem, dispara webhook ao banco/ERP para execução do pagamento.

**Indicado para:** áreas financeiras com matriz de alçada definida e volume médio-alto de pagamentos (200-3000/mês).
**Não indicado para:** empresas com aprovação única do CFO (use template simplificado) ou com matriz extremamente complexa (>10 níveis hierárquicos — exige modelagem dedicada).

## 🎯 Resultados esperados

- Roteamento automático de aprovadores em <30 segundos (vs. 1-2h em fluxo manual).
- DB de alçada externalizada: mudou regra? Atualiza tabela, não automação.
- Fallback `REVISAO_MANUAL` para valores fora da matriz — nunca aprova sozinho fora da régua.
- Rejeição por qualquer aprovador encerra o card imediatamente (não desperdiça tempo dos outros).
- Execução automática no banco/ERP após aprovação final — sem retipagem.

## ⚙️ Variáveis de clonagem

```yaml
variaveis:
  - nome: nome_do_pipe
    label: "Nome do pipe"
    tipo: string
    default: "Aprovação de Pagamentos"
    obrigatorio: true

  - nome: financeiro_email
    label: "Email do financeiro (alertas e revisão manual)"
    tipo: email
    obrigatorio: true

  - nome: limite_aprov_unica
    label: "Valor abaixo do qual apenas 1 aprovador é necessário (BRL)"
    tipo: number
    default: 5000
    obrigatorio: true

  - nome: webhook_banco_erp_url
    label: "URL do banco/ERP para execução do pagamento"
    tipo: string
    default: ""
    obrigatorio: false

  - nome: webhook_banco_erp_token
    label: "Token de autenticação do banco/ERP"
    tipo: string
    default: ""
    obrigatorio: false
```

## 🏗️ Estrutura do Pipe

```yaml
pipe:
  nome: "{{ nome_do_pipe }}"
  descricao: "Aprovação de pagamentos com roteamento IA por alçada (tipo + valor)"
  preferencias:
    icone: "💰"
    aiAgentsEnabled: true

  fases:
    - id: solicitacao-pagamento
      nome: "Solicitação Pagamento"
      descricao: "Solicitante preenche os dados do pagamento"
      ordem: 1
      done: false
      sla_dias: 1
      campos:
        - id: tipo
          label: "Tipo"
          tipo: radio_horizontal
          opcoes: [Fornecedor, Reembolso, "Pró-labore", Outro]
          obrigatorio: true
        - id: beneficiario
          label: "Beneficiário"
          tipo: short_text
          obrigatorio: true
        - id: valor
          label: "Valor (BRL)"
          tipo: currency
          obrigatorio: true
        - id: conta-bancaria
          label: "Conta bancária do beneficiário"
          tipo: short_text
          obrigatorio: true
        - id: cpf-cnpj
          label: "CPF/CNPJ do beneficiário"
          tipo: short_text
          obrigatorio: true
        - id: descricao
          label: "Descrição do pagamento"
          tipo: long_text

    - id: roteamento-aprovador
      nome: "Roteamento Aprovador"
      descricao: "IA define cadeia de aprovadores baseado em alçada"
      ordem: 2
      done: false
      sla_dias: 1
      campos:
        - id: aprovador-1
          label: "Aprovador 1"
          tipo: assignee_select
        - id: aprovador-2
          label: "Aprovador 2 (condicional)"
          tipo: assignee_select
        - id: aprovador-3
          label: "Aprovador 3 (condicional)"
          tipo: assignee_select

    - id: aprovacoes
      nome: "Aprovações"
      descricao: "Cada aprovador decide aprovar/rejeitar"
      ordem: 3
      done: false
      sla_dias: 3
      campos:
        - id: status-aprovador-1
          label: "Status aprovador 1"
          tipo: radio_horizontal
          opcoes: [Pendente, Aprovado, Rejeitado]
        - id: status-aprovador-2
          label: "Status aprovador 2"
          tipo: radio_horizontal
          opcoes: [Pendente, Aprovado, Rejeitado, "N/A"]
        - id: status-aprovador-3
          label: "Status aprovador 3"
          tipo: radio_horizontal
          opcoes: [Pendente, Aprovado, Rejeitado, "N/A"]

    - id: execucao-pagamento
      nome: "Execução Pagamento"
      descricao: "Pagamento executado no banco/ERP"
      ordem: 4
      done: true
      campos:
        - id: data-execucao
          label: "Data de execução"
          tipo: date
        - id: id-transacao
          label: "ID da transação no banco/ERP"
          tipo: short_text
        - id: comprovante
          label: "Comprovante de pagamento"
          tipo: attachment
        - id: motivo-rejeicao
          label: "Motivo da rejeição (se rejeitado)"
          tipo: long_text
```

## 🔔 Automações

```yaml
automacoes:
  - id: avancar-aprovacoes
    nome: "Mover para Aprovações após roteamento"
    quando:
      evento: campo_atualizado
      campo: aprovador-1
    entao:
      tipo: mover_card
      fase_destino: aprovacoes

  - id: fast-track-baixo-valor
    nome: "Auto-mover para Execução se Aprovador 1 aprovou e valor baixo"
    quando:
      evento: campo_atualizado
      campo: status-aprovador-1
    entao:
      tipo: mover_card
      fase_destino: execucao-pagamento

  - id: rejeitar-card
    nome: "Rejeitar card se qualquer aprovador rejeitou"
    quando:
      evento: campo_atualizado
      campo: status-aprovador-1
    entao:
      tipo: atualizar_campo
      campo: motivo-rejeicao
      valor: "Rejeitado pelo aprovador 1 — ver comentário"

  - id: executar-pagamento-banco
    nome: "Executar pagamento via banco/ERP quando todos aprovaram"
    quando:
      evento: card_movido_para_fase
      fase: execucao-pagamento
    entao:
      tipo: enviar_webhook
      webhook_id: executar-pagamento-banco
```

## 🧠 AI Agents

```yaml
ai_agents:
  - id: routing-alcada
    nome: "Routing por Alçada"
    instruction: |
      Você define a cadeia de aprovadores para um pagamento, baseado em valor
      e tipo, consultando a tabela de alçada externalizada. Use REVISAO_MANUAL
      como fallback sempre que valor cai fora da tabela. Nunca aprova sozinho
      fora da régua.

    behaviors:
      - nome: "Rotear aprovadores ao criar card em Solicitação"
        trigger: card_created
        evento_params:
          em_fase: solicitacao-pagamento
        prompt: |
          Você é um agente que define a cadeia de aprovadores para um pagamento, baseado em valor e tipo.

          ENTRADA:
          - Tipo: {{ Tipo }}
          - Valor: {{ Valor }}
          - Beneficiário: {{ Beneficiário }}
          - Tabela alçada: {{ Database alçadas (JSON via HTTP) }}

          TAREFA — popule até 3 aprovadores baseado na tabela:

          Tabela exemplo:
          | tipo | min | max | aprov_1 | aprov_2 | aprov_3 |
          |---|---|---|---|---|---|
          | Fornecedor | 0 | 5000 | gerente_compras | - | - |
          | Fornecedor | 5000 | 25000 | gerente_compras | diretor_financeiro | - |
          | Fornecedor | 25000 | 100000 | gerente_compras | diretor_financeiro | cfo |
          | Reembolso | 0 | 1000 | gestor_imediato | - | - |
          ...

          REGRAS:
          - Encontre a linha onde tipo == {{ Tipo }} e min < {{ Valor }} <= max.
          - Se não encontrar match → todos os 3 aprovadores = "REVISAO_MANUAL".
          - Se aprovador_2 ou aprovador_3 forem vazios na tabela → retorne null (campo no Pipefy não preenchido).

          FORMATO DE SAÍDA (JSON):
          {
            "aprovador_1": "user_id ou REVISAO_MANUAL",
            "aprovador_2": "user_id ou null",
            "aprovador_3": "user_id ou null"
          }

          EXEMPLO:
          Tipo: Fornecedor, Valor: 12000
          Saída: {"aprovador_1": "gerente_compras", "aprovador_2": "diretor_financeiro", "aprovador_3": null}

        acoes:
          - tipo: update_card
            campos:
              - id: aprovador-1
                modo: fill_with_ai
              - id: aprovador-2
                modo: fill_with_ai
              - id: aprovador-3
                modo: fill_with_ai
```

## 🗄️ Database Tables

```yaml
database_tables:
  - id: alcadas-aprovacao
    nome: "Alçadas de Aprovação"
    descricao: "Matriz de aprovadores por tipo de pagamento e faixa de valor. Editar aqui em vez de no prompt."
    colunas:
      - id: tipo
        label: "Tipo de pagamento"
        tipo: select
        opcoes: [Fornecedor, Reembolso, "Pró-labore", Outro]
        obrigatorio: true
      - id: min-valor
        label: "Valor mínimo (BRL)"
        tipo: number
        obrigatorio: true
      - id: max-valor
        label: "Valor máximo (BRL)"
        tipo: number
        obrigatorio: true
      - id: aprovador-1
        label: "Aprovador 1 (papel ou user_id)"
        tipo: short_text
        obrigatorio: true
      - id: aprovador-2
        label: "Aprovador 2 (opcional)"
        tipo: short_text
      - id: aprovador-3
        label: "Aprovador 3 (opcional)"
        tipo: short_text
      - id: observacoes
        label: "Observações"
        tipo: long_text
```

## 🪝 Webhooks

```yaml
webhooks:
  - id: executar-pagamento-banco
    nome: "Executar pagamento no banco/ERP"
    url: "{{ webhook_banco_erp_url }}"
    eventos:
      - card.move
    filtro:
      fase_destino: execucao-pagamento
    headers:
      Authorization: "Bearer {{ webhook_banco_erp_token }}"
      Content-Type: "application/json"
    payload_extra:
      operacao: "executar_pagamento"
      origem: "pipefy-payment-approval"
```

## 📌 Pós-clonagem

1. **Popular DB `alcadas-aprovacao`** — sem ela o agente devolve sempre `REVISAO_MANUAL`. Cadastre as faixas reais da sua empresa (tipicamente 4-12 linhas).
2. **Mapear papéis para user_ids reais** — substitua strings genéricas como `gerente_compras`, `cfo` pelos IDs reais dos usuários Pipefy. Considere manter uma view auxiliar com a tabela "papel → user_id" para o time de admin.
3. **Configurar fast-track** — para `Valor <= {{ limite_aprov_unica }}` e `status-aprovador-1 = Aprovado`, o card já vai direto para Execução. Para valores maiores, ajuste manualmente a regra de avanço sequencial entre aprovadores.
4. **Integração com banco/ERP** — a maioria dos bancos PJ tem API de pagamentos (Open Finance, APIs proprietárias). Configure URL/token e teste em sandbox.
5. **Notificações por email** — configure manualmente via UI:
   - Notificação ao aprovador 1, 2, 3 quando atribuído.
   - Notificação ao solicitante quando o card for rejeitado ou pago.
   - Alerta interno para `{{ financeiro_email }}` quando o agente retornar `REVISAO_MANUAL`.
6. **Aprovações sequenciais** — modelo padrão = aprovador 2 só recebe notificação após aprovador 1 aprovar. Para fluxo paralelo (todos ao mesmo tempo), ajuste as regras manualmente.
7. **Membros do pipe** — adicione todos os aprovadores nominais e o time financeiro (escrita em todas as fases).

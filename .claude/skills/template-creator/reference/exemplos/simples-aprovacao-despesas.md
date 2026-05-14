---
id: aprovacao-despesas
nome: Aprovação de Despesas Corporativas
descricao_curta: Fluxo de reembolso com alçadas por valor e SLA de 3 dias
categoria: financeiro
versao: 1.0.0
autor: pipefy-template-store
tags: [financeiro, aprovacao, despesas, reembolso]
icone: 💸
tempo_estimado_clonagem: "~25 segundos"
fases_count: 4
campos_count: 9
schema_version: 1
---

# Aprovação de Despesas Corporativas

## 📖 Sobre este template

Processo simples de reembolso de despesas: colaborador submete, gestor aprova
(ou rejeita), financeiro processa, pagamento confirmado. Alçada por valor:
até R$ 500 aprovação direta do gestor; acima disso, dupla aprovação.

**Indicado para:** PMEs, áreas com volume médio de reembolsos (10-100/mês).
**Não indicado para:** empresas com sistema dedicado (Concur, Expensify).

## 🎯 Resultados esperados

- Reduzir tempo de reembolso para até 5 dias úteis
- Eliminar emails perdidos sobre status de aprovação
- Trilha de auditoria automática

## ⚙️ Variáveis de clonagem

```yaml
variaveis:
  - nome: nome_do_pipe
    label: "Nome do pipe"
    tipo: string
    default: "Aprovação de Despesas"
    obrigatorio: true

  - nome: limite_aprovacao_simples
    label: "Valor limite para aprovação direta (sem dupla aprovação)"
    tipo: number
    default: 500
    obrigatorio: true

  - nome: email_financeiro
    label: "Email do financeiro"
    tipo: email
    obrigatorio: true

  - nome: moeda
    label: "Moeda"
    tipo: select
    opcoes: ["BRL", "USD"]
    default: "BRL"
```

## 🏗️ Estrutura do Pipe

```yaml
pipe:
  nome: "{{ nome_do_pipe }}"
  descricao: "Solicitações de reembolso de despesas corporativas"
  preferencias:
    icone: "💸"

  fases:
    - id: solicitacao
      nome: "Solicitação"
      descricao: "Colaborador submete a despesa"
      ordem: 1
      campos:
        - id: solicitante
          label: "Solicitante"
          tipo: assignee_select
          obrigatorio: true
        - id: descricao_despesa
          label: "Descrição da despesa"
          tipo: long_text
          obrigatorio: true
        - id: valor
          label: "Valor"
          tipo: currency
          moeda: "{{ moeda }}"
          obrigatorio: true
        - id: data_despesa
          label: "Data da despesa"
          tipo: date
          obrigatorio: true
        - id: comprovante
          label: "Comprovante (NF ou recibo)"
          tipo: attachment
          obrigatorio: true

    - id: aprovacao
      nome: "Aprovação"
      descricao: "Análise pelo gestor"
      ordem: 2
      sla_dias: 3
      campos:
        - id: aprovador
          label: "Aprovador"
          tipo: assignee_select
        - id: justificativa_rejeicao
          label: "Justificativa (se rejeitada)"
          tipo: long_text

    - id: processamento
      nome: "Processamento"
      descricao: "Financeiro processa o pagamento"
      ordem: 3
      sla_dias: 2
      campos:
        - id: data_pagamento_programada
          label: "Data programada de pagamento"
          tipo: date

    - id: paga
      nome: "Paga"
      descricao: "Reembolso efetuado"
      ordem: 4
      done: true
```

## 🔔 Automações

```yaml
automacoes:
  - id: notificar-aprovador
    nome: "Notificar aprovador ao entrar em Aprovação"
    quando:
      evento: card_movido_para_fase
      fase: aprovacao
    entao:
      tipo: email
      para: "{{ card.aprovador }}"
      template: nova-aprovacao-pendente

  - id: alerta-sla-aprovacao
    nome: "Alerta de SLA estourado em Aprovação"
    quando:
      evento: prazo_estourado
      fase: aprovacao
    entao:
      tipo: email
      para: "{{ email_financeiro }}"
      template: alerta-sla-aprovacao

  - id: notificar-solicitante-paga
    nome: "Notificar solicitante quando paga"
    quando:
      evento: card_movido_para_fase
      fase: paga
    entao:
      tipo: email
      para: "{{ card.solicitante }}"
      template: despesa-paga
```

## 📧 Email Templates

```yaml
email_templates:
  - id: nova-aprovacao-pendente
    nome: "Nova aprovação pendente"
    assunto: "Despesa aguardando sua aprovação: {{ card.descricao_despesa }}"
    corpo: |
      Olá,

      Uma despesa está aguardando sua aprovação:

      Solicitante: {{ card.solicitante }}
      Valor: {{ card.valor }}
      Data: {{ card.data_despesa }}

      Descrição: {{ card.descricao_despesa }}

      Acesse para aprovar: {{ card.url }}

      SLA: 3 dias úteis.
    de: "no-reply@suaempresa.com"

  - id: alerta-sla-aprovacao
    nome: "Alerta SLA aprovação"
    assunto: "⚠️ SLA estourado: aprovação de despesa parada há 3+ dias"
    corpo: |
      A despesa abaixo está parada na fase de aprovação além do SLA.

      Solicitante: {{ card.solicitante }}
      Aprovador atribuído: {{ card.aprovador }}
      Valor: {{ card.valor }}

      Acesse: {{ card.url }}
    de: "no-reply@suaempresa.com"

  - id: despesa-paga
    nome: "Despesa paga"
    assunto: "✅ Reembolso aprovado e pago: {{ card.descricao_despesa }}"
    corpo: |
      Sua despesa foi processada e o pagamento foi efetuado.

      Valor: {{ card.valor }}
      Data do pagamento: {{ card.data_pagamento_programada }}

      Obrigado.
    de: "no-reply@suaempresa.com"
```

## 📌 Pós-clonagem

- Configure manualmente a regra de **dupla aprovação** para despesas acima de `{{ limite_aprovacao_simples }}` — o template não automatiza isso porque depende da estrutura de gestão da sua empresa.
- Adicione os emails dos gestores como membros do pipe.
- Conecte ao seu sistema contábil via webhook se desejar (não incluído neste template).

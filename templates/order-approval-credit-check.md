---
id: order-approval-credit-check
nome: Aprovação de Pedido com Check de Crédito
descricao_curta: Aprovação de pedidos B2B com lookup de score/limite, validação de crédito por IA e roteamento condicional para sub-pipe de análise.
categoria: comercial
versao: 1.0.0
schema_version: 1
autor: pipefy-template-store
tags: [comercial, o2c, aprovacao, credito, validacao, ia]
icone: 🧮
tempo_estimado_clonagem: "~65 segundos"
fases_count: 5
campos_count: 17
requer_ai_agents: true
requer_database_tables: false
---

# Aprovação de Pedido com Check de Crédito

## 🧮 Sobre este template

Pipe de Order-to-Cash que orquestra a aprovação de pedidos B2B com checagem automática de crédito antes do faturamento. Quando um pedido entra, automações disparam lookup ao CRM/sistema de crédito para preencher score, limite disponível e status KYC do cliente. A IA aplica uma régua de validação determinística e classifica o pedido em uma de cinco categorias.

Pedidos que excedem o limite ou apresentam risco de inadimplência são automaticamente roteados para um sub-pipe de Análise de Crédito — não poluem o O2C principal. Pedidos OK seguem para aprovação humana com fast-track para clientes premium pagando à vista.

## 🎯 Resultados esperados

- O2C com governança automatizada — sem pedido faturado sem validar crédito.
- Exceções tratadas em sub-pipe dedicado, mantendo o fluxo principal enxuto.
- Fast-track explícito para pedidos seguros reduz fricção em clientes recorrentes.
- Output enum (5 categorias) elimina ambiguidade na decisão de aprovação.
- Auditoria completa: cada decisão fica registrada com timestamp e responsável.

## ⚙️ Variáveis de clonagem

```yaml
variaveis:
  - nome: nome_do_pipe
    label: "Nome do pipe"
    tipo: string
    default: "Aprovação de Pedidos"
    obrigatorio: true

  - nome: comercial_responsavel_email
    label: "Email do líder Comercial / O2C"
    tipo: email
    obrigatorio: true

  - nome: limite_auto_aprovacao
    label: "Valor abaixo do qual pedidos OK são auto-aprovados"
    tipo: number
    default: 5000
    obrigatorio: true

  - nome: score_credito_minimo
    label: "Score de crédito mínimo para fast-track"
    tipo: number
    default: 700
    obrigatorio: true

  - nome: moeda
    label: "Moeda dos pedidos"
    tipo: select
    opcoes: [BRL, USD, EUR]
    default: BRL
    obrigatorio: true

  - nome: pipe_analise_credito_id
    label: "ID do sub-pipe de Análise de Crédito"
    tipo: string
    obrigatorio: false

  - nome: webhook_crm_url
    label: "URL do CRM para lookup de score/limite/KYC do cliente"
    tipo: string
    placeholder: "https://crm.suaempresa/api/credit"
    obrigatorio: false

  - nome: webhook_crm_token
    label: "Token do CRM"
    tipo: string
    obrigatorio: false

  - nome: webhook_erp_url
    label: "URL do ERP para faturamento após aprovação"
    tipo: string
    placeholder: "https://erp.suaempresa/api/invoice"
    obrigatorio: false

  - nome: webhook_erp_token
    label: "Token do ERP"
    tipo: string
    obrigatorio: false
```

## 🏗️ Estrutura do Pipe

```yaml
pipe:
  nome: "{{ nome_do_pipe }}"
  descricao: "Aprovação de pedidos B2B com check de crédito automatizado"
  preferencias:
    icone: "🧮"
    aiAgentsEnabled: true

  fases:
    - id: pedido-recebido
      nome: "Pedido recebido"
      ordem: 1
      done: false
      sla_dias: 1
      descricao: "Pedido criado pelo time comercial ou via integração."
      campos:
        - id: cliente
          label: "Cliente"
          tipo: short_text
          obrigatorio: true
        - id: cnpj-cliente
          label: "CNPJ do cliente"
          tipo: cnpj
          obrigatorio: true
        - id: itens-pedido
          label: "Itens do pedido"
          tipo: long_text
          obrigatorio: true
        - id: valor-total
          label: "Valor total"
          tipo: currency
          moeda: "{{ moeda }}"
          obrigatorio: true
        - id: forma-pagamento
          label: "Forma de pagamento"
          tipo: radio_vertical
          opcoes: ["À vista", "Boleto 30 dias", "Boleto 60 dias", "Boleto 90 dias", "Cartão"]
          obrigatorio: true
        - id: prazo-entrega
          label: "Prazo de entrega solicitado"
          tipo: date

    - id: validacao-cliente
      nome: "Validação do cliente"
      ordem: 2
      done: false
      sla_dias: 1
      descricao: "Lookup de score, limite e KYC. IA classifica o pedido."
      campos:
        - id: status-kyc
          label: "Status KYC"
          tipo: select
          opcoes: [Ativo, Pendente, Reprovado, Não cadastrado]
        - id: score-credito
          label: "Score de crédito"
          tipo: number
        - id: limite-disponivel
          label: "Limite disponível"
          tipo: currency
          moeda: "{{ moeda }}"
        - id: validacao-status
          label: "Status da validação (IA)"
          tipo: select
          opcoes: [OK_FAST_TRACK, OK_ANALISE_PADRAO, EXCEDE_LIMITE, RISCO_INADIMPLENCIA, BLOQUEADO_KYC]
        - id: motivo-validacao
          label: "Motivo da validação"
          tipo: long_text

    - id: aprovacao
      nome: "Aprovação"
      ordem: 3
      done: false
      sla_dias: 2
      descricao: "Aprovação humana (pode ser auto-aprovado em fast-track)."
      campos:
        - id: aprovador
          label: "Aprovador"
          tipo: assignee_select
        - id: decisao
          label: "Decisão"
          tipo: radio_horizontal
          opcoes: [Aprovado, Rejeitado, Enviar para Análise de Crédito]
        - id: comentario-aprovador
          label: "Comentário do aprovador"
          tipo: long_text

    - id: faturamento
      nome: "Faturamento"
      ordem: 4
      done: false
      sla_dias: 2
      descricao: "ERP gera NF e atualiza o card."
      campos:
        - id: nf-emitida
          label: "NF emitida"
          tipo: attachment
        - id: data-faturamento
          label: "Data de faturamento"
          tipo: date

    - id: entrega
      nome: "Entrega"
      ordem: 5
      done: true
      descricao: "Entrega realizada — fluxo concluído."
      campos:
        - id: data-prevista
          label: "Data prevista de entrega"
          tipo: date
        - id: status-entrega
          label: "Status da entrega"
          tipo: radio_horizontal
          opcoes: [Em rota, Entregue, Atrasada]
```

## 🔔 Automações

```yaml
automacoes:
  - id: lookup-credito-cliente
    nome: "Lookup de crédito ao criar pedido"
    quando:
      evento: card_criado_em_fase
      fase: pedido-recebido
    entao:
      tipo: enviar_webhook
      webhook_id: crm-credit-lookup

  - id: auto-aprovacao-pequeno-valor
    nome: "Auto-aprovar pedidos OK abaixo do limite de auto-aprovação"
    quando:
      evento: campo_atualizado
      campo: validacao-status
    entao:
      tipo: atualizar_campo
      campo: decisao
      valor: "Aprovado"

  - id: rotear-analise-credito
    nome: "Rotear excedidos para sub-pipe de Análise"
    quando:
      evento: campo_atualizado
      campo: validacao-status
    entao:
      tipo: criar_card_conectado
      relation_id: rel-analise-credito
      campos:
        motivo: "{{ card.motivo-validacao }}"

  - id: disparar-faturamento-erp
    nome: "Disparar faturamento no ERP ao aprovar"
    quando:
      evento: campo_atualizado
      campo: decisao
    entao:
      tipo: enviar_webhook
      webhook_id: erp-faturamento
```

## 🧠 AI Agents

```yaml
ai_agents:
  - id: validador-pedido-credito
    nome: "Validador de Pedido e Crédito"
    instruction: |
      Você é um agente que valida se um pedido pode ser aprovado para faturamento.
      Combine valor do pedido, score de crédito, limite disponível, status KYC e
      forma de pagamento em uma das cinco categorias enum: OK_FAST_TRACK,
      OK_ANALISE_PADRAO, EXCEDE_LIMITE, RISCO_INADIMPLENCIA, BLOQUEADO_KYC.
      Nunca invente categoria nova. Output é literal e alimenta automações de
      roteamento, então precisa ser determinístico.

    behaviors:
      - nome: "Validar pedido ao receber dados de crédito"
        trigger: field_updated
        evento_params:
          campos_disparadores: [score-credito, limite-disponivel, status-kyc]
        prompt: |
          Você valida se um pedido pode ser aprovado para faturamento.

          ENTRADA:
          - Valor pedido: {{ valor-total }}
          - Score crédito cliente: {{ score-credito }}
          - Limite disponível: {{ limite-disponivel }}
          - Status KYC: {{ status-kyc }}
          - Forma pagamento: {{ forma-pagamento }}

          REGRAS:
          1. Se Status KYC != "Ativo" → "BLOQUEADO_KYC".
          2. Se Valor > Limite → "EXCEDE_LIMITE: excesso de R$ X".
          3. Se Score < 500 AND Forma pagamento != "À vista" → "RISCO_INADIMPLENCIA".
          4. Se Score >= {{ score_credito_minimo }} AND Forma pagamento = "À vista" → "OK_FAST_TRACK".
          5. Senão → "OK_ANALISE_PADRAO".

          Saída: status (string enum acima) + breve motivo.

          Preencha:
          - validacao-status com uma das 5 categorias enum exatas
          - motivo-validacao com 1-2 frases explicando a classificação (incluindo o excesso em reais se EXCEDE_LIMITE)

        acoes:
          - tipo: update_card
            campos:
              - id: validacao-status
                modo: fill_with_ai
              - id: motivo-validacao
                modo: fill_with_ai
```

## 🔗 Pipe Relations

```yaml
pipe_relations:
  - id: rel-analise-credito
    nome: "Análise de Crédito (sub-pipe)"
    pipe_filho_externo: "{{ pipe_analise_credito_id }}"
    cardinalidade: one_to_one
    auto_fill: false
    nome_no_filho: "Pedido origem"
    descricao: "Sub-pipe para pedidos com EXCEDE_LIMITE ou RISCO_INADIMPLENCIA. Mantém o O2C principal limpo."
```

## 🪝 Webhooks

```yaml
webhooks:
  - id: crm-credit-lookup
    nome: "Lookup de crédito no CRM"
    url: "{{ webhook_crm_url }}"
    eventos:
      - card.create
    headers:
      Authorization: "Bearer {{ webhook_crm_token }}"
    metodo: POST
    payload_extra:
      acao: "credit_lookup"
      origem: "pipefy-order-approval"

  - id: erp-faturamento
    nome: "Faturamento no ERP"
    url: "{{ webhook_erp_url }}"
    eventos:
      - card.field_update
    filtro:
      campo_igual:
        campo: decisao
        valor: Aprovado
    headers:
      Authorization: "Bearer {{ webhook_erp_token }}"
    metodo: POST
    payload_extra:
      acao: "create_invoice"
      origem: "pipefy-order-approval"
```

## 📌 Pós-clonagem

1. **Configurar notificações por email manualmente via UI** — o template não automatiza emails. Crie via Pipefy UI: alerta para `{{ comercial_responsavel_email }}` em SLA estourado da fase "Aprovação", para o aprovador (campo `aprovador`) quando entra em Aprovação, e para o cliente quando "Entrega" muda para `Entregue`.
2. **Apontar `pipe_analise_credito_id`** — informe o ID do sub-pipe de Análise de Crédito existente. Se ainda não existir, crie um pipe simples (3 fases: triagem / análise / decisão) antes.
3. **Configurar webhooks CRM e ERP** — sem essas URLs, o lookup de crédito e o faturamento ficam manuais. A IA segue funcionando, mas com dados precários (score em branco vira ensaio).
4. **Calibrar `limite_auto_aprovacao` e `score_credito_minimo`** — defaults (R$ 5.000 e score 700) são conservadores; ajuste para sua realidade.
5. **Adicionar o time de aprovadores** ao pipe e configure permissões da fase "Aprovação" para que só aprovadores editem `decisao`.
6. **Validar com pedido de teste** — crie um pedido fake com cliente conhecido e confira se o lookup, a classificação da IA e o roteamento (auto-aprovação ou sub-pipe) funcionam ponta-a-ponta antes de subir tráfego real.

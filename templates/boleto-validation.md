---
id: boleto-validation
nome: Validação e Pagamento de Boletos
descricao_curta: Esteira de recebimento, extração e validação de boletos bancários com IA extraindo linha digitável, validação HTTP de boleto e agendamento via core bancário.
categoria: financeiro
versao: 1.1.0
schema_version: 1
autor: pipefy-template-store
tags: [financeiro, boleto, ap, doc-extraction, ia, banco]
icone: 📥
tempo_estimado_criacao: "~60 segundos"
fases_count: 4
campos_count: 16
requer_ai_agents: true
requer_database_tables: false
---

# Validação e Pagamento de Boletos

## 📖 Sobre este template

Esteira de processamento de boletos bancários brasileiros (linha digitável 47-48 dígitos). A IA extrai linha digitável, beneficiário, CPF/CNPJ, valor, data de vencimento e banco emissor. Após extração, uma validação HTTP (Boleto Cloud ou serviço equivalente) confirma os dados. Boletos abaixo de R$ 1.000 com validação OK seguem para auto-aprovação; demais passam por revisão manual. Após aprovação, dispara agendamento via API do banco/core bancário.

**Indicado para:** áreas de Contas a Pagar de PMEs e médias empresas que processam 50-1000 boletos/mês.
**Não indicado para:** empresas com ERP financeiro robusto (TOTVS Protheus, SAP) já tratando AP end-to-end. Pode ser usado como camada de pré-processamento.

## 🎯 Resultados esperados

- Reduzir tempo de digitação manual de linha digitável em ~95%.
- Validação automática de boletos vencidos / inválidos / com divergência de valor.
- Auto-aprovação de boletos baixos (`< R$ 1.000`) com validação HTTP OK.
- Agendamento direto via API do banco (sem retipagem no internet banking).
- Visibilidade diária dos boletos vencendo em até 2 dias úteis.

## ⚙️ Variáveis de criação

```yaml
variaveis:
  - nome: nome_do_pipe
    label: "Nome do pipe"
    tipo: string
    default: "Validação de Boletos"
    obrigatorio: true

  - nome: financeiro_email
    label: "Email do financeiro (alertas e revisão manual)"
    tipo: email
    obrigatorio: true

  - nome: limite_auto_aprovacao
    label: "Valor abaixo do qual boletos validados são auto-aprovados (BRL)"
    tipo: number
    default: 1000
    obrigatorio: true

  - nome: webhook_validacao_boleto_url
    label: "URL do serviço de validação de boleto (Boleto Cloud, Cobranca API)"
    tipo: string
    default: ""
    obrigatorio: false

  - nome: webhook_validacao_boleto_token
    label: "Token de autenticação do serviço de validação"
    tipo: string
    default: ""
    obrigatorio: false

  - nome: webhook_banco_url
    label: "URL do core bancário para agendar pagamento"
    tipo: string
    default: ""
    obrigatorio: false

  - nome: webhook_banco_token
    label: "Token de autorização do core bancário"
    tipo: string
    default: ""
    obrigatorio: false
```

## 🏗️ Estrutura do Pipe

```yaml
pipe:
  nome: "{{ nome_do_pipe }}"
  descricao: "Processamento de boletos com IA + validação HTTP + agendamento bancário"
  preferencias:
    icone: "📥"
    aiAgentsEnabled: true

  fases:
    - id: recebimento
      nome: "Recebimento"
      descricao: "Boleto recebido e fornecedor identificado"
      ordem: 1
      done: false
      sla_dias: 1
      campos:
        - id: anexo-boleto
          label: "Anexo do boleto (PDF)"
          tipo: attachment
          obrigatorio: true
        - id: fornecedor
          label: "Fornecedor"
          tipo: short_text
          obrigatorio: true

    - id: extracao
      nome: "Extração"
      descricao: "IA extrai dados do boleto"
      ordem: 2
      done: false
      sla_dias: 1
      campos:
        - id: linha-digitavel
          label: "Linha digitável (47-48 dígitos)"
          tipo: short_text
        - id: beneficiario
          label: "Beneficiário"
          tipo: short_text
        - id: cpf-cnpj-beneficiario
          label: "CPF/CNPJ do beneficiário"
          tipo: short_text
        - id: valor
          label: "Valor (BRL)"
          tipo: currency
        - id: data-vencimento
          label: "Data de vencimento"
          tipo: date
        - id: banco-emissor
          label: "Banco emissor"
          tipo: select
          opcoes:
            - "001 - Banco do Brasil"
            - "033 - Santander"
            - "104 - Caixa Econômica"
            - "237 - Bradesco"
            - "260 - Nubank"
            - "341 - Itaú"
            - "077 - Inter"
            - "Outros"
        - id: alertas-extracao
          label: "Alertas (VENCIDO, NAO_E_BOLETO, etc.)"
          tipo: long_text

    - id: validacao
      nome: "Validação"
      descricao: "Validação HTTP + checagem do pedido em aberto"
      ordem: 3
      done: false
      sla_dias: 2
      campos:
        - id: match-pedido
          label: "Match com pedido em aberto?"
          tipo: radio_horizontal
          opcoes: [OK, Divergente, "Sem pedido"]
        - id: conferencia-valor
          label: "Conferência de valor"
          tipo: radio_horizontal
          opcoes: [OK, Divergente]
        - id: aprovado
          label: "Aprovado para pagamento?"
          tipo: radio_horizontal
          opcoes: [Sim, Não]

    - id: pagamento-agendado
      nome: "Pagamento Agendado"
      descricao: "Pagamento agendado no core bancário"
      ordem: 4
      done: true
      campos:
        - id: data-agendamento
          label: "Data agendamento"
          tipo: date
        - id: conta-debitada
          label: "Conta a ser debitada"
          tipo: select
          opcoes: ["Conta Corrente Principal", "Conta Pagamentos", "Conta Fornecedores", "Outra"]
        - id: confirmacao-banco
          label: "Confirmação do banco recebida?"
          tipo: radio_horizontal
          opcoes: [Sim, Não]
```

## 🔔 Automações

```yaml
automacoes:
  - id: validar-boleto-http
    nome: "Disparar validação HTTP ao preencher linha digitável"
    quando:
      evento: field_updated
      campo: linha-digitavel
    entao:
      tipo: send_http_request
      webhook_id: validar-boleto-externo

  - id: auto-aprovacao-baixo-valor
    nome: "Auto-aprovar boletos baixos validados"
    quando:
      evento: field_updated
      campo: conferencia-valor
    entao:
      tipo: update_card_field
      campo: aprovado
      valor: Sim

  - id: agendar-pagamento-banco
    nome: "Agendar pagamento no banco quando aprovado"
    quando:
      evento: field_updated
      campo: aprovado
    entao:
      tipo: send_http_request
      webhook_id: agendar-pagamento-banco

  - id: mover-pagamento-agendado
    nome: "Mover card para Pagamento Agendado após aprovação"
    quando:
      evento: field_updated
      campo: aprovado
    entao:
      tipo: move_single_card
      fase_destino: pagamento-agendado
```

## 🧠 AI Agents

```yaml
ai_agents:
  - id: extracao-boleto
    nome: "Extração de Boleto Brasileiro"
    instruction: |
      Você é um agente especializado em extração de dados de boletos bancários
      brasileiros. Identifica linha digitável (47-48 dígitos), beneficiário,
      CPF/CNPJ, valor, data de vencimento e banco emissor. Saída sempre em JSON.

    behaviors:
      - nome: "Extrair dados ao entrar em Extração"
        trigger: card_moved
        evento_params:
          em_fase: extracao
        prompt: |
          Você é um agente especializado em extração de dados de boletos bancários brasileiros.

          ENTRADA: anexo PDF no campo {{ Anexo boleto }}.

          TAREFA — extraia:

          1. Linha digitável (47 ou 48 dígitos, com pontos e espaços removidos)
          2. Beneficiário (razão social ou nome)
          3. CPF/CNPJ do beneficiário (apenas dígitos)
          4. Valor (numérico, 2 casas decimais)
          5. Data vencimento (YYYY-MM-DD)
          6. Banco emissor (3 primeiros dígitos da linha digitável → nome banco)

          REGRAS:
          - Linha digitável: localize sob o código de barras. Sempre 47-48 dígitos. Remova pontos, espaços.
          - Se o documento NÃO for um boleto válido (carnê, fatura interna) → retorne erro "NAO_E_BOLETO".
          - Não calcule juros/multa — extraia apenas o valor face.
          - Se data vencimento já passou → marque ALERTA "VENCIDO".

          FORMATO DE SAÍDA (JSON):
          {
            "linha_digitavel": "47 dígitos",
            "beneficiario": "...",
            "cpf_cnpj_beneficiario": "14 ou 11 dígitos",
            "valor": 1234.56,
            "data_vencimento": "YYYY-MM-DD",
            "banco_emissor": "237 - Bradesco",
            "alertas": ["VENCIDO" se aplicável]
          }

          EXEMPLO:
          Boleto Bradesco, beneficiário ABC LTDA CNPJ 12.345.678/0001-99, valor R$ 1.234,56, vencimento 25/05/2026.
          Linha digitável: 23792.16006 00012.345677 89000.123456 1 12340000123456
          Saída: {"linha_digitavel": "23792160060001234567789000123456112340000123456", "beneficiario": "ABC LTDA", "cpf_cnpj_beneficiario": "12345678000199", "valor": 1234.56, "data_vencimento": "2026-05-25", "banco_emissor": "237 - Bradesco", "alertas": []}

        acoes:
          - tipo: update_card
            campos:
              - id: linha-digitavel
                modo: fill_with_ai
              - id: beneficiario
                modo: fill_with_ai
              - id: cpf-cnpj-beneficiario
                modo: fill_with_ai
              - id: valor
                modo: fill_with_ai
              - id: data-vencimento
                modo: fill_with_ai
              - id: banco-emissor
                modo: fill_with_ai
              - id: alertas-extracao
                modo: fill_with_ai
```

## 🪝 Webhooks

```yaml
webhooks:
  - id: validar-boleto-externo
    nome: "Validar boleto no serviço externo (Boleto Cloud / Cobranca API)"
    url: "{{ webhook_validacao_boleto_url }}"
    eventos:
      - card.field_update
    filtro:
      campo_igual:
        campo: linha-digitavel
        valor: "*"
    headers:
      Authorization: "Bearer {{ webhook_validacao_boleto_token }}"
      Content-Type: "application/json"
    payload_extra:
      operacao: "validar_boleto"
      origem: "pipefy-boleto-validation"

  - id: agendar-pagamento-banco
    nome: "Agendar pagamento no core bancário"
    url: "{{ webhook_banco_url }}"
    eventos:
      - card.field_update
    filtro:
      campo_igual:
        campo: aprovado
        valor: Sim
    headers:
      Authorization: "Bearer {{ webhook_banco_token }}"
      Content-Type: "application/json"
    payload_extra:
      operacao: "agendar_pagamento"
      origem: "pipefy-boleto-validation"
```

## 📌 Pós-criação

1. **Serviço de validação de boleto** — contrate Boleto Cloud, Cobranca API ou similar e configure a URL/token. Sem isso o card avança apenas com extração da IA, sem confirmação determinística da linha digitável.
2. **Integração com o core bancário** — a maioria dos bancos PJ oferece API de cobrança/pagamento (Banco do Brasil API CMN, Itaú APIcatalog, Bradesco Open Finance). Configure a URL/token e teste o agendamento em sandbox antes de produção.
3. **Scheduler de boletos vencendo** — adicione manualmente uma view filtrada (cards com `data-vencimento` em até 2 dias úteis e `aprovado != Sim`) e configure notificação diária para `{{ financeiro_email }}` via UI.
4. **Regra de auto-aprovação** — ajuste o `{{ limite_auto_aprovacao }}` conforme o apetite de risco do financeiro. PMEs costumam operar 1.000-5.000.
5. **Notificações por email** — configure manualmente via UI:
   - Alerta interno quando IA retorna `NAO_E_BOLETO` no campo `alertas-extracao`.
   - Alerta de boletos vencidos.
   - Confirmação ao requisitante quando o agendamento for confirmado pelo banco.
6. **Membros do pipe** — financeiro com escrita em todas as fases, demais áreas com leitura.
7. **Calibrar prompt** — após 50-100 boletos reais, ajuste o prompt do agente para incluir bancos digitais menos comuns no seu fluxo (PicPay Bank, BS2, etc.).

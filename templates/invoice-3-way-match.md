---
id: invoice-3-way-match
nome: Invoice 3-Way Match (PO + GRN + NF)
categoria: financeiro
versao: 1.1.0
schema_version: 1
descricao_curta: Conferência 3-way de Notas Fiscais contra Pedido de Compra (PO) e Nota de Recebimento (GRN), com agente IA único validando valor, itens e quantidades.
autor: pipefy-template-store
tags: [ap, p2p, doc-extraction, compliance, 3-way-match, ia, financeiro]
icone: 📑
tempo_estimado_criacao: "~70 segundos"
fases_count: 5
campos_count: 17
requer_ai_agents: true
requer_database_tables: true
---

# Invoice 3-Way Match (PO + GRN + NF)

## 📖 Sobre este template

Pipeline de **Accounts Payable com conferência 3-way match**: NF chega, extrator identifica fornecedor e valor, sistema busca o PO correspondente via integração com o Pipe de Compras, e um agente IA único valida três condições — valor (±2% tolerância), itens (NF ⊆ PO) e recebimento (NF ≤ GRN). Divergências caem em fase específica de resolução; matches limpos seguem direto para pagamento programado.

**Indicado para:** empresas com 100-2.000 NFs/mês onde 3-way match manual consome time. **Não indicado para:** organizações que rodam matching nativo no ERP (SAP MIRO) — risco de duplicação.

## 🎯 Resultados esperados

- Reduzir tempo de matching manual em ~80% para NFs sem divergência.
- Capturar divergências (valor, item ausente, quantidade) em fase dedicada com responsável.
- Boundary clara: agente decide, automação executa pagamento no ERP.
- Trilha de auditoria 3-way completa por NF.
- Tolerância de valor explícita (±2%) evitando falso positivo.

## ⚙️ Variáveis de criação

```yaml
variaveis:
  - nome: nome_do_pipe
    label: "Nome do pipe"
    tipo: string
    default: "Invoice 3-Way Match"
    obrigatorio: true

  - nome: pipe_compras_id
    label: "ID do Pipe de Compras (origem dos POs) para criar a relação cross-pipe"
    tipo: string
    obrigatorio: true
    placeholder: "Ex: 301234567 — pipe criado pelo template purchase-request-approval"

  - nome: webhook_erp_pagamento_url
    label: "URL do webhook do ERP para programar pagamento"
    tipo: string
    obrigatorio: true
    placeholder: "https://erp.suaempresa.com/api/payment-schedule"

  - nome: tolerancia_valor_percentual
    label: "Tolerância de valor para match OK (em %)"
    tipo: number
    default: 2
    obrigatorio: true

  - nome: organization_id
    label: "ID da sua organização Pipefy (para criar a Database Table)"
    tipo: string
    obrigatorio: true
```

## 🏗️ Estrutura do Pipe

```yaml
pipe:
  nome: "{{ nome_do_pipe }}"
  descricao: "Conferência 3-way: PO + GRN + NF antes do pagamento."
  preferencias:
    icone: "📑"
    aiAgentsEnabled: true

  fases:
    - id: nf-recebida
      nome: "NF Recebida"
      descricao: "NF chegou e precisa ser identificada"
      ordem: 1
      campos:
        - id: anexo_nf
          label: "Anexo NF"
          tipo: attachment
          obrigatorio: true
        - id: fornecedor
          label: "Fornecedor"
          tipo: connector
          conector_tabela: "db_fornecedores_ap"
        - id: numero_nf
          label: "Número NF"
          tipo: short_text
        - id: valor_nf
          label: "Valor NF"
          tipo: currency
          moeda: "BRL"
        - id: cnpj_emissor
          label: "CNPJ emissor"
          tipo: cnpj

    - id: match-po
      nome: "Match com PO"
      descricao: "Localiza PO de referência e compara valor + itens"
      ordem: 2
      sla_dias: 1
      campos:
        - id: po_referencia
          label: "PO de referência"
          tipo: connector
        - id: valor_po
          label: "Valor PO (auto)"
          tipo: currency
          moeda: "BRL"
        - id: match_valor
          label: "Match valor"
          tipo: radio_horizontal
          opcoes: ["OK", "Divergência", "Ilegível"]
        - id: match_itens
          label: "Match itens"
          tipo: radio_horizontal
          opcoes: ["OK", "Divergência", "Ilegível"]
        - id: divergencias_detectadas
          label: "Divergências detectadas"
          tipo: long_text

    - id: match-grn
      nome: "Match com GRN"
      descricao: "Compara com Nota de Recebimento"
      ordem: 3
      sla_dias: 1
      campos:
        - id: grn_nota_recebimento
          label: "GRN / Nota de recebimento"
          tipo: attachment
        - id: qtd_recebida_vs_faturada
          label: "Quantidade recebida vs faturada (auto)"
          tipo: long_text
        - id: match_grn
          label: "Match GRN"
          tipo: radio_horizontal
          opcoes: ["OK", "Divergência", "Ilegível"]

    - id: resolucao-divergencias
      nome: "Resolução de Divergências"
      descricao: "Analista trata exceções (divergência em qualquer match)"
      ordem: 4
      sla_dias: 3
      campos:
        - id: responsavel_resolucao
          label: "Responsável"
          tipo: assignee_select
        - id: acao_tomada
          label: "Ação tomada"
          tipo: long_text
        - id: aprovacao_excecao
          label: "Aprovação da exceção"
          tipo: radio_horizontal
          opcoes: ["Sim", "Não"]

    - id: aprovado-pagamento
      nome: "Aprovado para Pagamento"
      descricao: "Pagamento programado no ERP"
      ordem: 5
      done: true
      campos:
        - id: data_pagamento_programada
          label: "Data pagamento programada"
          tipo: date
        - id: id_pagamento
          label: "ID pagamento"
          tipo: short_text
```

## 🔔 Automações

```yaml
automacoes:
  - id: auto-move-resolucao
    nome: "Auto-move para Resolução quando houver divergência em qualquer match"
    quando:
      evento: field_updated
      campo: match_grn
    entao:
      tipo: move_single_card
      fase_destino: resolucao-divergencias

  - id: auto-move-pagamento
    nome: "Auto-move para Aprovado quando todos os matches = OK"
    quando:
      evento: field_updated
      campo: match_grn
    entao:
      tipo: move_single_card
      fase_destino: aprovado-pagamento

  - id: webhook-programar-pagamento
    nome: "Programar pagamento no ERP"
    quando:
      evento: card_moved_to_phase
      fase: aprovado-pagamento
    entao:
      tipo: send_http_request
      webhook_id: webhook-erp-pagamento
```

## 🧠 AI Agents

```yaml
ai_agents:
  - id: validacao-3-way-match
    nome: "Validação 3-way match"
    instruction: |
      Você é um agente especializado em conferência de Notas Fiscais contra Pedidos de Compra (PO) e Notas de Recebimento (GRN). Sua tarefa é validar 3-way match.

      ENTRADA:
      - NF (PDF): {{ Anexo NF }}
      - PO de referência: {{ PO de referência }} (valor, itens, fornecedor)
      - GRN: {{ GRN }} (quantidades recebidas)

      TAREFA — verifique 3 condições:

      1. VALOR: o valor total da NF está dentro de ±2% do valor do PO?
      2. ITENS: os itens da NF estão na lista do PO, com mesma quantidade ou menor?
      3. RECEBIMENTO: a quantidade da NF é menor ou igual à quantidade do GRN?

      REGRAS:
      - Se NF tiver imposto incluído e PO não → desconte o imposto antes de comparar.
      - Se houver desconto na NF (frete grátis, p.ex.) → considere o valor líquido.
      - Quando QUALQUER campo for ilegível → marque ILEGIVEL nesse campo, NÃO assuma.
      - Divergência ≤2% no valor → match OK (tolerância).
      - Item da NF não no PO → divergência crítica.

      FORMATO DE SAÍDA (JSON obrigatório):
      {
        "match_valor": "OK|DIVERGENCIA|ILEGIVEL",
        "match_itens": "OK|DIVERGENCIA|ILEGIVEL",
        "match_grn": "OK|DIVERGENCIA|ILEGIVEL",
        "divergencias": ["item X não no PO", "valor R$ Y excede 2%", ...],
        "decisao_recomendada": "APROVAR|REVISAR|REJEITAR"
      }

      EXEMPLO:
      NF valor 10.500, PO valor 10.000 → divergência > 2% → match_valor: DIVERGENCIA
      NF item "Cadeira modelo X qtd 5", PO item "Cadeira modelo X qtd 5" → match_itens: OK
      GRN qtd recebida 5, NF qtd 5 → match_grn: OK
      Saída: {"match_valor": "DIVERGENCIA", "match_itens": "OK", "match_grn": "OK", "divergencias": ["valor da NF 10.500 excede PO 10.000 em 5%"], "decisao_recomendada": "REVISAR"}
    behaviors:
      - nome: "Executar 3-way match ao chegar GRN"
        trigger: card_moved
        evento_params:
          para_fase: match-grn
        prompt: |
          Quando o card entrar na fase Match com GRN, leia o Anexo NF, o PO de referência (cross-pipe lookup) e o GRN anexado. Aplique a lógica de 3-way descrita na instruction. Preencha match_valor, match_itens, match_grn e divergencias_detectadas. A decisão_recomendada deve ser usada como input para a automação que move o card.
        capacidades:
          - buscar_card_relacionado
        acoes:
          - nome: "Preencher resultados dos três matches"
            tipo: update_card
            campos:
              - id: match_valor
                modo: fill_with_ai
              - id: match_itens
                modo: fill_with_ai
              - id: match_grn
                modo: fill_with_ai
              - id: divergencias_detectadas
                modo: fill_with_ai
              - id: qtd_recebida_vs_faturada
                modo: fill_with_ai
```

## 🗄️ Database Tables

```yaml
database_tables:
  - id: db_fornecedores_ap
    nome: "Fornecedores AP"
    descricao: "Cadastro de fornecedores aprovados para AP (referência rápida durante extração)"
    colunas:
      - id: razao_social
        label: "Razão Social"
        tipo: short_text
        obrigatorio: true
      - id: cnpj
        label: "CNPJ"
        tipo: cnpj
        unico: true
      - id: id_erp
        label: "ID no ERP"
        tipo: short_text
      - id: condicao_pagamento
        label: "Condição de pagamento"
        tipo: short_text
```

## 🔗 Pipe Relations

```yaml
pipe_relations:
  - id: rel-pipe-compras
    nome: "PO de origem (Pipe Compras)"
    pipe_filho_externo: "{{ pipe_compras_id }}"
    cardinalidade: one_to_one
    auto_fill: false
    nome_no_filho: "NF correspondente (3-Way Match)"
    descricao: "Liga cada NF ao PO original criado no pipe de Solicitação de Compras."
```

## 🪝 Webhooks

```yaml
webhooks:
  - id: webhook-erp-pagamento
    nome: "Programar pagamento no ERP"
    url: "{{ webhook_erp_pagamento_url }}"
    eventos:
      - card.move
    filtro:
      fase_destino: aprovado-pagamento
    metodo: POST
    headers:
      X-Source: "pipefy-template-store"
```

## 📌 Pós-criação

- Forneça em `pipe_compras_id` o ID do pipe de Compras (idealmente o pipe criado pelo template `purchase-request-approval` — o `connector` `po_referencia` aponta para ele via pipe-relation).
- Configure a URL real do webhook do ERP para programar pagamento.
- Popule a Database Table **Fornecedores AP** com o cadastro do ERP (CSV import).
- Adicione analistas de AP como membros do pipe (necessário para `assignee_select` em Resolução de Divergências).
- Configure manualmente via UI a **automação de query ao Pipe Compras** quando `fornecedor` for preenchido — buscar PO ativo com mesmo fornecedor + valor próximo (tolerância configurada via `tolerancia_valor_percentual`). Isto exige automação HTTP do plano do Pipefy.
- Configure manualmente notificação ao analista quando o card cair em Resolução de Divergências (template não inclui email).

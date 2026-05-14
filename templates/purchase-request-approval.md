---
id: purchase-request-approval
nome: Solicitação e Aprovação de Compras
categoria: operacoes
versao: 1.1.0
schema_version: 1
descricao_curta: Fluxo P2P de solicitação de compra com triagem, cotação, aprovação por alçada (lookup em DB) e emissão de PO via integração com ERP.
autor: pipefy-template-store
tags: [compras, p2p, aprovacao, procurement, po, alcadas, ia]
icone: 🛒
tempo_estimado_criacao: "~75 segundos"
fases_count: 5
campos_count: 21
requer_ai_agents: true
requer_database_tables: true
---

# Solicitação e Aprovação de Compras

## 📖 Sobre este template

Processo backoffice de Purchase-to-Pay focado na ponta de **solicitação, cotação e aprovação por alçada**. Solicitantes registram a necessidade, Compras triagem cotações, e o sistema roteia automaticamente para o aprovador correto baseado em valor e centro de custo (consultando uma Database Table de alçadas). Após aprovação, um webhook integra com o ERP para gerar o PO.

**Indicado para:** áreas de Compras com 50-500 solicitações/mês que querem governança sem burocratizar pedidos pequenos. **Não indicado para:** organizações com ERP que já tem módulo de requisição embarcado e maduro (SAP MM, Oracle iProcurement) — neste caso o Pipefy é redundante.

## 🎯 Resultados esperados

- Direcionar solicitações ao aprovador correto em segundos (vs. dias de email).
- Eliminar workflows longos para compras pequenas via phase-jump condicional.
- Trilha de auditoria completa: quem aprovou, quando, com qual base de alçada.
- PO emitido no ERP automaticamente sem dupla digitação.
- Visibilidade total do backlog de Compras em um único Kanban.

## ⚙️ Variáveis de criação

```yaml
variaveis:
  - nome: nome_do_pipe
    label: "Nome do pipe"
    tipo: string
    default: "Solicitação e Aprovação de Compras"
    obrigatorio: true

  - nome: limite_alcada_baixa
    label: "Limite de valor para auto-aprovação (alçada baixa, sem dupla aprovação)"
    tipo: number
    default: 5000
    obrigatorio: true

  - nome: limite_alcada_dupla
    label: "Valor a partir do qual dupla aprovação é exigida"
    tipo: number
    default: 50000
    obrigatorio: true

  - nome: webhook_erp_url
    label: "URL do webhook do ERP para emissão de PO"
    tipo: string
    obrigatorio: true
    placeholder: "https://erp.suaempresa.com/api/po"

  - nome: organization_id
    label: "ID da sua organização Pipefy (para criar as Database Tables)"
    tipo: string
    obrigatorio: true
```

## 🏗️ Estrutura do Pipe

```yaml
pipe:
  nome: "{{ nome_do_pipe }}"
  descricao: "Pipeline de solicitação, cotação e aprovação de compras com routing por alçada."
  preferencias:
    icone: "🛒"
    aiAgentsEnabled: true

  fases:
    - id: solicitacao
      nome: "Solicitação"
      descricao: "Solicitante registra a necessidade de compra"
      ordem: 1
      campos:
        - id: nome_solicitante
          label: "Nome do solicitante"
          tipo: short_text
          obrigatorio: true
        - id: centro_de_custo
          label: "Centro de custo"
          tipo: select
          opcoes: ["TI", "Marketing", "Comercial", "Operações", "RH", "Financeiro", "Jurídico"]
          obrigatorio: true
        - id: item_descricao
          label: "Item / Descrição"
          tipo: long_text
          obrigatorio: true
        - id: quantidade
          label: "Quantidade"
          tipo: number
          obrigatorio: true
        - id: valor_estimado
          label: "Valor estimado"
          tipo: currency
          moeda: "BRL"
          obrigatorio: true
        - id: fornecedor_sugerido
          label: "Fornecedor sugerido"
          tipo: connector
          conector_tabela: "db_fornecedores"
        - id: justificativa
          label: "Justificativa"
          tipo: long_text
          obrigatorio: true
        - id: anexo_cotacoes_iniciais
          label: "Anexo cotações iniciais"
          tipo: attachment

    - id: triagem-cotacao
      nome: "Triagem & Cotação"
      descricao: "Compras revisa cotações e define valor final"
      ordem: 2
      sla_dias: 2
      campos:
        - id: cotacoes_recebidas
          label: "Cotações recebidas"
          tipo: attachment
        - id: valor_final
          label: "Valor final"
          tipo: currency
          moeda: "BRL"
        - id: fornecedor_escolhido
          label: "Fornecedor escolhido"
          tipo: connector
          conector_tabela: "db_fornecedores"

    - id: aprovacao-alcada
      nome: "Aprovação por Alçada"
      descricao: "Routing automático para aprovador(es) baseado em alçada"
      ordem: 3
      sla_dias: 3
      campos:
        - id: aprovador_1
          label: "Aprovador 1"
          tipo: assignee_select
        - id: aprovador_2
          label: "Aprovador 2 (dupla aprovação)"
          tipo: assignee_select
        - id: tabela_alcadas_json
          label: "Tabela de alçadas (JSON, lido pelo agente)"
          tipo: long_text
        - id: decisao
          label: "Decisão"
          tipo: radio_horizontal
          opcoes: ["Aprovado", "Reprovado", "Solicita ajuste"]
        - id: comentario_aprovacao
          label: "Comentário da aprovação"
          tipo: long_text

    - id: emissao-po
      nome: "Emissão de PO"
      descricao: "PO emitido no ERP via integração"
      ordem: 4
      sla_dias: 1
      campos:
        - id: numero_po
          label: "Número do PO"
          tipo: short_text
        - id: pdf_po
          label: "PDF do PO"
          tipo: attachment
        - id: data_emissao
          label: "Data de emissão"
          tipo: date

    - id: concluido
      nome: "Concluído"
      descricao: "Compra finalizada e PO emitido"
      ordem: 5
      done: true
```

## 🔔 Automações

```yaml
automacoes:
  - id: auto-move-alcada-baixa
    nome: "Auto-move para Emissão PO se valor < limite_alcada_baixa"
    quando:
      evento: field_updated
      campo: valor_final
    entao:
      tipo: move_single_card
      fase_destino: emissao-po

  - id: auto-move-aprovado
    nome: "Auto-move para Emissão PO quando decisão = Aprovado"
    quando:
      evento: field_updated
      campo: decisao
    entao:
      tipo: move_single_card
      fase_destino: emissao-po

  - id: webhook-erp-emitir-po
    nome: "Disparar criação do PO no ERP"
    quando:
      evento: card_moved_to_phase
      fase: emissao-po
    entao:
      tipo: send_http_request
      webhook_id: webhook-erp-po
```

## 🧠 AI Agents

```yaml
ai_agents:
  - id: routing-aprovador-alcada
    nome: "Routing de aprovador por alçada"
    instruction: |
      Você é um agente responsável por identificar o aprovador correto baseado no valor e centro de custo de uma solicitação de compra.

      ENTRADA:
      - Valor estimado: {{ Valor estimado }}
      - Centro de custo: {{ Centro de custo }}
      - Tabela de alçada: {{ Database alçadas (JSON) }}

      TAREFA:
      1. Localize a linha da tabela onde centro_de_custo == {{ Centro de custo }}.
      2. Identifique a faixa de alçada onde o valor cai (ex: 0-5k, 5k-25k, 25k-100k, >100k).
      3. Retorne o ID do aprovador correspondente da coluna "aprovador_id".

      REGRAS:
      - Se centro de custo não encontrado na tabela → retorne "REVISAO_MANUAL".
      - Se valor for negativo ou zero → retorne "REVISAO_MANUAL".
      - Nunca invente aprovador que não esteja na tabela.

      FORMATO DE SAÍDA (obrigatório):
      aprovador_id: <ID da tabela>

      EXEMPLO:
      Valor: 12000, Centro de custo: TI
      Tabela: TI 0-5k → A1; TI 5k-25k → A2; TI >25k → A3
      Saída: aprovador_id: A2
    behaviors:
      - nome: "Setar aprovador ao entrar em Aprovação"
        trigger: card_moved
        evento_params:
          para_fase: aprovacao-alcada
        prompt: |
          Quando o card entrar na fase Aprovação por Alçada, leia valor_final (ou valor_estimado se valor_final vazio) e centro_de_custo, consulte a tabela de alçadas e preencha o campo aprovador_1. Se o valor exceder o limite de dupla aprovação configurado ({{ limite_alcada_dupla }}), preencha também aprovador_2.
        acoes:
          - nome: "Atribuir aprovador(es)"
            tipo: update_card
            campos:
              - id: aprovador_1
                modo: fill_with_ai
              - id: aprovador_2
                modo: fill_with_ai
              - id: comentario_aprovacao
                modo: fill_with_ai
```

## 🗄️ Database Tables

```yaml
database_tables:
  - id: db_fornecedores
    nome: "Fornecedores"
    descricao: "Cadastro de fornecedores aprovados"
    colunas:
      - id: razao_social
        label: "Razão Social"
        tipo: short_text
        obrigatorio: true
      - id: cnpj
        label: "CNPJ"
        tipo: cnpj
        unico: true
      - id: categoria
        label: "Categoria"
        tipo: select
        opcoes: ["Serviços", "Produtos", "Software", "Infraestrutura"]
      - id: contato_email
        label: "Email de contato"
        tipo: email

  - id: db_alcadas
    nome: "Alçadas de Aprovação"
    descricao: "Mapeamento de centro de custo + faixa de valor → aprovador"
    colunas:
      - id: centro_de_custo
        label: "Centro de custo"
        tipo: select
        opcoes: ["TI", "Marketing", "Comercial", "Operações", "RH", "Financeiro", "Jurídico"]
        obrigatorio: true
      - id: faixa_valor_min
        label: "Faixa valor mínimo"
        tipo: currency
        moeda: "BRL"
      - id: faixa_valor_max
        label: "Faixa valor máximo"
        tipo: currency
        moeda: "BRL"
      - id: aprovador_id
        label: "ID do aprovador"
        tipo: short_text
        obrigatorio: true
      - id: aprovador_email
        label: "Email do aprovador"
        tipo: email
```

## 🪝 Webhooks

```yaml
webhooks:
  - id: webhook-erp-po
    nome: "Emissão de PO no ERP"
    url: "{{ webhook_erp_url }}"
    eventos:
      - card.move
    filtro:
      fase_destino: emissao-po
    metodo: POST
    headers:
      X-Source: "pipefy-template-store"
```

## 📌 Pós-criação

- Popule a Database Table **Alçadas de Aprovação** com as faixas reais da sua empresa (centro de custo × faixa de valor → aprovador). Sem isso, o AI Agent não consegue rotear.
- Popule **Fornecedores** com o cadastro inicial (pode ser CSV import).
- Adicione os aprovadores como membros do pipe — `assignee_select` só lista membros.
- Configure a URL real do webhook do ERP em `webhook_erp_url` durante a criação.
- Configure manualmente via UI a notificação por email para o solicitante quando a decisão for atualizada (Aprovado / Reprovado / Solicita ajuste). O template não inclui email templates.
- Ative o time de Compras na fase Triagem & Cotação para que round-robin de assignee funcione (configurar via UI).

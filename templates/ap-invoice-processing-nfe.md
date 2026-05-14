---
id: ap-invoice-processing-nfe
nome: AP Invoice Processing (NF-e brasileiro)
categoria: financeiro
versao: 1.1.0
schema_version: 1
descricao_curta: Processamento de Contas a Pagar com extração estruturada de NF-e/NFS-e/DANFE, validação SEFAZ e auto-aprovação para valores baixos.
autor: pipefy-template-store
tags: [ap, contas-a-pagar, nfe, doc-extraction, sefaz, ia, financeiro, brasil]
icone: 🧾
tempo_estimado_criacao: "~70 segundos"
fases_count: 5
campos_count: 18
requer_ai_agents: true
requer_database_tables: false
---

# AP Invoice Processing (NF-e brasileiro)

## 📖 Sobre este template

Pipeline de **Accounts Payable focado em fiscal brasileiro**: NF chega via inbox-email do pipe, agente extrai campos estruturados da NF-e/NFS-e/DANFE (com regra anti-confusão emissor vs tomador), automação consulta SEFAZ para validar status fiscal, valores baixos auto-aprovam, valores altos vão para aprovador, e o pagamento é programado no banco/ERP.

**Indicado para:** empresas brasileiras com 200-5.000 NFs/mês onde Contas a Pagar consome time. **Não indicado para:** organizações que já usam OCR especializado (Mastersaf, TOTVS Inbound) integrado ao ERP.

## 🎯 Resultados esperados

- Extração estruturada de NF-e em segundos com regra anti-confusão emissor/tomador.
- Validação SEFAZ automatizada para evitar NF cancelada/inexistente.
- Auto-aprovação para valores baixos elimina micro-tarefa repetitiva.
- Pagamento programado no banco/ERP sem dupla digitação.
- Trilha de auditoria fiscal completa (CFOP, chave de acesso, status SEFAZ).

## ⚙️ Variáveis de criação

```yaml
variaveis:
  - nome: nome_do_pipe
    label: "Nome do pipe"
    tipo: string
    default: "AP — Processamento de NF-e"
    obrigatorio: true

  - nome: limite_auto_aprovacao
    label: "Valor abaixo do qual a NF é auto-aprovada (sem aprovador humano)"
    tipo: number
    default: 1000
    obrigatorio: true

  - nome: webhook_sefaz_url
    label: "URL do webservice SEFAZ para consulta de status da NF"
    tipo: string
    obrigatorio: true
    placeholder: "https://nfe.sefaz.suaempresa.com/api/consultar"

  - nome: webhook_banco_pagamento_url
    label: "URL do banco/ERP para agendar pagamento"
    tipo: string
    obrigatorio: true
    placeholder: "https://banking.suaempresa.com/api/schedule-payment"
```

## 🏗️ Estrutura do Pipe

```yaml
pipe:
  nome: "{{ nome_do_pipe }}"
  descricao: "Processamento fiscal brasileiro de NF-e com extração IA e validação SEFAZ."
  preferencias:
    icone: "🧾"
    aiAgentsEnabled: true

  fases:
    - id: recebimento-nf
      nome: "Recebimento NF"
      descricao: "NF chega via email para a inbox do pipe"
      ordem: 1
      campos:
        - id: anexo_nf
          label: "Anexo NF (PDF/XML)"
          tipo: attachment
          obrigatorio: true
        - id: email_origem
          label: "Email origem"
          tipo: email
        - id: data_recebimento
          label: "Data recebimento"
          tipo: date

    - id: extracao-classificacao
      nome: "Extração & Classificação"
      descricao: "Agente extrai campos estruturados da NF"
      ordem: 2
      sla_dias: 1
      campos:
        - id: numero_nf
          label: "Número NF"
          tipo: short_text
        - id: serie
          label: "Série"
          tipo: short_text
        - id: cnpj_emissor
          label: "CNPJ emissor"
          tipo: cnpj
        - id: razao_social_emissor
          label: "Razão social emissor"
          tipo: short_text
        - id: data_emissao
          label: "Data emissão"
          tipo: date
        - id: valor_total
          label: "Valor total"
          tipo: currency
          moeda: "BRL"
        - id: cfop_principal
          label: "CFOP principal"
          tipo: short_text
        - id: chave_acesso
          label: "Chave de acesso NF-e (44 dígitos)"
          tipo: short_text
        - id: categoria_contabil
          label: "Categoria contábil"
          tipo: select
          opcoes: ["Serviços", "Insumos", "Ativo imobilizado", "Software/SaaS", "Marketing", "Outros"]
        - id: centro_de_custo
          label: "Centro de custo"
          tipo: select
          opcoes: ["TI", "Marketing", "Comercial", "Operações", "RH", "Financeiro", "Jurídico"]
        - id: anexo_xml
          label: "Anexo XML"
          tipo: attachment

    - id: validacao-fiscal
      nome: "Validação Fiscal"
      descricao: "Consulta SEFAZ para validar status da NF"
      ordem: 3
      sla_dias: 1
      campos:
        - id: cnpj_valido
          label: "CNPJ válido"
          tipo: radio_horizontal
          opcoes: ["Sim", "Não"]
        - id: status_sefaz
          label: "Status SEFAZ"
          tipo: radio_horizontal
          opcoes: ["Autorizada", "Cancelada", "Inexistente"]
        - id: pendencias_fiscais
          label: "Pendências fiscais"
          tipo: long_text

    - id: aprovacao
      nome: "Aprovação"
      descricao: "Aprovador humano analisa (auto-skip se valor < limite)"
      ordem: 4
      sla_dias: 2
      campos:
        - id: aprovador
          label: "Aprovador"
          tipo: assignee_select
        - id: data_aprovacao
          label: "Data aprovação"
          tipo: date
        - id: comentario_aprovacao
          label: "Comentário"
          tipo: long_text

    - id: pagamento
      nome: "Pagamento"
      descricao: "Pagamento programado no banco/ERP"
      ordem: 5
      done: true
      campos:
        - id: data_pagamento
          label: "Data pagamento"
          tipo: date
        - id: banco_origem
          label: "Banco origem"
          tipo: select
          opcoes: ["Itaú", "Bradesco", "Banco do Brasil", "Santander", "Caixa", "BTG", "Inter", "Outros"]
        - id: id_transacao
          label: "ID transação"
          tipo: short_text
```

## 🔔 Automações

```yaml
automacoes:
  - id: auto-move-extracao
    nome: "Auto-move para Extração ao criar card em Recebimento"
    quando:
      evento: card_created_in_phase
      fase: recebimento-nf
    entao:
      tipo: move_single_card
      fase_destino: extracao-classificacao

  - id: consulta-sefaz
    nome: "Consultar status na SEFAZ"
    quando:
      evento: card_moved_to_phase
      fase: validacao-fiscal
    entao:
      tipo: send_http_request
      webhook_id: webhook-sefaz

  - id: auto-aprovacao-valor-baixo
    nome: "Auto-mover para Pagamento quando valor < limite"
    quando:
      evento: field_updated
      campo: status_sefaz
    entao:
      tipo: move_single_card
      fase_destino: pagamento

  - id: agendar-pagamento
    nome: "Agendar pagamento no banco/ERP"
    quando:
      evento: card_moved_to_phase
      fase: pagamento
    entao:
      tipo: send_http_request
      webhook_id: webhook-banco-pagamento
```

## 🧠 AI Agents

```yaml
ai_agents:
  - id: extracao-nfe
    nome: "Extração estruturada NF-e"
    instruction: |
      Você é um agente especializado em extração de dados de Notas Fiscais brasileiras (NF-e, NFS-e, DANFE, NFC-e).

      ENTRADA: anexo no campo {{ Anexo NF }}.

      TAREFA — extraia EXATAMENTE estes campos:

      1. Número da NF (texto, mantém formato original)
      2. Série (texto)
      3. CNPJ EMISSOR (14 dígitos numéricos, SEM formatação)
         - Localização: aparece como "Emitente" / "Prestador de Serviços" / "Fornecedor", ANTES do bloco TOMADOR/DESTINATÁRIO
      4. Razão social emissor (texto)
      5. Data emissão (formato YYYY-MM-DD)
      6. Valor total (numérico, 2 casas decimais, ponto como separador)
         - Soma de: Valor produtos/serviços + impostos cobrados - descontos
      7. CFOP principal (4 dígitos)
      8. Chave de acesso NF-e (44 dígitos numéricos, se presente)

      REGRAS CRÍTICAS:
      - NÃO confunda CNPJ do emissor com CNPJ do tomador. Emissor vem PRIMEIRO no documento.
      - NÃO invente valores ilegíveis — marque "ILEGIVEL".
      - Se o documento NÃO for NF brasileira (boleto, recibo simples) → retorne erro "DOCUMENTO_NAO_E_NF".
      - Se data fora do formato → tente parse YYYY-MM-DD; se falhar, retorne "DATA_INVALIDA".

      FORMATO DE SAÍDA (JSON obrigatório):
      {
        "numero_nf": "...",
        "serie": "...",
        "cnpj_emissor": "14 dígitos",
        "razao_social_emissor": "...",
        "data_emissao": "YYYY-MM-DD",
        "valor_total": 1234.56,
        "cfop_principal": "5102",
        "chave_acesso": "44 dígitos ou null",
        "alertas": []
      }

      EXEMPLO:
      NF-e nº 12345, série 1, emissor ABC LTDA CNPJ 12.345.678/0001-99, emitida 14/05/2026, valor R$ 1.234,56.
      Saída: {"numero_nf": "12345", "serie": "1", "cnpj_emissor": "12345678000199", "razao_social_emissor": "ABC LTDA", "data_emissao": "2026-05-14", "valor_total": 1234.56, "cfop_principal": "5102", "chave_acesso": null, "alertas": []}
    behaviors:
      - nome: "Extrair NF ao entrar em Extração & Classificação"
        trigger: card_moved
        evento_params:
          para_fase: extracao-classificacao
        prompt: |
          Quando o card entrar na fase Extração & Classificação, leia o anexo NF (PDF ou XML) e execute a extração no formato JSON definido na instruction. Preencha todos os campos individuais (numero_nf, serie, cnpj_emissor, razao_social_emissor, data_emissao, valor_total, cfop_principal, chave_acesso). Se houver alertas (ILEGIVEL, DOCUMENTO_NAO_E_NF, DATA_INVALIDA), descreva-os em pendencias_fiscais.
        acoes:
          - nome: "Preencher campos extraídos"
            tipo: update_card
            campos:
              - id: numero_nf
                modo: fill_with_ai
              - id: serie
                modo: fill_with_ai
              - id: cnpj_emissor
                modo: fill_with_ai
              - id: razao_social_emissor
                modo: fill_with_ai
              - id: data_emissao
                modo: fill_with_ai
              - id: valor_total
                modo: fill_with_ai
              - id: cfop_principal
                modo: fill_with_ai
              - id: chave_acesso
                modo: fill_with_ai
              - id: pendencias_fiscais
                modo: fill_with_ai
```

## 🪝 Webhooks

```yaml
webhooks:
  - id: webhook-sefaz
    nome: "Consulta SEFAZ"
    url: "{{ webhook_sefaz_url }}"
    eventos:
      - card.move
    filtro:
      fase_destino: validacao-fiscal
    metodo: POST
    headers:
      X-Source: "pipefy-template-store"

  - id: webhook-banco-pagamento
    nome: "Agendar pagamento no banco/ERP"
    url: "{{ webhook_banco_pagamento_url }}"
    eventos:
      - card.move
    filtro:
      fase_destino: pagamento
    metodo: POST
    headers:
      X-Source: "pipefy-template-store"
```

## 📌 Pós-criação

- Configure o **inbox-email** do pipe (Pipefy gera um endereço único). Configure forwarding na caixa de notas-fiscais do financeiro para esse endereço. Isso cria cards automaticamente quando NF chega.
- Configure manualmente via UI um pequeno **delay de 30 segundos** entre criação do card e auto-move para Extração & Classificação — garantir que o upload do anexo finalize antes do agente rodar (alguns planos permitem delay; outros não).
- Configure as URLs reais dos webhooks SEFAZ e banco/ERP durante a criação.
- Configure manualmente via UI a regra de **auto-aprovação** para `valor_total < {{ limite_auto_aprovacao }}` — quando status_sefaz = Autorizada, pular fase Aprovação. Isto exige condicional avançado disponível em UI.
- Adicione aprovadores financeiros como membros do pipe.
- Configure manualmente notificação por email ao aprovador quando o card cair em Aprovação (template não inclui email).
- Considere conectar a uma Database Table de Plano de Contas para `categoria_contabil` se sua organização usa codificação contábil estruturada.

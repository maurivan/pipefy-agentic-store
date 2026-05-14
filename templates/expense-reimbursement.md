---
id: expense-reimbursement
nome: Reembolso de Despesas Corporativas
descricao_curta: Reembolso completo (4 fases) com IA extraindo dados do comprovante, validação de política embutida, fast-track para valores baixos e SLA de aprovação.
categoria: financeiro
versao: 1.1.0
schema_version: 1
autor: pipefy-template-store
tags: [financeiro, reembolso, despesas, ocr, ia, ap, doc-extraction]
icone: 💳
tempo_estimado_criacao: "~60 segundos"
fases_count: 4
campos_count: 17
requer_ai_agents: true
requer_database_tables: true
---

# Reembolso de Despesas Corporativas

## 📖 Sobre este template

Esteira de reembolso de despesas corporativas (viagem, alimentação, material, outros) com extração automática de dados do comprovante (NF, NFS-e, recibo, cupom fiscal) por IA. O agente compara valor extraído vs. valor solicitado e flagga violações de política (bebida alcoólica, prazo > 60 dias, combustível sem titular). Fast-track para reembolsos abaixo de R$ 100; valores acima de R$ 500 em despesas de viagem exigem aprovação adicional do gerente do gerente.

**Indicado para:** PMEs e médias empresas com 100-2000 colaboradores e volume médio de 50-500 reembolsos/mês.
**Não indicado para:** empresas que já operam Concur, Expensify, Mobills Corporativo ou plataformas dedicadas de T&E em alto volume.

## 🎯 Resultados esperados

- Reembolso aprovado em até 5 dias úteis (vs. 10-15 em fluxo manual).
- Eliminar fricção em valores baixos via fast-track (`< R$ 100` aprovado direto).
- Detecção automática de violação de política (bebida, prazo, combustível sem titular).
- Centro de custo populado automaticamente via DB Funcionários — fim de erro de classificação.
- Trilha auditável de comprovantes anexados, extração realizada e decisão de cada aprovador.

## ⚙️ Variáveis de criação

```yaml
variaveis:
  - nome: nome_do_pipe
    label: "Nome do pipe"
    tipo: string
    default: "Reembolso de Despesas"
    obrigatorio: true

  - nome: rh_email
    label: "Email do RH (alerta de SLA estourado)"
    tipo: email
    obrigatorio: true

  - nome: limite_fast_track
    label: "Valor abaixo do qual o reembolso entra em fast-track (BRL)"
    tipo: number
    default: 100
    obrigatorio: true

  - nome: limite_aprov_adicional
    label: "Valor a partir do qual viagem exige aprovador adicional (BRL)"
    tipo: number
    default: 500
    obrigatorio: true

  - nome: moeda
    label: "Moeda"
    tipo: select
    opcoes: [BRL, USD, EUR]
    default: BRL
    obrigatorio: true
```

## 🏗️ Estrutura do Pipe

```yaml
pipe:
  nome: "{{ nome_do_pipe }}"
  descricao: "Esteira de reembolso de despesas com IA validando comprovantes"
  preferencias:
    icone: "💳"
    aiAgentsEnabled: true

  fases:
    - id: solicitacao-reembolso
      nome: "Solicitação Reembolso"
      descricao: "Colaborador submete a despesa e anexa o comprovante"
      ordem: 1
      done: false
      sla_dias: 1
      campos:
        - id: funcionario
          label: "Funcionário"
          tipo: assignee_select
          obrigatorio: true
        - id: centro-custo
          label: "Centro de custo (auto via DB Funcionários)"
          tipo: short_text
        - id: tipo-despesa
          label: "Tipo de despesa"
          tipo: select
          opcoes: [Viagem, Alimentação, Material, Outro]
          obrigatorio: true
        - id: valor-solicitado
          label: "Valor solicitado ({{ moeda }})"
          tipo: currency
          obrigatorio: true
        - id: data-despesa
          label: "Data da despesa"
          tipo: date
          obrigatorio: true
        - id: comprovante
          label: "Anexo do comprovante (NF, recibo, cupom)"
          tipo: attachment
          obrigatorio: true
        - id: justificativa
          label: "Justificativa"
          tipo: long_text

    - id: validacao-documento
      nome: "Validação Documento"
      descricao: "IA extrai dados do comprovante e checa política"
      ordem: 2
      done: false
      sla_dias: 1
      campos:
        - id: dados-comprovante
          label: "Dados extraídos (JSON do agente)"
          tipo: long_text
        - id: tipo-documento-validado
          label: "Tipo de documento validado"
          tipo: radio_horizontal
          opcoes: [NF, Recibo, Cupom, Inválido]
        - id: match-valor
          label: "Match valor extraído x solicitado"
          tipo: radio_horizontal
          opcoes: [OK, Divergente]
        - id: politica-violada
          label: "Política violada (se houver)"
          tipo: long_text

    - id: aprovacao-gestor
      nome: "Aprovação Gestor"
      descricao: "Gestor decide aprovar/rejeitar"
      ordem: 3
      done: false
      sla_dias: 5
      campos:
        - id: gestor
          label: "Gestor"
          tipo: assignee_select
        - id: decisao
          label: "Decisão"
          tipo: radio_horizontal
          opcoes: [Aprovado, Rejeitado, "Pedir mais info"]
        - id: comentario-gestor
          label: "Comentário do gestor"
          tipo: long_text

    - id: pagamento
      nome: "Pagamento"
      descricao: "Financeiro efetua o pagamento e anexa comprovante de TED"
      ordem: 4
      done: true
      campos:
        - id: data-pagamento
          label: "Data do pagamento"
          tipo: date
        - id: comprovante-ted
          label: "Comprovante TED / PIX"
          tipo: attachment
```

## 🔔 Automações

```yaml
automacoes:
  - id: fast-track-baixo-valor
    nome: "Fast-track: aprovação automática para valores baixos"
    quando:
      evento: field_updated
      campo: match-valor
    entao:
      tipo: move_single_card
      fase_destino: pagamento

  - id: alerta-sla-aprovacao
    nome: "Alerta interno: SLA de aprovação estourado"
    quando:
      evento: sla_based
      fase: aprovacao-gestor
    entao:
      tipo: update_card_field
      campo: comentario-gestor
      valor: "SLA estourado — RH notificado"

  - id: rejeitar-card
    nome: "Mover para Pagamento quando aprovado pelo gestor"
    quando:
      evento: field_updated
      campo: decisao
    entao:
      tipo: move_single_card
      fase_destino: pagamento
```

## 🧠 AI Agents

```yaml
ai_agents:
  - id: extracao-comprovante
    nome: "Extração de Comprovante de Despesa"
    instruction: |
      Você é um agente que valida comprovantes de despesa (NF, NFS-e, Recibo,
      Cupom Fiscal). Extrai dados estruturados, compara valor extraído vs.
      valor solicitado e flagga violações de política. Saída sempre em JSON.

    behaviors:
      - nome: "Extrair e validar ao entrar em Validação Documento"
        trigger: card_moved
        evento_params:
          em_fase: validacao-documento
        prompt: |
          Você é um agente que valida comprovantes de despesa (Nota Fiscal, Recibo, Cupom Fiscal).

          ENTRADA: anexo no campo {{ Anexo comprovante }}, valor solicitado {{ Valor solicitado }}.

          TAREFA:

          1. Identifique o tipo de documento: NF / NFS-e / Recibo / Cupom Fiscal / Outro / Inválido.
          2. Extraia: Estabelecimento (razão social), CNPJ, Valor total, Data emissão.
          3. Compare o Valor total extraído com {{ Valor solicitado }}:
             - Diferença <= R$ 1,00 → MATCH OK.
             - Diferença > R$ 1,00 → MATCH DIVERGENTE.
          4. Detecte violações de política:
             - Bebida alcoólica em recibo → "BEBIDA_ALCOOLICA"
             - Cupom de combustível sem nome do funcionário → "COMBUSTIVEL_SEM_TITULAR"
             - Data da despesa > 60 dias da solicitação → "PRAZO_EXCEDIDO"

          REGRAS:
          - Se documento ilegível → "ILEGIVEL", não invente.
          - Se NÃO conseguir identificar tipo → "TIPO_INVALIDO".

          FORMATO DE SAÍDA (JSON):
          {
            "tipo_documento": "NF|NFS-e|Recibo|Cupom|Outro|Invalido",
            "estabelecimento": "...",
            "cnpj": "14 dígitos ou null",
            "valor_total": 1234.56,
            "data_emissao": "YYYY-MM-DD",
            "match_valor": "OK|DIVERGENTE",
            "violacoes_politica": ["BEBIDA_ALCOOLICA", "PRAZO_EXCEDIDO"]
          }

        acoes:
          - tipo: update_card
            campos:
              - id: dados-comprovante
                modo: fill_with_ai
              - id: tipo-documento-validado
                modo: fill_with_ai
              - id: match-valor
                modo: fill_with_ai
              - id: politica-violada
                modo: fill_with_ai
```

## 🗄️ Database Tables

```yaml
database_tables:
  - id: funcionarios
    nome: "Funcionários"
    descricao: "Tabela de funcionários com centro de custo e gestor — usada pelo lookup de auto-preenchimento"
    colunas:
      - id: funcionario-id
        label: "ID do funcionário"
        tipo: short_text
        obrigatorio: true
        unico: true
      - id: nome
        label: "Nome completo"
        tipo: short_text
        obrigatorio: true
      - id: email-corporativo
        label: "Email corporativo"
        tipo: email
        obrigatorio: true
      - id: centro-custo
        label: "Centro de custo"
        tipo: short_text
        obrigatorio: true
      - id: gestor-imediato
        label: "Gestor imediato (email)"
        tipo: email
      - id: gestor-do-gestor
        label: "Gestor do gestor (email — usado para aprovação adicional)"
        tipo: email
```

## 📌 Pós-criação

1. **Popular DB `funcionarios`** — sem ela, o auto-preenchimento de centro de custo e gestor não funciona. Importe via CSV ou conecte ao seu HRIS.
2. **Configurar lookup no Pipefy (UI)** — ao criar o card, faça uma automação nativa que popula `centro-custo` e `gestor` a partir do `funcionario` selecionado.
3. **Regra de aprovação adicional** — para `tipo-despesa = Viagem` E `valor-solicitado > {{ limite_aprov_adicional }}`, adicione manualmente via UI um aprovador extra (gestor-do-gestor da DB Funcionários). O template não automatiza por depender da hierarquia da sua empresa.
4. **Regra de fast-track** — para `valor-solicitado < {{ limite_fast_track }}` E `match-valor = OK`, considere mover direto para Pagamento sem passar por aprovação manual.
5. **Notificações por email** — configure manualmente via UI:
   - Alerta para o gestor ao card entrar em Aprovação Gestor.
   - Alerta interno para `{{ rh_email }}` quando SLA de aprovação estoura (5 dias).
   - Notificação ao solicitante quando o pagamento for efetuado.
6. **Membros do pipe** — adicione o time financeiro (escrita na fase Pagamento), gestores (escrita na fase Aprovação) e RH (leitura).
7. **Calibrar prompt do agente** — após 30-50 cards reais, ajuste as regras de política (categorias adicionais como uber/99, hospedagem fora do limite) editando o prompt do behavior.

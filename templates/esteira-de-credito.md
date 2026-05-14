---
id: esteira-de-credito
nome: Esteira de Crédito PJ
categoria: financeiro
versao: 1.2.0
schema_version: 1
descricao_curta: Esteira completa de crédito PJ (50k–5M) em 6 fases — originação, KYC, análise, comitê, formalização, desembolso. IA extrai documentos, classifica rating setorial e resume operações para o comitê. Inclui auto-move pós-análise, enriquecimento via ReceitaWS e webhook para core bancário.
autor: maurivan
tags: [credito, financeiro, pj, fintech, banco, kyc, comite-credito, ia]
icone: 💳
tempo_estimado_criacao: "~90 segundos"
requer_ai_agents: true
requer_database_tables: true
fases_count: 6
campos_count: 33
---

# Esteira de Crédito PJ

## 📖 Sobre este template

Esteira de concessão de crédito para Pessoa Jurídica (ticket médio R$ 50k–R$ 5M), modelada para times de Crédito de fintechs e bancos comerciais. Cobre o ciclo completo desde a originação até o desembolso, com pontos de IA reduzindo o trabalho manual nas fases de KYC, análise de risco e preparação do parecer de comitê.

**Indicado para:** fintechs de crédito PJ, mesas de crédito comercial, factorings, plataformas P2P-lending B2B.
**Não indicado para:** crédito PF/CDC (use template separado), financiamento imobiliário (necessita avaliação de garantias mais complexa), capital de giro automatizado em alto volume sem comitê (use uma esteira simplificada).

## 🎯 Resultados esperados

- **Tempo de ciclo** previsível: SLAs por fase com alertas automáticos.
- **Trabalho do analista reduzido** em ~30%: IA extrai dados de docs, classifica rating setorial e prepara resumo executivo.
- **Comitê informado**: cada operação chega ao comitê com resumo padronizado.
- **Compliance e auditoria**: cada decisão tem justificativa registrada na fase em que aconteceu.
- **Integração com core bancário**: desembolso dispara webhook automaticamente.

## ⚙️ Variáveis de criação

```yaml
variaveis:
  - nome: nome_do_pipe
    label: "Nome do pipe"
    tipo: string
    default: "Esteira de Crédito PJ"
    obrigatorio: true

  - nome: gestor_credito_email
    label: "Email do gestor de crédito (alertas internos)"
    tipo: email
    obrigatorio: true

  - nome: alcada_simples_brl
    label: "Alçada simples — valor máximo sem comitê estendido (BRL)"
    tipo: number
    default: 500000
    obrigatorio: true

  - nome: score_minimo
    label: "Score mínimo do bureau aceito sem exceção"
    tipo: number
    default: 600
    obrigatorio: true

  - nome: sla_total_dias
    label: "SLA total do ciclo (dias úteis)"
    tipo: number
    default: 15
    obrigatorio: true

  - nome: moeda
    label: "Moeda"
    tipo: select
    opcoes: [BRL, USD]
    default: BRL
    obrigatorio: true

  - nome: webhook_core_bancario_url
    label: "URL do webhook do core bancário (deixe em branco se não houver integração)"
    tipo: string
    default: ""
    obrigatorio: false

  - nome: webhook_core_bancario_token
    label: "Token de autorização do core bancário"
    tipo: string
    default: ""
    obrigatorio: false
```

## 🏗️ Estrutura do Pipe

```yaml
pipe:
  nome: "{{ nome_do_pipe }}"
  descricao: "Esteira de concessão de crédito PJ — originação ao desembolso"
  preferencias:
    icone: "💳"
    aiAgentsEnabled: true

  fases:
    - id: originacao
      nome: "Originação"
      ordem: 1
      done: false
      sla_dias: 1
      descricao: "Proposta inicial preenchida pelo parceiro originador ou direto pelo cliente."
      campos:
        - id: razao-social
          label: "Razão social"
          tipo: short_text
          obrigatorio: true
        - id: cnpj
          label: "CNPJ"
          tipo: cnpj
          obrigatorio: true
        - id: cnae
          label: "CNAE principal"
          tipo: short_text
          obrigatorio: true
        - id: valor-solicitado
          label: "Valor solicitado ({{ moeda }})"
          tipo: currency
          obrigatorio: true
        - id: prazo-meses
          label: "Prazo solicitado (meses)"
          tipo: number
          obrigatorio: true
        - id: finalidade
          label: "Finalidade do crédito"
          tipo: select
          opcoes: ["Capital de giro", "Expansão", "Máquinas e equipamentos", "Antecipação de recebíveis", "Outros"]
          obrigatorio: true
        - id: contato-nome
          label: "Nome do contato"
          tipo: short_text
          obrigatorio: true
        - id: contato-email
          label: "Email do contato"
          tipo: email
          obrigatorio: true
        - id: contato-telefone
          label: "Telefone do contato"
          tipo: phone
        - id: origem-lead
          label: "Origem do lead"
          tipo: select
          opcoes: ["Parceiro originador", "Direto", "Indicação", "Renovação"]

    - id: kyc-documentacao
      nome: "KYC e Documentação"
      ordem: 2
      done: false
      sla_dias: 3
      descricao: "Coleta e validação documental. IA extrai dados e identifica pendências."
      campos:
        - id: documentos
          label: "Documentos (contrato social, balanço, faturamento, CNDs, sócios)"
          tipo: attachment
          obrigatorio: true
        - id: kyc-status
          label: "Status do KYC"
          tipo: select
          opcoes: [Aprovado, Pendente, Reprovado]
        - id: pendencias-kyc
          label: "Pendências documentais"
          tipo: long_text
        - id: compliance-flag
          label: "Flag de compliance (PEP, sanções, restrições)?"
          tipo: yes_no

    - id: analise-credito
      nome: "Análise de Crédito"
      ordem: 3
      done: false
      sla_dias: 5
      descricao: "Análise financeira e setorial. IA preenche rating e sugere garantia se aplicável."
      campos:
        - id: score-bureau
          label: "Score do bureau (Serasa/Boa Vista)"
          tipo: number
          obrigatorio: true
        - id: faturamento-anual
          label: "Faturamento anual ({{ moeda }})"
          tipo: currency
          obrigatorio: true
        - id: endividamento-atual
          label: "Endividamento atual ({{ moeda }})"
          tipo: currency
        - id: rating-risco
          label: "Rating de risco (A-E)"
          tipo: select
          opcoes: [A, B, C, D, E]
        - id: garantia-exigida
          label: "Tipo de garantia exigida"
          tipo: select
          opcoes: ["Sem garantia", "Aval", "Fiança", "Alienação fiduciária", "Hipoteca", "Recebíveis"]
        - id: valor-garantia
          label: "Valor da garantia ({{ moeda }})"
          tipo: currency
        - id: parecer-credito
          label: "Parecer de crédito (analista)"
          tipo: long_text

    - id: comite
      nome: "Comitê de Crédito"
      ordem: 4
      done: false
      sla_dias: 3
      descricao: "Comitê decide a operação. IA prepara resumo executivo na entrada."
      campos:
        - id: resumo-comite
          label: "Resumo executivo para o comitê"
          tipo: long_text
        - id: decisao-comite
          label: "Decisão do comitê"
          tipo: select
          opcoes: ["Aprovado", "Aprovado com restrições", "Rejeitado"]
          obrigatorio: true
        - id: justificativa-excecao
          label: "Justificativa da exceção / restrições aplicadas"
          tipo: long_text
        - id: motivo-rejeicao
          label: "Motivo da rejeição"
          tipo: long_text
        - id: limite-aprovado
          label: "Limite aprovado ({{ moeda }})"
          tipo: currency
        - id: taxa-juros-mensal
          label: "Taxa de juros mensal (%)"
          tipo: number

    - id: formalizacao
      nome: "Formalização"
      ordem: 5
      done: false
      sla_dias: 2
      descricao: "Contrato e garantias formalizados antes do desembolso."
      campos:
        - id: contrato-assinado
          label: "Contrato assinado"
          tipo: attachment
        - id: garantia-formalizada
          label: "Garantia formalizada?"
          tipo: yes_no
        - id: data-formalizacao
          label: "Data da formalização"
          tipo: date

    - id: desembolso
      nome: "Desembolso"
      ordem: 6
      done: true
      descricao: "Liberação efetiva dos recursos. Webhook notifica o core bancário."
      campos:
        - id: data-desembolso
          label: "Data do desembolso"
          tipo: date
        - id: conta-credito
          label: "Conta de crédito (banco / agência / conta)"
          tipo: short_text
        - id: valor-desembolsado
          label: "Valor desembolsado ({{ moeda }})"
          tipo: currency
```

## 🏷️ Labels

```yaml
labels:
  - id: urgente
    nome: "Urgente"
    cor: "#E53935"
  - id: restricao-compliance
    nome: "Restrição de Compliance"
    cor: "#FB8C00"
  - id: renovacao
    nome: "Renovação"
    cor: "#1E88E5"
  - id: excecao-alcada
    nome: "Exceção de alçada"
    cor: "#8E24AA"
```

## 🔀 Condições de Campo

```yaml
condicoes_campo:
  - id: mostrar-valor-garantia
    fase: analise-credito
    campo_alvo: valor-garantia
    quando:
      campo: garantia-exigida
      operador: not_equals
      valor: "Sem garantia"
    acao: mostrar

  - id: mostrar-motivo-rejeicao
    fase: comite
    campo_alvo: motivo-rejeicao
    quando:
      campo: decisao-comite
      operador: equals
      valor: "Rejeitado"
    acao: mostrar

  - id: mostrar-justificativa-excecao
    fase: comite
    campo_alvo: justificativa-excecao
    quando:
      campo: decisao-comite
      operador: equals
      valor: "Aprovado com restrições"
    acao: mostrar
```

## 🔔 Automações

Três famílias:

- **Criáveis via API** — o `agentic-store` cria automaticamente. Usam `move_single_card` e `send_http_request`.
- **Não-automatizáveis (labels)** — Pipefy **não tem ação `add_label`** no catálogo de automation. As 4 labels (`urgente`, `restricao-compliance`, `renovacao`, `excecao-alcada`) ficam disponíveis para uso **manual** pelo analista.
- **Manuais (tipo email)** — a API GraphQL do Pipefy não expõe `createEmailTemplate`; ficam documentadas como intenção para o usuário configurar via UI após a criação do pipe.

```yaml
automacoes:
  # ─── Handoff entre fases (move_single_card) ──────────────────────────

  - id: auto-mover-comite-apos-parecer
    nome: "Mover para Comitê após parecer do analista"
    quando:
      evento: field_updated
      campo: parecer-credito
    entao:
      tipo: move_single_card
      fase_destino: comite

  # ─── Enriquecimento externo (send_http_request) ──────────────────────

  - id: enriquecer-cnpj-receitaws
    nome: "Buscar dados oficiais do CNPJ ao preencher campo CNPJ"
    quando:
      evento: field_updated
      campo: cnpj
    entao:
      tipo: send_http_request
      method: GET
      url: "https://www.receitaws.com.br/v1/cnpj/{{ card.cnpj }}"
      headers:
        Accept: "application/json"

  # ─── Notificações por email (criação manual via UI — ver §📧 Email Templates) ──

  - id: notificar-kyc-pendencias
    nome: "Notificar cliente ao entrar em KYC"
    quando:
      evento: card_moved_to_phase
      fase: kyc-documentacao
    entao:
      tipo: email
      para: "{{ card.contato-email }}"
      template: kyc-pendencias

  - id: notificar-aprovacao
    nome: "Notificar cliente ao ser aprovado (entrada em Formalização)"
    quando:
      evento: card_moved_to_phase
      fase: formalizacao
    entao:
      tipo: email
      para: "{{ card.contato-email }}"
      template: aprovacao-aprovada

  - id: notificar-rejeicao
    nome: "Notificar cliente quando rejeitado no comitê"
    quando:
      evento: field_updated
      campo: decisao-comite
      condicao: "card.decisao-comite == 'Rejeitado'"
    entao:
      tipo: email
      para: "{{ card.contato-email }}"
      template: aprovacao-rejeitada

  - id: notificar-desembolso
    nome: "Notificar cliente sobre desembolso realizado"
    quando:
      evento: card_moved_to_phase
      fase: desembolso
    entao:
      tipo: email
      para: "{{ card.contato-email }}"
      template: desembolso-realizado

  - id: alerta-sla-comite
    nome: "Alerta interno: comitê com SLA estourado"
    quando:
      evento: sla_based
      fase: comite
      tipo_sla: Expired
    entao:
      tipo: email
      para: "{{ gestor_credito_email }}"
      template: alerta-sla-comite
```

## 🧠 AI Agents

```yaml
ai_agents:
  - id: assistente-credito
    nome: "Assistente de Crédito"
    instruction: |
      Você é um analista júnior de crédito PJ que apoia o time em três tarefas
      específicas: triagem documental no KYC, classificação de rating de risco
      após o score do bureau, e preparação do resumo executivo para o comitê.
      Seja factual, conservador na atribuição de rating e nunca tome a decisão
      final — apenas forneça insumos. Cite explicitamente os campos do card
      que você usou para fundamentar cada saída.

    behaviors:
      - nome: "Triagem documental no KYC"
        trigger: card_moved
        evento_params:
          em_fase: kyc-documentacao
        prompt: |
          O card entrou em KYC. Os documentos estão anexados em "documentos".

          Tarefas:
          1. Identifique quais documentos foram enviados (contrato social, balanço,
             faturamento, CNDs federais/estaduais, certidão de sócios, RG/CPF dos sócios).
          2. Liste em bullet points o que está faltando ou está vencido.
          3. Se identificar flags de compliance (sócio PEP, restrição em CND, sanção),
             marque "compliance-flag" como sim e detalhe em "pendencias-kyc".
          4. Marque "kyc-status" como Aprovado, Pendente ou Reprovado com base na completude.

        acoes:
          - tipo: update_card
            campos:
              - id: pendencias-kyc
                modo: fill_with_ai
              - id: kyc-status
                modo: fill_with_ai
              - id: compliance-flag
                modo: fill_with_ai

      - nome: "Classificação de rating de risco"
        trigger: field_updated
        evento_params:
          campo: score-bureau
        prompt: |
          O score do bureau foi atualizado. Classifique o rating de risco da
          operação combinando:
          - Score do bureau (campo "score-bureau")
          - Faturamento anual (campo "faturamento-anual")
          - Endividamento atual (campo "endividamento-atual")
          - CNAE (campo "cnae") — consulte a table "setores_risco" para o rating setorial
          - Valor solicitado vs faturamento (proporção)

          Régua sugerida:
          - Score < {{ score_minimo }} → rating D ou E (alto risco)
          - Score >= {{ score_minimo }} e faturamento compatível → A, B ou C
          - Penalize 1 nível se endividamento > 50% do faturamento
          - Penalize 1 nível se setor for D ou E na table de setores_risco

          Preencha "rating-risco" (A/B/C/D/E) e, se rating D/E, sugira "garantia-exigida".

        acoes:
          - tipo: update_card
            campos:
              - id: rating-risco
                modo: fill_with_ai
              - id: garantia-exigida
                modo: fill_with_ai

      - nome: "Resumo executivo para o comitê"
        trigger: card_moved
        evento_params:
          em_fase: comite
        prompt: |
          O card entrou no Comitê. Prepare um resumo executivo objetivo em até
          8 bullet points para apoiar a decisão:

          1. Operação: razão social, CNPJ, valor solicitado, prazo, finalidade
          2. Cliente: faturamento, endividamento, origem do lead
          3. Análise: score, rating de risco, parecer do analista
          4. Garantias: tipo proposto e cobertura
          5. Riscos identificados: flag de compliance, pendências de KYC residuais
          6. Recomendação implícita: dentro da alçada simples ({{ alcada_simples_brl }})
             ou requer exceção?

          Preencha "resumo-comite". Seja factual, sem opinião.

        acoes:
          - tipo: update_card
            campos:
              - id: resumo-comite
                modo: fill_with_ai
```

## 🗄️ Database Tables

```yaml
database_tables:
  - id: setores_risco
    nome: "Setores de Risco"
    descricao: "Mapeamento CNAE → rating setorial usado pelo agente de classificação de risco"
    colunas:
      - id: cnae
        label: "CNAE"
        tipo: short_text
        obrigatorio: true
        unico: true
      - id: descricao
        label: "Descrição do setor"
        tipo: short_text
        obrigatorio: true
      - id: rating_setorial
        label: "Rating setorial"
        tipo: select
        opcoes: [A, B, C, D, E]
        obrigatorio: true
      - id: observacoes
        label: "Observações"
        tipo: long_text
```

## 📧 Email Templates

```yaml
email_templates:
  - id: kyc-pendencias
    nome: "KYC — solicitação de documentos"
    assunto: "Sua proposta de crédito {{ card.razao-social }} — documentos necessários"
    corpo: |
      Olá {{ card.contato-nome }},

      Recebemos sua proposta de crédito ({{ card.razao-social }} — CNPJ {{ card.cnpj }})
      no valor de {{ card.valor-solicitado }} pelo prazo de {{ card.prazo-meses }} meses.

      Para dar continuidade, precisamos dos seguintes documentos:
      - Contrato social atualizado
      - Balanço dos últimos 12 meses
      - Faturamento dos últimos 12 meses
      - CNDs federal, estadual, municipal, trabalhista e FGTS
      - Documento de identidade dos sócios

      Você pode anexá-los respondendo este email ou acessando: {{ card.url }}

      SLA: 3 dias úteis. Após esse prazo, a proposta entra em re-análise.
    de: "credito@suaempresa.com"

  - id: aprovacao-aprovada
    nome: "Crédito aprovado"
    assunto: "✅ Crédito aprovado — {{ card.razao-social }}"
    corpo: |
      Olá {{ card.contato-nome }},

      Temos uma boa notícia: o comitê aprovou a operação de crédito da {{ card.razao-social }}.

      Resumo:
      - Limite aprovado: {{ card.limite-aprovado }}
      - Taxa de juros: {{ card.taxa-juros-mensal }}% ao mês
      - Prazo: {{ card.prazo-meses }} meses
      - Garantia: {{ card.garantia-exigida }}

      O próximo passo é a formalização: enviaremos o contrato em até 1 dia útil.

      Acompanhe pelo link: {{ card.url }}
    de: "credito@suaempresa.com"

  - id: aprovacao-rejeitada
    nome: "Crédito não aprovado"
    assunto: "Sua proposta de crédito — {{ card.razao-social }}"
    corpo: |
      Olá {{ card.contato-nome }},

      Após análise do comitê, não foi possível aprovar a proposta de crédito da
      {{ card.razao-social }} neste momento.

      Motivo: {{ card.motivo-rejeicao }}

      Você pode reapresentar a proposta após 90 dias ou nos procurar para discutir
      alternativas. Estamos à disposição.
    de: "credito@suaempresa.com"

  - id: desembolso-realizado
    nome: "Desembolso efetuado"
    assunto: "💰 Crédito liberado — {{ card.razao-social }}"
    corpo: |
      Olá {{ card.contato-nome }},

      O valor de {{ card.valor-desembolsado }} foi liberado em {{ card.data-desembolso }}
      na conta {{ card.conta-credito }}.

      O primeiro vencimento da parcela será conforme contrato assinado. Em caso de
      dúvidas, responda este email.

      Obrigado pela parceria.
    de: "credito@suaempresa.com"

  - id: alerta-sla-comite
    nome: "Alerta interno — SLA do comitê estourado"
    assunto: "⚠️ Comitê: operação {{ card.razao-social }} parada há mais de {{ card.sla-fase }}"
    corpo: |
      Operação parada na fase Comitê além do SLA configurado.

      - Cliente: {{ card.razao-social }} (CNPJ {{ card.cnpj }})
      - Valor: {{ card.valor-solicitado }}
      - Rating: {{ card.rating-risco }}
      - Score: {{ card.score-bureau }}

      Acesse: {{ card.url }}
    de: "no-reply@suaempresa.com"
```

## 🪝 Webhooks

```yaml
webhooks:
  - id: notificar-core-bancario
    nome: "Notificar core bancário no desembolso"
    url: "{{ webhook_core_bancario_url }}"
    eventos:
      - card.move
    filtro:
      fase_destino: desembolso
    headers:
      Authorization: "Bearer {{ webhook_core_bancario_token }}"
      Content-Type: "application/json"
    payload_extra:
      operacao: "credito_pj"
      origem: "esteira-de-credito"
```

## 📌 Pós-criação

1. **Popular a table `setores_risco`** — sem ela, o behavior "Classificação de rating" do AI Agent não tem como puxar rating setorial. Cadastre pelo menos as 10-20 categorias CNAE mais relevantes do seu portfólio.
2. **Criar os 5 email templates via UI** (a API GraphQL do Pipefy não expõe `createEmailTemplate`) e em seguida criar as 5 automações tipo email no editor de automações:
   - `kyc-pendencias` · `aprovacao-aprovada` · `aprovacao-rejeitada` · `desembolso-realizado` · `alerta-sla-comite`
   - O conteúdo (assunto + corpo) está documentado em `## 📧 Email Templates` deste arquivo — copie de lá.
3. **Uso manual dos labels** — Pipefy não tem ação `add_label` no catálogo de automation, então os 4 labels criados (Urgente, Restrição de Compliance, Renovação, Exceção de alçada) ficam disponíveis para o analista aplicar manualmente. Critérios sugeridos:
   - **Urgente** — operações com prazo apertado ou cliente VIP.
   - **Restrição de Compliance** — aplicar quando `compliance-flag = Sim` for preenchido pela IA (visualizar no Kanban).
   - **Renovação** — aplicar quando `origem-lead = Renovação` no formulário inicial.
   - **Exceção de alçada** — aplicar quando `valor-solicitado > {{ alcada_simples_brl }}` na originação.
4. **Validar a automação de enriquecimento ReceitaWS** — o endpoint público tem rate limit (3 req/min). Em produção, use uma chave paga ou troque para outro provedor (Serasa, Boa Vista, Casa dos Dados).
5. **Validar a alçada simples** — o valor default de {{ alcada_simples_brl }} é conservador para fintechs em estágio inicial. Mesas mais maduras costumam operar com alçada por matriz (rating × valor).
6. **Webhook do core bancário**:
   - Se você ainda não tem integração com o core, deixe `webhook_core_bancario_url` em branco — o webhook não será criado.
   - Quando integrar, configure o endpoint para validar o `X-Pipefy-Signature` e tratar o payload como **comando idempotente** (Pipefy faz retry em falhas).
   - O Pipefy envia todos os campos do card no payload por default; restrinja no consumidor para `valor-desembolsado`, `cnpj`, `data-desembolso`, `conta-credito`.
7. **Calibrar os prompts da IA** após as primeiras 20-30 operações reais — especialmente o behavior de rating, que se beneficia muito de ajuste de régua com base no portfólio real.
8. **Membros do pipe**: adicione manualmente o time de analistas (acesso de escrita), comitê (leitura + decisão na fase Comitê), formalização (escrita na fase Formalização) e financeiro (escrita na fase Desembolso).
9. **Considere conectar com pipes irmãos** (post-MVP): "Cobrança" para inadimplência, "Renovação" para clientes recorrentes, "Originação Parceiros" para esteira de leads.

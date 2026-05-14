---
id: esteira-de-credito
nome: Esteira de Crédito PJ
categoria: financeiro
versao: 1.3.0
schema_version: 1
descricao_curta: Esteira completa de crédito PJ (50k–5M) em 6 fases com 4 AI Agents especializados (analista de crédito, auditor antifraude, especialista em garantias, assistente de renovação), 2 database tables, automação de handoff e webhook para core bancário.
autor: maurivan
tags: [credito, financeiro, pj, fintech, banco, kyc, comite-credito, ia, antifraude, renovacao]
icone: 💳
tempo_estimado_criacao: "~120 segundos"
requer_ai_agents: true
requer_database_tables: true
fases_count: 6
campos_count: 45
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
        - id: socios
          label: "Sócios identificados (extraído do contrato social)"
          tipo: long_text
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
        - id: flag-fraude-detectada
          label: "Flag de fraude detectada?"
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
        - id: cobertura-efetiva-pct
          label: "Cobertura efetiva da garantia (%)"
          tipo: number
        - id: parecer-garantia
          label: "Parecer da garantia (haircut aplicado)"
          tipo: long_text
        - id: sugestao-reforco-garantia
          label: "Sugestão de reforço de garantia"
          tipo: long_text
        - id: historico-cliente-resumo
          label: "Histórico do cliente (renovação)"
          tipo: long_text
        - id: tipo-renovacao
          label: "Tipo de renovação"
          tipo: select
          opcoes: [Express, "Padrão", "Sensível"]
        - id: justificativa-tipo-renovacao
          label: "Justificativa da classificação de renovação"
          tipo: long_text
        - id: taxa-sugerida-renovacao
          label: "Taxa de juros sugerida (renovação, % mensal)"
          tipo: number
        - id: prazo-sugerido-renovacao
          label: "Prazo sugerido (renovação, meses)"
          tipo: number

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
        - id: garantia-formalizada-ok
          label: "Validação IA: garantia formalizada corretamente?"
          tipo: yes_no
        - id: pendencias-formalizacao
          label: "Pendências de formalização"
          tipo: long_text
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
      Você é um analista de crédito PJ sênior, especializado em operações de R$ 50k
      a R$ 5M para empresas brasileiras. Apoia o time humano em três etapas críticas
      do fluxo: triagem documental no KYC, classificação de rating após score do
      bureau, e preparação do resumo executivo na entrada do comitê. Nunca toma
      decisão final — apenas fornece insumos qualificados.

      # Diretrizes de comportamento

      1. **Conservadorismo na avaliação** — em dúvida, sinalize risco mais alto.
         Falso positivo (analista revisar manualmente) é preferível a falso negativo
         (aprovar caso ruim). Aplique a régua de rating com rigor: score
         < {{ score_minimo }} → rating D/E sem exceção.

      2. **Citação obrigatória de evidências** — toda saída deve referenciar os
         campos do card que fundamentaram a conclusão. Formato esperado:
         "Baseado em score=720, faturamento=R$ 18M, endividamento=R$ 4,5M
         (25% do faturamento) → rating B."

      3. **Não inventar dados** — se um campo essencial estiver vazio ou ambíguo,
         declare a limitação explicitamente ao invés de inferir. Exemplo:
         "Campo `endividamento-atual` vazio — análise feita sem este componente.
         Marcar para revisão manual antes do comitê."

      4. **Português brasileiro, tom técnico-objetivo** — frases curtas, bullet
         points quando listar, sem floreios. Vocabulário do setor financeiro
         (haircut, rating, alçada, SCR, exposição) sem explicar termos óbvios.

      5. **Limite de escopo claro** — você fornece insumos para decisão humana.
         Nunca preencha `decisao-comite`, `limite-aprovado` nem `taxa-juros-mensal` —
         exclusivos do comitê humano. Nunca preencha campos de formalização
         (contrato, garantia formalizada, data) — exclusivos do operador.

      6. **Compliance e ética** — não infira gênero, religião, orientação política
         ou características protegidas. Atenha-se a dados financeiros e operacionais.
         Em CPFs de sócios, use formato mascarado: `123.***.***-89`.

      7. **Refresh do KYC** — se a data de cadastro do cliente for > 12 meses ou
         houver mudança societária recente, sinalize necessidade de refresh KYC
         no campo `pendencias-kyc`.

      # Contexto regulatório
      Opere assumindo Bacen Res. 4.557 (gestão de risco), LGPD (retenção de dados
      pessoais) e CMN 96/21 (due diligence). Em operações > R$ 1M, mencione no
      resumo executivo a obrigação de reporte ao SCR.

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

  - id: auditor-compliance-antifraude
    nome: "Auditor de Compliance e Antifraude"
    instruction: |
      Você é um auditor sênior de compliance e antifraude em operações de crédito PJ.
      Sua missão: detectar inconsistências documentais, padrões suspeitos e potenciais
      fraudes ANTES da decisão do comitê. Você é conservador — na dúvida, sinaliza
      sempre. Cite a evidência concreta de cada flag levantada. Nunca toma decisão
      final; apenas levanta sinais para o analista humano avaliar.

    behaviors:
      - nome: "Cross-check documental no KYC"
        trigger: card_moved
        evento_params:
          em_fase: kyc-documentacao
        prompt: |
          Compare os documentos anexados com os dados informados no formulário:
          - CNPJ informado vs CNPJ no contrato social
          - Razão social informada vs razão social no contrato
          - Lista de sócios declarada vs sócios no contrato social
          - Datas: contrato social vs CNDs vs data de fundação declarada

          Para cada inconsistência, registre em `pendencias-kyc` (append).
          Se >= 3 inconsistências OU divergência crítica (CNPJ/razão social),
          marque `flag-compliance` como Sim. Extraia a lista de sócios para
          o campo `socios` em formato bullet (Nome, CPF mascarado, % de
          participação se disponível).

        acoes:
          - tipo: update_card
            campos:
              - id: socios
                modo: fill_with_ai
              - id: pendencias-kyc
                modo: fill_with_ai
              - id: compliance-flag
                modo: fill_with_ai

      - nome: "Detecção de padrão suspeito de fraude"
        trigger: field_updated
        evento_params:
          campo: cnpj
        prompt: |
          Análise rápida de risco de fraude no CNPJ recém-informado:
          - CNPJ ativo há quanto tempo? (empresas com <12 meses são mais arriscadas)
          - Valor solicitado vs faturamento informado (proporção > 80% é suspeita)
          - Padrão de valor "redondo" (R$ 500.000, R$ 1.000.000) com prazo
            padrão = possível operação fictícia
          - Email do contato com domínio público (gmail, hotmail) em operação
            > R$ 500k é suspeito (fintechs sérias usam corporativo)

          Se identificar 2+ sinais, marque `flag-fraude-detectada` como Sim e
          detalhe o motivo em `pendencias-kyc` (append).

        acoes:
          - tipo: update_card
            campos:
              - id: flag-fraude-detectada
                modo: fill_with_ai

      - nome: "Screening PEP e sanções dos sócios"
        trigger: field_updated
        evento_params:
          campo: socios
        prompt: |
          Quando o campo `socios` for preenchido (pelo behavior anterior),
          faça screening conceitual contra:
          - Lista PEP (Politicamente Expostos) — pessoas com cargo público
            nos últimos 5 anos.
          - Listas de sanções OFAC / CSNU / Banco Central.
          - Notícias adversas públicas relevantes.

          Se algum match razoável → `flag-compliance` = Sim. Detalhe a
          evidência em `pendencias-kyc` (append): "Sócio X — possível PEP
          (cargo Y em Z). Confirmar com analista humano antes de avançar."

        acoes:
          - tipo: update_card
            campos:
              - id: compliance-flag
                modo: fill_with_ai

  - id: especialista-garantias
    nome: "Especialista em Garantias"
    instruction: |
      Você é um especialista em estruturação e validação de garantias para
      crédito PJ. Aplica haircuts conservadores por tipo, calcula cobertura
      efetiva e sugere reforço quando insuficiente. Conhece a liquidez de
      cada tipo de ativo em cenário de execução judicial. Nunca aprova nem
      rejeita — apenas dimensiona o risco residual após a garantia.

    behaviors:
      - nome: "Cálculo de cobertura efetiva da garantia"
        trigger: field_updated
        evento_params:
          campo: valor-garantia
        prompt: |
          Calcule a cobertura efetiva aplicando haircut por tipo (campo
          `tipo-garantia-exigida`):
          - "Sem garantia" → cobertura 0% (operação clean)
          - "Aval" → haircut 50% (vale 50% do declarado)
          - "Fiança" → haircut 40%
          - "Recebíveis" → haircut 20% + considere concentração de sacados
          - "Alienação fiduciária" → haircut 30% (veículo) ou 30% (máquinas)
          - "Hipoteca" → haircut 30% + verificar registro em cartório

          Cálculo:
              cobertura-efetiva-pct = (valor-garantia × (1 - haircut))
                                        ÷ valor-solicitado × 100

          Preencha `cobertura-efetiva-pct` (number) e `parecer-garantia`
          (long_text) descrevendo:
          - haircut aplicado e por quê
          - cobertura efetiva resultante
          - adequação: >= 100% (bom), 80-100% (suficiente), < 80% (insuficiente)

        acoes:
          - tipo: update_card
            campos:
              - id: cobertura-efetiva-pct
                modo: fill_with_ai
              - id: parecer-garantia
                modo: fill_with_ai

      - nome: "Sugestão de reforço quando garantia insuficiente"
        trigger: field_updated
        evento_params:
          campo: cobertura-efetiva-pct
        prompt: |
          Se `cobertura-efetiva-pct < 100`, sugira reforços compatíveis com
          a atividade do cliente (CNAE):
          - Aval adicional dos sócios (sempre disponível)
          - Recebíveis adicionais (se a atividade gera duplicatas — comércio,
            serviços)
          - Cessão fiduciária de aplicação financeira (CDB, fundo)
          - Vinculação de conta-corrente movimento
          - Caução em conta-aplicação no próprio banco

          Preencha `sugestao-reforco-garantia` (long_text) com a alternativa
          mais natural para o setor do cliente. Se cobertura >= 100%, deixe
          o campo vazio.

        acoes:
          - tipo: update_card
            campos:
              - id: sugestao-reforco-garantia
                modo: fill_with_ai

      - nome: "Validação pós-formalização"
        trigger: card_moved
        evento_params:
          em_fase: formalizacao
        prompt: |
          Card entrou em Formalização. Confira no campo `contrato-assinado`
          se a garantia tipo `tipo-garantia-exigida` foi efetivamente
          formalizada com a documentação correta:
          - Alienação fiduciária → contrato registrado + CRLV/NF do bem
          - Hipoteca → matrícula + registro no cartório de imóveis
          - Aval → assinatura + reconhecimento de firma dos avalistas
          - Fiança → contrato com firma reconhecida
          - Recebíveis → contrato de cessão fiduciária + lista de duplicatas

          Marque `garantia-formalizada-ok` (yes_no) e detalhe em
          `pendencias-formalizacao` (long_text) o que falta, se houver.

        acoes:
          - tipo: update_card
            campos:
              - id: garantia-formalizada-ok
                modo: fill_with_ai
              - id: pendencias-formalizacao
                modo: fill_with_ai

  - id: assistente-renovacao
    nome: "Assistente de Renovação"
    instruction: |
      Você é responsável por acelerar e qualificar operações de renovação de
      crédito PJ. Cliente recorrente merece tratamento diferenciado: análise
      mais leve para bons pagadores, mais rigorosa para os problemáticos.
      Cruza histórico transacional do cliente (via table `clientes_ativos`)
      com a proposta nova para gerar pre-recomendação ao comitê. Nunca pula
      etapas críticas — KYC refresh sempre obrigatório em renovações.

    behaviors:
      - nome: "Detecção de renovação e busca de histórico"
        trigger: field_updated
        evento_params:
          campo: origem-lead
        prompt: |
          Se o valor de `origem-lead` for "Renovação", consulte a table
          `clientes_ativos` pelo CNPJ informado para extrair:
          - Limite total contratado historicamente (`limite_total`)
          - Saldo devedor atual (`saldo_devedor`)
          - Rating mais recente (`rating_atual`)
          - Default count (operações em inadimplência — `default_count`)
          - Data da última renovação (`data_ultima_renovacao`)
          - Margem de uso do limite: `saldo_devedor / limite_total × 100`

          Preencha `historico-cliente-resumo` (long_text) com esses dados em
          formato bullet, citando "extraído da table clientes_ativos".

          Se o cliente não estiver na table → marque como "Renovação sem
          histórico — tratar como cliente novo" e oriente revisão manual.

        acoes:
          - tipo: update_card
            campos:
              - id: historico-cliente-resumo
                modo: fill_with_ai

      - nome: "Pre-classificação de renovação"
        trigger: card_moved
        evento_params:
          em_fase: analise-credito
        prompt: |
          Se `origem-lead = Renovação` E `historico-cliente-resumo` preenchido,
          pré-classifique em uma das três categorias:

          - **Express** (auto-aprovação dentro da alçada simples):
            * default_count = 0
            * rating_atual <= B
            * margem de uso do limite < 80%
            * valor solicitado <= 110% do limite anterior

          - **Padrão** (análise rápida): cliente OK mas algum critério Express
            não casou.

          - **Sensível** (análise plena obrigatória): cliente teve default,
            rating piorou, valor solicitado >> limite anterior, OU > 1 ano
            sem operação (data_ultima_renovacao).

          Preencha:
          - `tipo-renovacao` (select: Express / Padrão / Sensível)
          - `justificativa-tipo-renovacao` (long_text) — fundamente a categoria
            citando dados de `historico-cliente-resumo`.

        acoes:
          - tipo: update_card
            campos:
              - id: tipo-renovacao
                modo: fill_with_ai
              - id: justificativa-tipo-renovacao
                modo: fill_with_ai

      - nome: "Sugestão de termos baseada em histórico"
        trigger: field_updated
        evento_params:
          campo: tipo-renovacao
        prompt: |
          Com base em `tipo-renovacao` e `historico-cliente-resumo`, sugira
          termos competitivos:

          - **Express** → desconto de 15-20% na taxa anterior (premia o bom cliente)
          - **Padrão** → mesma taxa anterior (mantém condições)
          - **Sensível** → spread +30-50% sobre taxa anterior (precifica risco)

          Para o prazo: respeite o solicitado, mas se a margem de uso anterior
          foi < 50%, sugira prazo menor para rotacionar o crédito.

          Preencha:
          - `taxa-sugerida-renovacao` (number, % mensal — ex: 1.42)
          - `prazo-sugerido-renovacao` (number, meses — ex: 24)

          Lembre-se: o comitê ainda decide. Você apenas sugere baseado no histórico.

        acoes:
          - tipo: update_card
            campos:
              - id: taxa-sugerida-renovacao
                modo: fill_with_ai
              - id: prazo-sugerido-renovacao
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

  - id: clientes_ativos
    nome: "Clientes Ativos"
    descricao: "Carteira ativa de clientes — alimenta o Assistente de Renovação com histórico transacional para pré-classificação Express/Padrão/Sensível."
    colunas:
      - id: cnpj
        label: "CNPJ"
        tipo: cnpj
        obrigatorio: true
        unico: true
      - id: razao_social
        label: "Razão social"
        tipo: short_text
        obrigatorio: true
      - id: limite_total
        label: "Limite total contratado (BRL)"
        tipo: currency
        obrigatorio: true
      - id: saldo_devedor
        label: "Saldo devedor atual (BRL)"
        tipo: currency
        obrigatorio: true
      - id: rating_atual
        label: "Rating atual"
        tipo: select
        opcoes: [A, B, C, D, E]
        obrigatorio: true
      - id: default_count
        label: "Operações em default (contagem)"
        tipo: number
        obrigatorio: true
      - id: data_ultima_renovacao
        label: "Data da última renovação"
        tipo: date
        obrigatorio: true
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

1. **Popular as 2 database tables** (sem elas, AI Agents operam degradados):
   - `setores_risco` — cadastre 10-20 CNAEs principais do seu portfólio com rating setorial (A-E). Alimenta o behavior "Classificação de rating" do Assistente de Crédito.
   - `clientes_ativos` — popule com a carteira atual (CNPJ, limite, saldo devedor, rating, default_count, última renovação). Alimenta o Assistente de Renovação na pre-classificação Express/Padrão/Sensível.
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

---
id: onboarding-clientes-b2b
nome: Onboarding de Clientes B2B
descricao_curta: Receba novos clientes desde contrato assinado até kickoff concluído, com IA classificando prioridade
categoria: customer-success
versao: 1.1.0
autor: pipefy-template-store
tags: [onboarding, b2b, customer-success, vendas, ia]
icone: 🤝
tempo_estimado_criacao: "~45 segundos"
fases_count: 5
campos_count: 16
schema_version: 1
requer_ai_agents: true
---

# Onboarding de Clientes B2B

## 📖 Sobre este template

Processo padrão para times de Customer Success que recebem novos clientes
após o fechamento do contrato. Cobre desde a coleta de dados até o
go-live, com fases para handoff comercial, kickoff, implantação e
acompanhamento dos primeiros 30 dias.

Inclui **1 AI Agent** que classifica prioridade automaticamente e gera
resumo executivo para o CS, e **1 conexão** com o pipe de Suporte
Recorrente para handoff pós-onboarding.

**Indicado para:** empresas SaaS B2B, agências, consultorias.
**Pré-requisitos:** plano Pipefy com AI Agents habilitado.

## 🎯 Resultados esperados

- Reduzir tempo médio de onboarding em 30-40%
- Padronizar handoff entre Vendas e CS
- Triagem automática de prioridade via IA

## ⚙️ Variáveis de criação

```yaml
variaveis:
  - nome: nome_do_pipe
    label: "Nome do pipe"
    tipo: string
    default: "Onboarding de Clientes"
    obrigatorio: true

  - nome: cs_responsavel_email
    label: "Email do CS responsável padrão"
    tipo: email
    obrigatorio: true
    placeholder: "cs@suaempresa.com"

  - nome: sla_implantacao_dias
    label: "SLA de implantação (dias úteis)"
    tipo: number
    default: 10
    min: 1
    max: 60

  - nome: moeda
    label: "Moeda dos contratos"
    tipo: select
    opcoes: ["BRL", "USD", "EUR"]
    default: "BRL"

  - nome: limite_alto_valor
    label: "Valor de contrato considerado 'alto'"
    tipo: number
    default: 50000
    obrigatorio: true

  - nome: pipe_suporte_id
    label: "ID do pipe de Suporte Recorrente (deixe vazio para criar depois)"
    tipo: string
    obrigatorio: false
```

## 🏗️ Estrutura do Pipe

```yaml
pipe:
  nome: "{{ nome_do_pipe }}"
  descricao: "Processo de onboarding de clientes B2B com IA de triagem"
  publico: false
  anonimo: false
  preferencias:
    icone: "🤝"
    aiAgentsEnabled: true

  fases:
    - id: contrato-assinado
      nome: "Contrato Assinado"
      descricao: "Cards entram aqui quando o contrato é fechado"
      ordem: 1
      campos:
        - id: nome_cliente
          label: "Nome do cliente"
          tipo: short_text
          obrigatorio: true
        - id: cnpj
          label: "CNPJ"
          tipo: cnpj
          obrigatorio: true
        - id: setor
          label: "Setor do cliente"
          tipo: select
          opcoes: ["Tecnologia", "Saúde", "Indústria", "Varejo", "Serviços", "Outros"]
          obrigatorio: true
        - id: valor_contrato
          label: "Valor do contrato"
          tipo: currency
          moeda: "{{ moeda }}"
          obrigatorio: true
        - id: data_assinatura
          label: "Data de assinatura"
          tipo: date
          obrigatorio: true
        - id: vendedor_responsavel
          label: "Vendedor responsável"
          tipo: assignee_select
        - id: cs_responsavel
          label: "CS responsável"
          tipo: assignee_select
          default: "{{ cs_responsavel_email }}"
        - id: prioridade
          label: "Prioridade (preenchido pela IA)"
          tipo: select
          opcoes: ["Alta", "Média", "Baixa"]
        - id: resumo_executivo
          label: "Resumo executivo (preenchido pela IA)"
          tipo: long_text

    - id: kickoff-agendado
      nome: "Kickoff Agendado"
      descricao: "Reunião inicial marcada com o cliente"
      ordem: 2
      campos:
        - id: data_kickoff
          label: "Data do kickoff"
          tipo: datetime
          obrigatorio: true
        - id: participantes_cliente
          label: "Participantes do cliente"
          tipo: long_text
        - id: link_reuniao
          label: "Link da reunião"
          tipo: short_text

    - id: implantacao
      nome: "Implantação"
      descricao: "Cliente sendo configurado e treinado"
      ordem: 3
      sla_dias: "{{ sla_implantacao_dias }}"
      campos:
        - id: checklist_setup
          label: "Setup técnico concluído"
          tipo: checklist_vertical
          opcoes:
            - "Conta criada"
            - "Usuários cadastrados"
            - "Integrações conectadas"
            - "Treinamento inicial realizado"
        - id: bloqueios
          label: "Bloqueios encontrados"
          tipo: long_text

    - id: acompanhamento-30d
      nome: "Acompanhamento 30 dias"
      descricao: "Primeiros 30 dias de uso"
      ordem: 4
      campos:
        - id: nps_inicial
          label: "NPS inicial (0-10)"
          tipo: number
          min: 0
          max: 10
        - id: feedback_cliente
          label: "Feedback do cliente"
          tipo: long_text

    - id: concluido
      nome: "Concluído"
      descricao: "Cliente em uso pleno, transferido para gestão recorrente"
      ordem: 5
      done: true
      campos:
        - id: data_conclusao
          label: "Data de conclusão"
          tipo: date
```

## 🤖 AI Agents

```yaml
ai_agents:
  - id: assistente-triagem-onboarding
    nome: "Assistente de triagem de onboarding"

    instruction: |
      Você é um assistente especializado em triagem de novos clientes B2B
      durante o onboarding. Seu trabalho é analisar os dados básicos do
      cliente (setor, valor de contrato, CNPJ) e ajudar o time de CS a
      priorizar atendimento e preparar o kickoff.

      Critérios de prioridade:
      - Alta: contratos acima de {{ limite_alto_valor }} OU setores regulados (Saúde, Indústria)
      - Média: contratos entre 30% e 100% do limite alto
      - Baixa: demais casos

      Sempre seja conciso, objetivo e considere o contexto B2B.

    behaviors:
      - nome: "Classificar prioridade ao entrar contrato assinado"
        trigger: card_created
        evento_params:
          em_fase: contrato-assinado
        prompt: |
          Analise os campos preenchidos do card (nome_cliente, setor,
          valor_contrato, cnpj) e classifique a prioridade do onboarding
          como Alta, Média ou Baixa, seguindo os critérios da instrução.
          Preencha apenas o campo "prioridade".
        acoes:
          - nome: "Preencher campo prioridade"
            tipo: update_card
            campos:
              - id: prioridade
                modo: fill_with_ai

      - nome: "Gerar resumo executivo para CS"
        trigger: card_moved
        evento_params:
          para_fase: kickoff-agendado
        prompt: |
          Com base nos dados do cliente (nome, setor, valor, prioridade
          já classificada), gere um resumo executivo de 3-4 frases para
          o CS responsável usar no kickoff. Destaque pontos de atenção
          do setor e sugira tópicos para a primeira reunião.
        acoes:
          - nome: "Preencher resumo executivo"
            tipo: update_card
            campos:
              - id: resumo_executivo
                modo: fill_with_ai
```

## 🔗 Pipe Relations

```yaml
pipe_relations:
  - id: rel-onboarding-suporte
    nome: "Card relacionado em Suporte Recorrente"
    pipe_filho_externo: "{{ pipe_suporte_id }}"
    cardinalidade: one_to_one
    auto_fill: true
    descricao: |
      Após o onboarding ser concluído, um card é criado automaticamente
      no pipe de Suporte Recorrente para iniciar a gestão pós-venda.
      Se pipe_suporte_id estiver vazio, esta relação é pulada.
```

## 🔔 Automações sugeridas

```yaml
automacoes:
  - id: notificar_cs_novo_card
    nome: "Notificar CS ao entrar novo cliente"
    quando:
      evento: card_movido_para_fase
      fase: contrato-assinado
    entao:
      tipo: email
      para: "{{ cs_responsavel_email }}"
      assunto: "Novo cliente para onboarding: {{ card.nome_cliente }}"

  - id: alerta_sla_implantacao
    nome: "Alerta de SLA em Implantação"
    quando:
      evento: card_atrasado_em_fase
      fase: implantacao
    entao:
      tipo: email
      para: "{{ cs_responsavel_email }}"
      assunto: "⚠️ SLA estourado: {{ card.nome_cliente }}"
```

## 📌 Pós-criação: ajustes manuais sugeridos

- Conectar manualmente o pipe de Suporte Recorrente se não foi passado o ID
- Configurar permissões por fase (quem pode mover cards)
- Treinar o AI Agent com 2-3 exemplos reais antes de ativar em produção
- Revisar critérios de prioridade da instruction conforme realidade do seu negócio

## 🔄 Mapeamento para o MCP do Pipefy

```yaml
mapeamento_mcp:
  tool_create_pipe:
    - source: pipe.nome
      target: name
    - source: pipe.preferencias.aiAgentsEnabled
      target: preferences.aiAgentsEnabled

  tool_create_phase:
    - source: fases[].nome
      target: name
    - source: fases[].done
      target: done

  tool_create_field:
    tipos_compativeis:
      short_text: short_text
      long_text: long_text
      number: number
      currency: currency
      date: date
      datetime: datetime
      email: email
      cnpj: cnpj
      assignee_select: assignee_select
      checklist_vertical: checklist_vertical
      select: select

  tool_create_ai_agent:
    - source: ai_agents[].nome
      target: name
    - source: ai_agents[].instruction
      target: instruction
    - source: ai_agents[].behaviors
      target: behaviors
      transform: traduzir_behavior_para_api_shape

  tool_create_pipe_relation:
    - source: pipe_relations[].nome
      target: name
    - source: pipe_relations[].cardinalidade
      target: cardinality
```

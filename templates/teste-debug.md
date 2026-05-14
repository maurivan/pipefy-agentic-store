---
id: teste-debug
nome: "Teste Debug — Personal To-do"
categoria: outros
versao: 1.0.0
schema_version: 1
descricao_curta: Template enxuto de to-do pessoal em 4 fases (Backlog → Em andamento → Revisão → Concluído) com SLA por fase e 1 AI Agent classificando prioridade automaticamente a partir do título e prazo.
autor: maurivan
tags: [todo, produtividade, pessoal, ia, sla, teste, debug]
icone: "✅"
tempo_estimado_criacao: "~30 segundos"
requer_ai_agents: true
---

# Teste Debug — Personal To-do

## 📖 Sobre este template

Template usado para teste/debug do pipeline do `agentic-store`. Modela um **to-do pessoal** simples em quatro fases, com SLA por fase, captura inicial via start form e um AI Agent leve que classifica prioridade automaticamente ao criar a task.

**Indicado para:** smoke test do fluxo de criação (pipe + fases + campos + 1 AI Agent + 1 automação), uso pessoal real, baseline para iterações de design.

## 🎯 Resultados esperados

- Captura rápida de itens via formulário enxuto (4 campos no start form).
- Priorização automática sem o usuário decidir manualmente — IA usa título, descrição e prazo.
- Visibilidade do que está em andamento, em revisão e concluído com SLA por fase.
- Trilha cronológica: data de criação, início, revisão e conclusão registradas.

## ⚙️ Variáveis de criação

```yaml
variaveis:
  - nome: nome_do_pipe
    label: "Nome do pipe"
    tipo: string
    default: "Meu To-Do"
    obrigatorio: true

  - nome: email_responsavel
    label: "Email do responsável (para alertas de SLA)"
    tipo: email
    obrigatorio: false

  - nome: sla_padrao_dias
    label: "Prazo padrão por fase (dias)"
    tipo: number
    default: 3
    obrigatorio: true
```

## 🏗️ Estrutura do Pipe

```yaml
pipe:
  nome: "{{ nome_do_pipe }}"
  descricao: "To-do pessoal — fluxo simples com priorização automática por IA."
  preferencias:
    icone: "✅"
    aiAgentsEnabled: true

  fases:
    - id: backlog
      nome: "Backlog"
      ordem: 1
      done: false
      sla_dias: "{{ sla_padrao_dias }}"
      descricao: "Captura inicial da task. Title + descrição + prazo são preenchidos no start form."
      campos:
        - id: titulo
          label: "Título da task"
          tipo: short_text
          obrigatorio: true
        - id: descricao
          label: "Descrição (o que precisa ser feito)"
          tipo: long_text
        - id: prazo
          label: "Prazo desejado"
          tipo: date
        - id: prioridade
          label: "Prioridade"
          tipo: select
          opcoes: [Alta, "Média", Baixa]

    - id: em-andamento
      nome: "Em andamento"
      ordem: 2
      done: false
      sla_dias: "{{ sla_padrao_dias }}"
      descricao: "Task pegada pelo responsável. Marca início e captura anotações de progresso."
      campos:
        - id: data-inicio
          label: "Data em que começou"
          tipo: date
        - id: anotacoes-progresso
          label: "Anotações de progresso"
          tipo: long_text
        - id: percentual-concluido
          label: "Percentual concluído (0-100)"
          tipo: number

    - id: revisao
      nome: "Revisão"
      ordem: 3
      done: false
      sla_dias: 1
      descricao: "Conferência final antes de fechar — checklist mental, ajustes de qualidade."
      campos:
        - id: anotacoes-revisao
          label: "Anotações da revisão"
          tipo: long_text
        - id: precisa-ajuste
          label: "Precisa ajuste?"
          tipo: radio_horizontal
          opcoes: [Sim, "Não"]

    - id: concluido
      nome: "Concluído"
      ordem: 4
      done: true
      descricao: "Task fechada. Registra data de conclusão e satisfação final."
      campos:
        - id: data-conclusao
          label: "Data da conclusão"
          tipo: date
        - id: satisfacao
          label: "Como foi?"
          tipo: select
          opcoes: [Tranquilo, "Deu trabalho", "Foi sofrido"]
```

## 🧠 AI Agents

```yaml
ai_agents:
  - id: priorizador
    nome: "Priorizador de Tasks"
    instruction: |
      Você classifica prioridade de tasks pessoais em Alta / Média / Baixa baseado em:
      - Proximidade do prazo (se < 2 dias: tendência Alta; entre 2-7 dias: Média; > 7 dias: Baixa)
      - Urgência implícita no título e descrição (palavras como "urgente", "asap", "deadline", "amanhã")
      - Complexidade aparente (tasks longas/complexas geralmente merecem Alta mesmo com prazo folgado)

      Seja conservador — quando em dúvida, sobe um nível. É melhor uma task levemente
      super-priorizada do que perder um prazo. Preencha apenas o campo `prioridade`.
      Nunca preencha outros campos.

    behaviors:
      - nome: "Classificar prioridade ao criar task"
        trigger: card_created
        evento_params:
          em_fase: backlog
        prompt: |
          Nova task entrou no Backlog. Avalie:
          - Título da task (`titulo`)
          - Descrição livre (`descricao`)
          - Prazo desejado (`prazo`) — calcule dias até o prazo a partir de hoje

          Classifique em Alta / Média / Baixa seguindo a régua:
          - Alta: prazo < 2 dias OU palavras-chave de urgência OU complexidade alta com prazo curto
          - Média: prazo 2-7 dias OU complexidade média
          - Baixa: prazo > 7 dias E sem sinais de urgência

          Preencha apenas `prioridade`.

        acoes:
          - tipo: update_card
            campos:
              - id: prioridade
                modo: fill_with_ai
```

## 📌 Pós-criação

1. **SLA por fase**: já vem configurado via `sla_dias` em cada fase (variável `{{ sla_padrao_dias }}`, default 3). O Pipefy mostra contagem regressiva e marca o card visualmente quando passa do prazo — **funciona sozinho, não precisa de nada extra**. Revisão já vem com SLA fixo de 1 dia.
2. **(Opcional) Notificação por email quando SLA estoura**: se quiser que o `email_responsavel` receba um email automático, crie um email template pela UI do Pipefy + uma automação `sla_based` apontando pra ele. A API não cria email templates, então essa parte é manual. **Alternativa sem email**: usar `update_card_field` ou `move_single_card` na automação `sla_based` (essas não dependem de template e podem ser criadas via API).
3. **Calibração do AI Agent**: após as primeiras 10-15 tasks, revise se a classificação está alinhada com seu critério pessoal. A régua no prompt assume contexto profissional padrão; ajuste se você tem perfil mais ou menos conservador.
4. **Categoria**: cadastrado como `outros` porque o repo não tem categoria "produtividade" ainda. Se for criar mais templates do tipo (notas, hábitos, projetos pessoais), considere abrir categoria nova.

---
id: performance-review-routing
nome: Roteamento de Performance Review
descricao_curta: Ciclo trimestral de avaliação de performance (auto-avaliação, gestor, calibração, devolutiva) com sumarização leve de feedback por IA.
categoria: rh
versao: 1.0.0
schema_version: 1
autor: pipefy-template-store
tags: [rh, performance, avaliacao, feedback, ia]
icone: 📊
tempo_estimado_clonagem: "~35 segundos"
fases_count: 4
campos_count: 13
requer_ai_agents: true
requer_database_tables: false
---

# Roteamento de Performance Review

## 📊 Sobre este template

Pipe orquestra o ciclo trimestral de avaliação de performance em quatro fases sequenciais: auto-avaliação do funcionário, avaliação do gestor, calibração em comitê e devolutiva com plano de desenvolvimento. Cada fase tem SLA curto (7 dias úteis) para evitar arrasto de ciclo.

A IA aparece de forma minimalista: ao concluir os campos qualitativos, um sumarizador resume em três bullets os pontos principais do feedback acumulado. Sem julgamento, sem inferência — só compressão de texto para acelerar a leitura na devolutiva.

## 🎯 Resultados esperados

- Ciclos de performance fechados em até 30 dias úteis, sem arrasto entre trimestres.
- Comitê de calibração trabalha com sumário consistente, não com textos longos dispersos.
- Diff automatizado entre score auto e score gestor sinaliza casos para calibração obrigatória.
- Trilha de auditoria por ciclo para diretoria de RH e business partner.

## ⚙️ Variáveis de clonagem

```yaml
variaveis:
  - nome: nome_do_pipe
    label: "Nome do pipe"
    tipo: string
    default: "Performance Review"
    obrigatorio: true

  - nome: rh_business_partner_email
    label: "Email do RH business partner do ciclo"
    tipo: email
    obrigatorio: true

  - nome: ciclo_atual
    label: "Identificador do ciclo (ex: Q2-2026)"
    tipo: string
    default: "Q2-2026"
    obrigatorio: true

  - nome: diff_calibracao
    label: "Diff de score (auto vs gestor) que força calibração"
    tipo: number
    default: 1.5
    obrigatorio: true
```

## 🏗️ Estrutura do Pipe

```yaml
pipe:
  nome: "{{ nome_do_pipe }}"
  descricao: "Ciclo trimestral de avaliação de performance"
  preferencias:
    icone: "📊"
    aiAgentsEnabled: true

  fases:
    - id: auto-avaliacao
      nome: "Auto-avaliação"
      ordem: 1
      done: false
      sla_dias: 7
      descricao: "Funcionário preenche sua auto-avaliação do ciclo."
      campos:
        - id: funcionario
          label: "Funcionário"
          tipo: assignee_select
          obrigatorio: true
        - id: periodo
          label: "Período / ciclo"
          tipo: short_text
          obrigatorio: true
        - id: pontos-fortes
          label: "Pontos fortes do ciclo"
          tipo: long_text
          obrigatorio: true
        - id: pontos-melhorar
          label: "Pontos a melhorar"
          tipo: long_text
          obrigatorio: true
        - id: score-auto
          label: "Score auto (1 a 5)"
          tipo: number
          minimo: 1
          maximo: 5
          obrigatorio: true

    - id: avaliacao-gestor
      nome: "Avaliação do Gestor"
      ordem: 2
      done: false
      sla_dias: 7
      descricao: "Gestor direto registra seu parecer."
      campos:
        - id: gestor
          label: "Gestor"
          tipo: assignee_select
          obrigatorio: true
        - id: score-gestor
          label: "Score gestor (1 a 5)"
          tipo: number
          minimo: 1
          maximo: 5
          obrigatorio: true
        - id: feedback-gestor
          label: "Feedback do gestor"
          tipo: long_text
          obrigatorio: true

    - id: calibracao
      nome: "Calibração"
      ordem: 3
      done: false
      sla_dias: 7
      descricao: "Comitê discute casos com diff alto e define score final."
      campos:
        - id: score-final
          label: "Score final"
          tipo: number
          minimo: 1
          maximo: 5
        - id: justificativa-diff
          label: "Justificativa do diff"
          tipo: long_text
        - id: resumo-feedback-ia
          label: "Resumo do feedback (IA)"
          tipo: long_text

    - id: devolutiva
      nome: "Devolutiva"
      ordem: 4
      done: true
      sla_dias: 7
      descricao: "Reunião de devolutiva, plano de desenvolvimento e aceite."
      campos:
        - id: reuniao-agendada
          label: "Reunião agendada para"
          tipo: datetime
        - id: plano-desenvolvimento
          label: "Plano de desenvolvimento"
          tipo: long_text
        - id: aceite-funcionario
          label: "Funcionário aceita o resultado?"
          tipo: radio_horizontal
          opcoes: [Sim, Não]
```

## 🔔 Automações

```yaml
automacoes:
  - id: avancar-quando-auto-completa
    nome: "Avançar para Avaliação do Gestor quando auto-avaliação completa"
    quando:
      evento: campo_atualizado
      campo: score-auto
    entao:
      tipo: mover_card
      fase_destino: avaliacao-gestor

  - id: flag-calibracao-diff-alto
    nome: "Sinalizar diff alto para calibração obrigatória"
    quando:
      evento: campo_atualizado
      campo: score-gestor
    entao:
      tipo: atualizar_campo
      campo: justificativa-diff
      valor: "Diff entre auto e gestor superior a {{ diff_calibracao }} — calibração recomendada."
```

## 🧠 AI Agents

```yaml
ai_agents:
  - id: sumarizador-feedback
    nome: "Sumarizador de Feedback"
    instruction: |
      Você sumariza feedback de performance em 3 bullets neutros, sem julgamento.
      Comprime, não interpreta.

    behaviors:
      - nome: "Resumir feedback ao entrar em calibração"
        trigger: card_moved
        evento_params:
          para_fase: calibracao
        prompt: |
          Resuma em 3 bullets os pontos principais de {{ pontos-fortes }} +
          {{ pontos-melhorar }} + {{ feedback-gestor }}. Sem julgamento, neutro.

        acoes:
          - tipo: update_card
            campos:
              - id: resumo-feedback-ia
                modo: fill_with_ai
```

## 📌 Pós-clonagem

1. **Bulk-create de cards no início do ciclo** — use a Pipefy API ou import via planilha para gerar um card por funcionário ativo. O template não automatiza essa criação porque depende da fonte de verdade de headcount da sua empresa.
2. **Configurar notificações por email manualmente via UI** — alerta para o gestor (campo `gestor`) quando o card chega na fase "Avaliação do Gestor" e para o funcionário (campo `funcionario`) quando entra em "Devolutiva". Inclua também notificação para `{{ rh_business_partner_email }}` em SLA estourado.
3. **Definir comitê de calibração** — adicione os membros do comitê ao pipe e configure permissões da fase "Calibração" para que só o comitê possa editar `score-final`.
4. **Calibrar o limiar de diff** — o valor `{{ diff_calibracao }}` (default 1.5) força calibração obrigatória; ajuste para a maturidade do seu ciclo.
5. **Conectar com pipe de PDI** (opcional) — quando o card chega em "Devolutiva" com plano de desenvolvimento preenchido, crie pipe relation com um pipe de PDI/IDP para acompanhar execução.

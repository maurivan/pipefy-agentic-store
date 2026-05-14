---
id: leave-request-balance-check
nome: Solicitação de Férias e Licenças
descricao_curta: Fluxo simples de solicitação de férias/licenças com validação automática de saldo e conflito de calendário via IA, integrado a DB de saldo e ERP de folha.
categoria: rh
versao: 1.0.0
schema_version: 1
autor: pipefy-template-store
tags: [rh, ferias, licenca, saldo, calendario, ia]
icone: 🏖️
tempo_estimado_clonagem: "~30 segundos"
fases_count: 4
campos_count: 17
requer_ai_agents: true
requer_database_tables: true
---

# Solicitação de Férias e Licenças

## 📖 Sobre este template

Processo enxuto de solicitação de férias, licenças médicas, pessoais e maternidade. Foca em validar saldo automaticamente (via lookup em DB) e checar conflito de calendário do time antes de mandar ao gestor. O agente faz uma checagem objetiva — sem boilerplate — alinhada ao perfil HR-ops Cluster B, onde a simplicidade prevalece.

**Indicado para:** times de RH em PMEs e médias empresas, com 50-500 colaboradores e ERP de folha integrável via HTTP.
**Não indicado para:** empresas que já operam tudo via sistema dedicado de gestão de pessoas (TOTVS RM, Senior, Sapiens) sem necessidade de fluxo paralelo no Pipefy.

## 🎯 Resultados esperados

- Reduzir o tempo médio de aprovação de férias para menos de 2 dias úteis.
- Eliminar férias aprovadas com saldo insuficiente — bloqueio automático antes do gestor.
- Visibilidade dos conflitos de calendário do time (mais de 30% fora simultaneamente).
- Trilha auditável de quem aprovou cada licença, com motivo e prazo.
- Integração com ERP/folha para lançamento automático após aprovação.

## ⚙️ Variáveis de clonagem

```yaml
variaveis:
  - nome: nome_do_pipe
    label: "Nome do pipe"
    tipo: string
    default: "Solicitação de Férias e Licenças"
    obrigatorio: true

  - nome: rh_email
    label: "Email do RH (alertas e aprovações adicionais)"
    tipo: email
    obrigatorio: true

  - nome: dias_limite_rh
    label: "Dias de férias a partir do qual exige aprovação adicional do RH"
    tipo: number
    default: 30
    obrigatorio: true

  - nome: webhook_erp_folha_url
    label: "URL do webhook ERP/folha para lançamento de abono (opcional)"
    tipo: string
    default: ""
    obrigatorio: false

  - nome: webhook_erp_folha_token
    label: "Token de autenticação do ERP/folha"
    tipo: string
    default: ""
    obrigatorio: false
```

## 🏗️ Estrutura do Pipe

```yaml
pipe:
  nome: "{{ nome_do_pipe }}"
  descricao: "Solicitações de férias e licenças com validação automática de saldo"
  preferencias:
    icone: "🏖️"
    aiAgentsEnabled: true

  fases:
    - id: solicitacao
      nome: "Solicitação"
      descricao: "Colaborador cria a solicitação"
      ordem: 1
      done: false
      sla_dias: 1
      campos:
        - id: funcionario
          label: "Funcionário"
          tipo: assignee_select
          obrigatorio: true
        - id: tipo
          label: "Tipo de afastamento"
          tipo: radio_horizontal
          opcoes: [Férias, "Licença médica", Pessoal, Maternidade]
          obrigatorio: true
        - id: data-inicio
          label: "Data de início"
          tipo: date
          obrigatorio: true
        - id: data-fim
          label: "Data de fim"
          tipo: date
          obrigatorio: true
        - id: dias-solicitados
          label: "Dias solicitados"
          tipo: number
          obrigatorio: true
        - id: motivo
          label: "Motivo / observações"
          tipo: long_text

    - id: validacao-saldo
      nome: "Validação de Saldo"
      descricao: "Lookup do saldo atual + análise do agente IA"
      ordem: 2
      done: false
      sla_dias: 1
      campos:
        - id: saldo-atual
          label: "Saldo atual de férias (dias)"
          tipo: number
        - id: saldo-apos
          label: "Saldo após solicitação (dias)"
          tipo: number
        - id: validacao
          label: "Resultado da validação"
          tipo: radio_horizontal
          opcoes: [OK, "Saldo Insuficiente", "Conflito Calendário"]
        - id: mensagem-agente
          label: "Mensagem do agente"
          tipo: short_text

    - id: aprovacao-gestor
      nome: "Aprovação do Gestor"
      descricao: "Decisão final do gestor imediato"
      ordem: 3
      done: false
      sla_dias: 2
      campos:
        - id: gestor
          label: "Gestor responsável"
          tipo: assignee_select
        - id: decisao
          label: "Decisão"
          tipo: radio_horizontal
          opcoes: [Aprovado, Rejeitado]
        - id: comentario-gestor
          label: "Comentário do gestor"
          tipo: long_text

    - id: rh-processado
      nome: "RH Processado"
      descricao: "Lançamento na folha concluído"
      ordem: 4
      done: true
      campos:
        - id: lancamento-erp
          label: "ID do lançamento no ERP"
          tipo: short_text
        - id: substituto
          label: "Substituto (opcional)"
          tipo: assignee_select
        - id: comunicacao-enviada
          label: "Comunicação enviada ao time?"
          tipo: radio_horizontal
          opcoes: [Sim, Não]
```

## 🔔 Automações

```yaml
automacoes:
  - id: avancar-para-aprovacao
    nome: "Avançar para Aprovação quando saldo OK"
    quando:
      evento: campo_atualizado
      campo: validacao
    entao:
      tipo: mover_card
      fase_destino: aprovacao-gestor

  - id: webhook-erp-lancamento
    nome: "Lançar abono no ERP/folha após aprovação"
    quando:
      evento: campo_atualizado
      campo: decisao
    entao:
      tipo: enviar_webhook
      webhook_id: lancar-erp-folha

  - id: alerta-saldo-insuficiente
    nome: "Marcar mensagem se saldo insuficiente"
    quando:
      evento: campo_atualizado
      campo: saldo-apos
    entao:
      tipo: atualizar_campo
      campo: validacao
      valor: "Saldo Insuficiente"
```

## 🧠 AI Agents

```yaml
ai_agents:
  - id: validador-ferias
    nome: "Validador de Saldo e Calendário"
    instruction: |
      Você é um validador objetivo de pedidos de férias. Compara dias solicitados
      contra saldo atual e contra o calendário do time. Saída curta: status + mensagem.

    behaviors:
      - nome: "Validar saldo e calendário ao entrar em Validação"
        trigger: card_moved
        evento_params:
          em_fase: validacao-saldo
        prompt: |
          Você compara dias solicitados {{ Dias solicitados }} com o saldo {{ Saldo atual }} de {{ Funcionário }}.

          Tarefa:
          - Se Saldo - Dias < 0 → retorne "SALDO_INSUFICIENTE: faltam X dias".
          - Senão verifique se há outras solicitações aprovadas do mesmo time entre {{ Data início }} e {{ Data fim }} consultando {{ Calendário time (JSON) }}.
          - Se >= 30% do time estiver de férias no período → "CONFLITO_CALENDARIO".
          - Caso contrário → "OK".

          Saída: status + mensagem (max 1 frase).

        acoes:
          - tipo: update_card
            campos:
              - id: validacao
                modo: fill_with_ai
              - id: mensagem-agente
                modo: fill_with_ai
              - id: saldo-apos
                modo: fill_with_ai
```

## 🗄️ Database Tables

```yaml
database_tables:
  - id: saldo_ferias
    nome: "Saldo de Férias"
    descricao: "Saldo atual de férias por funcionário, atualizado pelo RH/folha"
    colunas:
      - id: funcionario-id
        label: "ID do funcionário"
        tipo: short_text
        obrigatorio: true
        unico: true
      - id: nome
        label: "Nome do funcionário"
        tipo: short_text
        obrigatorio: true
      - id: time
        label: "Time / departamento"
        tipo: short_text
      - id: saldo-dias
        label: "Saldo atual (dias)"
        tipo: number
        obrigatorio: true
      - id: periodo-aquisitivo
        label: "Período aquisitivo de referência"
        tipo: short_text
      - id: atualizado-em
        label: "Atualizado em"
        tipo: date
```

## 🪝 Webhooks

```yaml
webhooks:
  - id: lancar-erp-folha
    nome: "Lançamento de abono no ERP/folha"
    url: "{{ webhook_erp_folha_url }}"
    eventos:
      - card.field_update
    filtro:
      campo_igual:
        campo: decisao
        valor: Aprovado
    headers:
      Authorization: "Bearer {{ webhook_erp_folha_token }}"
      Content-Type: "application/json"
    payload_extra:
      operacao: "lancar_abono"
      origem: "pipefy-leave-request"
```

## 📌 Pós-clonagem

1. **Popular DB `saldo_ferias`** — sem ela, o behavior do agente não tem como puxar o saldo. Carregue via importação do ERP/folha (CSV ou API).
2. **Configurar lookup de saldo** — adicione uma automação nativa do Pipefy (UI) que, ao criar o card, busque o `saldo-dias` da DB com base no `funcionario-id` e preencha o campo `saldo-atual`.
3. **Notificações por email** — configure manualmente via UI do Pipefy os emails de:
   - Notificação ao gestor quando o card entra em Aprovação do Gestor.
   - Notificação ao funcionário quando o RH conclui o processamento.
   - Alerta interno ao `{{ rh_email }}` quando `Tipo = Férias` e `dias-solicitados >= {{ dias_limite_rh }}`.
4. **Regra de aprovação adicional do RH** para férias longas (`>= {{ dias_limite_rh }}` dias) — configure manualmente, depende da estrutura do seu RH.
5. **Webhook do ERP** — deixe vazio durante o piloto; ao integrar, garanta idempotência no endpoint (Pipefy faz retry).
6. **Membros do pipe** — adicione gestores como membros para conseguirem aprovar pela própria interface do Pipefy.

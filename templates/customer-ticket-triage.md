---
id: customer-ticket-triage
nome: Triagem de Tickets de Cliente
descricao_curta: Triagem multidimensional de tickets (categoria, prioridade, time, idioma, resumo) com lookup de segmento e roteamento via inbox de email.
categoria: customer-success
versao: 1.0.0
schema_version: 1
autor: pipefy-template-store
tags: [customer-success, suporte, triagem, ticket, ia, inbox]
icone: 🎫
tempo_estimado_clonagem: "~70 segundos"
fases_count: 5
campos_count: 18
requer_ai_agents: true
requer_database_tables: true
---

# Triagem de Tickets de Cliente

## 🎫 Sobre este template

Pipe de triagem de tickets que centraliza solicitações vindas de email, chat e formulários web. Cada ticket entra pela inbox do pipe, recebe triagem automática multidimensional (categoria, prioridade, time responsável, idioma e resumo) e é roteado para a equipe correta com SLA específico por prioridade.

A IA aqui é uma classificadora robusta: aplica taxonomia explícita de 5 categorias (Comercial, Suporte, Faturamento, Reclamação, Outro) e 4 prioridades (P0/P1/P2/P3), respeitando enriquecimento via lookup de segmento do cliente. Round-robin do assignee dentro do time é determinístico — a IA escolhe só o time, não a pessoa.

## 🎯 Resultados esperados

- Triagem em segundos após chegada do ticket, sem fila humana de classificação.
- SLA por prioridade evita que P0 fique esperando atrás de P3.
- Roteamento consistente: mesma categoria sempre vai para o mesmo time.
- Lookup de segmento melhora classificação (Enterprise reportando "tudo parado" = P0).
- Trilha auditável de cada decisão de triagem da IA.

## ⚙️ Variáveis de clonagem

```yaml
variaveis:
  - nome: nome_do_pipe
    label: "Nome do pipe"
    tipo: string
    default: "Triagem de Tickets"
    obrigatorio: true

  - nome: oncall_email
    label: "Email do oncall (notificado em SLA P0/P1 estourado)"
    tipo: email
    obrigatorio: true

  - nome: sla_p0_horas
    label: "SLA P0 (horas)"
    tipo: number
    default: 1
    obrigatorio: true

  - nome: sla_p1_horas
    label: "SLA P1 (horas)"
    tipo: number
    default: 4
    obrigatorio: true

  - nome: sla_p2_horas
    label: "SLA P2 (horas)"
    tipo: number
    default: 24
    obrigatorio: true

  - nome: sla_p3_horas
    label: "SLA P3 (horas)"
    tipo: number
    default: 72
    obrigatorio: true

  - nome: pipe_escalonamento_id
    label: "ID do pipe interno de escalonamento (opcional)"
    tipo: string
    obrigatorio: false

  - nome: webhook_crm_lookup_url
    label: "URL para lookup do segmento do cliente no CRM"
    tipo: string
    placeholder: "https://crm.suaempresa/api/customer-segment"
    obrigatorio: false

  - nome: webhook_crm_token
    label: "Token do CRM"
    tipo: string
    obrigatorio: false
```

## 🏗️ Estrutura do Pipe

```yaml
pipe:
  nome: "{{ nome_do_pipe }}"
  descricao: "Triagem e roteamento de tickets de cliente vindos de email, chat e formulários"
  preferencias:
    icone: "🎫"
    aiAgentsEnabled: true

  fases:
    - id: ticket-criado
      nome: "Ticket criado"
      ordem: 1
      done: false
      sla_dias: 1
      descricao: "Ticket recém-chegado da inbox de email, chat ou formulário."
      campos:
        - id: origem
          label: "Origem do ticket"
          tipo: radio_horizontal
          opcoes: [Email, Chat, Formulário, API]
          obrigatorio: true
        - id: cliente
          label: "Cliente"
          tipo: short_text
          obrigatorio: true
        - id: email-cliente
          label: "Email do cliente"
          tipo: email
        - id: segmento-cliente
          label: "Segmento do cliente (lookup)"
          tipo: select
          opcoes: [Enterprise, Mid-Market, SMB, Free, Desconhecido]
        - id: assunto
          label: "Assunto"
          tipo: short_text
          obrigatorio: true
        - id: corpo
          label: "Corpo do ticket"
          tipo: long_text
          obrigatorio: true
        - id: anexos
          label: "Anexos"
          tipo: attachment

    - id: triagem-ia
      nome: "Triagem IA"
      ordem: 2
      done: false
      sla_dias: 1
      descricao: "IA classifica categoria, prioridade, time, idioma e gera resumo."
      campos:
        - id: categoria
          label: "Categoria"
          tipo: select
          opcoes: [Comercial, Suporte, Faturamento, Reclamação, Outro]
        - id: prioridade
          label: "Prioridade"
          tipo: radio_horizontal
          opcoes: [P0, P1, P2, P3]
        - id: time-responsavel
          label: "Time responsável"
          tipo: select
          opcoes: ["Time Sales", "Time CS", "Time Finance", "Time CSM (Senior)", "Time Outros"]
        - id: idioma
          label: "Idioma"
          tipo: radio_horizontal
          opcoes: [Português, Inglês, Espanhol]
        - id: resumo-agente
          label: "Resumo (IA)"
          tipo: short_text

    - id: atribuicao
      nome: "Atribuição"
      ordem: 3
      done: false
      sla_dias: 1
      descricao: "Round-robin atribui o ticket a um membro do time responsável."
      campos:
        - id: assignee
          label: "Atribuído a"
          tipo: assignee_select
        - id: sla-inicial
          label: "SLA inicial (deadline)"
          tipo: datetime

    - id: em-atendimento
      nome: "Em atendimento"
      ordem: 4
      done: false
      descricao: "Equipe está trabalhando no ticket."
      campos:
        - id: ultima-atualizacao
          label: "Última atualização"
          tipo: datetime
        - id: comentarios-internos
          label: "Comentários internos"
          tipo: long_text

    - id: resolvido
      nome: "Resolvido"
      ordem: 5
      done: true
      descricao: "Ticket fechado, satisfação coletada."
      campos:
        - id: tipo-resolucao
          label: "Tipo de resolução"
          tipo: select
          opcoes: [Resolvido, Workaround, Não reproduzível, Encaminhado, Duplicado]
        - id: satisfacao
          label: "Satisfação do cliente (1-5)"
          tipo: number
          minimo: 1
          maximo: 5
        - id: data-resolucao
          label: "Data da resolução"
          tipo: date
```

## 🔔 Automações

```yaml
automacoes:
  - id: lookup-segmento-cliente
    nome: "Lookup do segmento do cliente ao criar"
    quando:
      evento: card_criado_em_fase
      fase: ticket-criado
    entao:
      tipo: enviar_webhook
      webhook_id: crm-segmento-lookup

  - id: mover-triagem-pos-criacao
    nome: "Mover para Triagem após enriquecimento"
    quando:
      evento: campo_atualizado
      campo: segmento-cliente
    entao:
      tipo: mover_card
      fase_destino: triagem-ia

  - id: mover-atribuicao-pos-triagem
    nome: "Mover para Atribuição quando IA completa classificação"
    quando:
      evento: campo_atualizado
      campo: time-responsavel
    entao:
      tipo: mover_card
      fase_destino: atribuicao
```

## 🧠 AI Agents

```yaml
ai_agents:
  - id: triador-multidimensional
    nome: "Triador Multidimensional de Tickets"
    instruction: |
      Você é um agente de triagem de tickets de cliente. Aplica uma taxonomia
      rigorosa de 5 categorias e 4 prioridades, escolhe o time responsável,
      detecta o idioma e gera um resumo curto. Nunca inventa categoria nova ou
      prioridade ambígua — sempre escolhe exatamente UMA de cada enum. Output
      em JSON estrito alimenta automações de roteamento.

    behaviors:
      - nome: "Triar ticket ao entrar em Triagem IA"
        trigger: card_moved
        evento_params:
          para_fase: triagem-ia
        prompt: |
          Você categoriza tickets de cliente baseado em conteúdo.

          ENTRADA:
          - Assunto: {{ assunto }}
          - Corpo: {{ corpo }}
          - Cliente: {{ cliente }} (segmento {{ segmento-cliente }})

          TAREFAS:

          1. CATEGORIA — escolha UMA:
             - Comercial: pedidos novos, upsell, expansão
             - Suporte: dúvidas de uso, bug, configuração
             - Faturamento: cobrança, fatura, pagamento
             - Reclamação: insatisfação, devolução
             - Outro: fora das 4 acima

          2. PRIORIDADE — escolha UMA:
             - P0: cliente Enterprise reportando "tudo parado", "perdendo dinheiro", "urgente"
             - P1: bug bloqueador funcional, cliente esperando há > 24h
             - P2: dúvida que afeta uso normal
             - P3: solicitação não-urgente, cosmético

          3. TIME RESPONSÁVEL:
             - Categoria Comercial → Time Sales
             - Categoria Suporte → Time CS
             - Categoria Faturamento → Time Finance
             - Categoria Reclamação → Time CSM (Senior)
             - Categoria Outro → Time Outros

          4. IDIOMA: Português / Inglês / Espanhol.

          5. RESUMO: 1 frase (máx 80 chars) descrevendo o pedido.

          REGRAS:
          - Sempre 1 categoria, 1 prioridade, 1 time. Sem "ambíguo".
          - Quando dúvida → Categoria: Suporte, Prioridade: P2.

          FORMATO (JSON):
          {
            "categoria": "Comercial|Suporte|Faturamento|Reclamação|Outro",
            "prioridade": "P0|P1|P2|P3",
            "time_responsavel": "...",
            "idioma": "Português|Inglês|Espanhol",
            "resumo": "..."
          }

          EXEMPLO:
          Assunto: "Sistema fora do ar"
          Corpo: "Cliente Enterprise XYZ não consegue acessar há 30 min, está perdendo receita."
          Saída: {"categoria": "Suporte", "prioridade": "P0", "time_responsavel": "Time CS", "idioma": "Português", "resumo": "Acesso indisponível há 30min em cliente Enterprise"}

          Preencha os campos do card com os valores exatos do JSON.

        acoes:
          - tipo: update_card
            campos:
              - id: categoria
                modo: fill_with_ai
              - id: prioridade
                modo: fill_with_ai
              - id: time-responsavel
                modo: fill_with_ai
              - id: idioma
                modo: fill_with_ai
              - id: resumo-agente
                modo: fill_with_ai
```

## 🗄️ Database Tables

```yaml
database_tables:
  - id: db-segmentos-cliente
    nome: "DB Segmentos Cliente"
    descricao: "Catálogo de clientes por segmento, alimentado pelo CRM. Usado pelo lookup."
    colunas:
      - id: cliente-nome
        label: "Cliente"
        tipo: short_text
        obrigatorio: true
        unico: true
      - id: cnpj-ou-id
        label: "CNPJ ou ID externo"
        tipo: short_text
      - id: segmento
        label: "Segmento"
        tipo: select
        opcoes: [Enterprise, Mid-Market, SMB, Free]
        obrigatorio: true
      - id: csm-responsavel
        label: "CSM responsável"
        tipo: short_text
      - id: ativo
        label: "Ativo?"
        tipo: radio_horizontal
        opcoes: [Sim, Não]
```

## 🔗 Pipe Relations

```yaml
pipe_relations:
  - id: rel-escalonamento
    nome: "Escalonamento interno (opcional)"
    pipe_filho_externo: "{{ pipe_escalonamento_id }}"
    cardinalidade: one_to_many
    auto_fill: false
    nome_no_filho: "Ticket origem"
    descricao: "Para tickets P0 ou Reclamação que precisam de escalonamento formal."
```

## 🪝 Webhooks

```yaml
webhooks:
  - id: crm-segmento-lookup
    nome: "Lookup do segmento do cliente no CRM"
    url: "{{ webhook_crm_lookup_url }}"
    eventos:
      - card.create
    headers:
      Authorization: "Bearer {{ webhook_crm_token }}"
    metodo: POST
    payload_extra:
      acao: "customer_segment_lookup"
      origem: "pipefy-ticket-triage"
```

## 📌 Pós-clonagem

1. **Configurar a inbox de email do pipe** — esse template depende do recurso de "Email inbox do pipe" no Pipefy: cada email recebido vira card. Configure manualmente o endereço (ex: `tickets@suaempresa.pipefy.com`) na Pipefy UI → Pipe Settings → Email.
2. **Configurar notificações por email manualmente via UI** — o template não automatiza emails de saída. Crie via Pipefy UI: notificação para `{{ oncall_email }}` quando SLA P0 ou P1 estoura, e auto-resposta para o cliente (campo `email-cliente`) confirmando recebimento do ticket.
3. **Configurar SLA por prioridade no Pipefy UI** — o template define os valores nas variáveis `{{ sla_p0_horas }}`, `{{ sla_p1_horas }}`, etc., mas o Pipefy precisa que você configure SLA condicional baseado em `prioridade` direto na UI (lateAfter dinâmico não é nativo do template).
4. **Popular a database `DB Segmentos Cliente`** — sem dados, o lookup retorna vazio e a IA cai no fallback "Desconhecido". Importe via CSV uma vez e mantenha sincronizada via webhook ou scheduler.
5. **Configurar round-robin** dos assignees por time na Pipefy UI (Automations → Assign assignee → round_robin) — o template não define a regra porque depende de quem está em cada time na sua organização.
6. **Apontar `pipe_escalonamento_id`** se quiser usar pipe relation para escalonamento. Deixe em branco se não tiver pipe dedicado.
7. **Validar a triagem com tickets reais anonimizados** — submeta 10-20 tickets variados e revise se a IA está classificando bem. Ajuste o prompt se algum padrão específico (ex: bug reports vs feature requests) estiver caindo no balde errado.

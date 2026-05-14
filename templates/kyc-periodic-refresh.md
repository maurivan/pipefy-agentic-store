---
id: kyc-periodic-refresh
nome: "KYC Periodic Refresh"
descricao_curta: "Refresh anual de KYC com scheduler, solicitação automática de documentos e re-validação por IA"
categoria: juridico
versao: 1.0.0
schema_version: 1
autor: pipefy-template-store
tags: [juridico, compliance, kyc, refresh, monitoramento]
icone: "🔄"
tempo_estimado_clonagem: "~45 segundos"
fases_count: 4
campos_count: 16
requer_ai_agents: true
requer_database_tables: true
---

# KYC Periodic Refresh

## 📖 Sobre este template

Processo recorrente de atualização cadastral KYC: a cada 12 meses, dispara um
refresh para cada cliente da base, solicita documentos atualizados, re-roda
todas as validações (PEP, sanctions, situação fiscal) e decide entre
**manter aprovado** ou **bloquear** a relação comercial. O scheduler é o
trigger principal — refresh nunca esquece.

O agente de IA reutiliza o **mesmo prompt de extração e validação** do
template `vendor-onboarding-kyc` (extrai dados do Cartão CNPJ, valida
situação cadastral, identifica pendências). A diferença aqui é o **disparo
agendado** e a comparação contra o snapshot anterior do cliente.

**Indicado para:** fintechs, bancos, financeiras, marketplaces regulados,
qualquer empresa com obrigação de KYC recorrente.

## 🎯 Resultados esperados

- Zero clientes com KYC vencido por esquecimento
- SLA de 30 dias para resposta do cliente, com bloqueio automático após
- Trilha completa de auditoria por ciclo de refresh
- Re-validação automatizada — compliance officer só atua em exceções
- Visibilidade do funil de refresh (agendados / em coleta / aprovados / bloqueados)

## ⚙️ Variáveis de clonagem

```yaml
variaveis:
  - nome: nome_do_pipe
    label: "Nome do pipe"
    tipo: string
    default: "KYC Periodic Refresh"
    obrigatorio: true

  - nome: kyc_pipe_id
    label: "ID do pipe de KYC original (vendor/customer onboarding)"
    tipo: string
    obrigatorio: true
    descricao: "Pipe que originou o KYC — usado como relação para puxar histórico"

  - nome: clientes_table_id
    label: "ID da database table de Clientes (deixe vazio para criar nova)"
    tipo: string
    obrigatorio: false

  - nome: sla_resposta_cliente_dias
    label: "SLA para o cliente responder com documentos (dias)"
    tipo: number
    default: 30
    obrigatorio: true

  - nome: meses_entre_refresh
    label: "Periodicidade do refresh (meses)"
    tipo: number
    default: 12
    obrigatorio: true

  - nome: email_compliance
    label: "Email da equipe de compliance"
    tipo: email
    obrigatorio: true
```

## 🏗️ Estrutura do Pipe

```yaml
pipe:
  nome: "{{ nome_do_pipe }}"
  descricao: "Refresh periódico de KYC com bloqueio automático em caso de não-resposta"
  publico: false
  preferencias:
    icone: "🔄"
    aiAgentsEnabled: true

  fases:
    - id: refresh-agendado
      nome: "Refresh agendado"
      descricao: "Card criado pelo scheduler quando o KYC do cliente está prestes a vencer"
      ordem: 1
      campos:
        - id: cliente
          label: "Cliente"
          tipo: connector
          conector_tabela: "{{ clientes_table_id }}"
          obrigatorio: true
        - id: data_ultimo_kyc
          label: "Data do último KYC"
          tipo: date
          obrigatorio: true
        - id: data_refresh
          label: "Data prevista do refresh"
          tipo: date
          obrigatorio: true
          descricao: "Calculada como último KYC + {{ meses_entre_refresh }} meses"
        - id: motivo_refresh
          label: "Motivo"
          tipo: radio_vertical
          opcoes: ["Refresh anual programado", "Mudança societária", "Re-classificação de risco"]

    - id: solicitacao-documentos
      nome: "Solicitação de documentos"
      descricao: "Cliente é notificado e tem {{ sla_resposta_cliente_dias }} dias para responder"
      ordem: 2
      sla_dias: "{{ sla_resposta_cliente_dias }}"
      lateAfter: 15
      campos:
        - id: email_enviado_em
          label: "Email enviado em"
          tipo: date
        - id: documentos_solicitados
          label: "Documentos solicitados"
          tipo: checklist_vertical
          opcoes:
            - "Cartão CNPJ atualizado"
            - "Comprovante de endereço (últimos 90 dias)"
            - "Atos constitutivos atualizados"
            - "Documento de sócios / beneficiários finais"
        - id: documentos_recebidos
          label: "Documentos recebidos"
          tipo: attachment

    - id: re-validacao
      nome: "Re-validação"
      descricao: "Agente IA extrai dados e re-roda validações (PEP, sanctions, fiscal)"
      ordem: 3
      campos:
        - id: dados_extraidos
          label: "Dados extraídos (JSON)"
          tipo: long_text
          descricao: "Output estruturado do agente IA"
        - id: cnpj_divergente
          label: "CNPJ divergente do cadastro?"
          tipo: radio_horizontal
          opcoes: ["Não", "Sim"]
        - id: situacao_cadastral
          label: "Situação cadastral atual"
          tipo: select
          opcoes: ["Ativa", "Suspensa", "Inapta", "Baixada", "Ilegível"]
        - id: pendencias
          label: "Pendências identificadas"
          tipo: long_text

    - id: decisao
      nome: "Aprovado / Bloqueio"
      descricao: "Compliance officer toma decisão final"
      ordem: 4
      done: true
      campos:
        - id: decisao
          label: "Decisão"
          tipo: radio_horizontal
          opcoes: ["Aprovado", "Bloqueado", "Suspenso até regularização"]
          obrigatorio: true
        - id: justificativa
          label: "Justificativa"
          tipo: long_text
          obrigatorio: true
        - id: proximo_refresh
          label: "Próximo refresh"
          tipo: date
          descricao: "Auto-calculado como hoje + {{ meses_entre_refresh }} meses"
```

## 🔔 Automações

```yaml
automacoes:
  - id: bloqueio-por-sla
    nome: "Mover para Bloqueio se cliente não responder no SLA"
    quando:
      evento: prazo_estourado
      fase: solicitacao-documentos
    entao:
      tipo: atualizar_campo
      campo: decisao
      valor: "Bloqueado"

  - id: marcar-cnpj-divergente
    nome: "Flag P0 quando CNPJ divergente"
    quando:
      evento: campo_atualizado
      campo: cnpj_divergente
    entao:
      tipo: enviar_webhook
      webhook_id: alerta-compliance-divergencia
```

## 🧠 AI Agents

```yaml
ai_agents:
  - id: agente-kyc-refresh
    nome: "Agente de Re-validação KYC"
    instruction: |
      Você é um agente especializado em re-validação de KYC. Reutiliza a mesma
      lógica de extração do template `vendor-onboarding-kyc` (extrai Cartão CNPJ,
      valida situação cadastral, compara dados). Aqui o foco é verificar se o
      cliente CONTINUA elegível — comparando dados atuais contra o cadastro
      original e identificando mudanças relevantes (situação cadastral, sócios,
      endereço, atividade).
    behaviors:
      - nome: "Re-validar documentos do refresh"
        trigger: card_moved
        evento_params:
          para_fase: re-validacao
        prompt: |
          Você é um agente especializado em RE-VALIDAÇÃO de KYC. O cliente já
          passou pelo onboarding e agora está em refresh anual.

          ENTRADA:
          - Documentos anexados no campo {{ documentos_recebidos }}
          - CNPJ esperado: {{ cliente }} (lookup na DB Clientes)
          - Snapshot anterior: data_ultimo_kyc {{ data_ultimo_kyc }}

          TAREFA: extraia os campos do Cartão CNPJ (CNPJ, razão social, endereço,
          situação cadastral, data abertura, CNAE) e compare contra o snapshot
          anterior.

          REGRAS:
          - CNPJ extraído ≠ CNPJ cadastrado → marcar CNPJ_DIVERGENTE.
          - Situação cadastral ≠ "Ativa" → marcar PENDENCIA: <situação>.
          - Mudança de razão social, endereço ou sócios → adicionar à lista de pendências.
          - Documento ilegível ou não-Cartão-CNPJ → erro DOCUMENTO_INVALIDO.

          FORMATO DE SAÍDA (JSON obrigatório):
          {
            "cnpj": "14 dígitos",
            "razao_social": "texto",
            "endereco": {"logradouro": "...", "cep": "...", "municipio": "...", "uf": "XX"},
            "situacao_cadastral": "Ativa|Suspensa|Inapta|Baixada",
            "data_abertura": "YYYY-MM-DD",
            "cnae_principal": "código + descrição",
            "mudancas_vs_snapshot": ["array de mudanças identificadas"],
            "pendencias": ["array de pendências"]
          }

          EXEMPLO:
          Input: cartão CNPJ Empresa ABC LTDA, CNPJ idêntico ao cadastro, mas
          situação Suspensa e endereço mudou.
          Output:
          {
            "cnpj": "12345678000199",
            "razao_social": "EMPRESA ABC LTDA",
            "endereco": {"logradouro": "Rua Nova", "cep": "04567-000", "municipio": "São Paulo", "uf": "SP"},
            "situacao_cadastral": "Suspensa",
            "data_abertura": "2010-05-15",
            "cnae_principal": "62.04-0/00 Consultoria em TI",
            "mudancas_vs_snapshot": ["Endereço alterado"],
            "pendencias": ["PENDENCIA: Suspensa"]
          }
        acoes:
          - nome: "Preencher dados extraídos e pendências"
            tipo: update_card
            campos:
              - id: dados_extraidos
                modo: fill_with_ai
              - id: situacao_cadastral
                modo: fill_with_ai
              - id: cnpj_divergente
                modo: fill_with_ai
              - id: pendencias
                modo: fill_with_ai
```

## 🗄️ Database Tables

```yaml
database_tables:
  - id: clientes-kyc
    nome: "Clientes (KYC)"
    descricao: "Cadastro dos clientes elegíveis a refresh KYC — usado pelo scheduler diário"
    colunas:
      - id: razao-social
        label: "Razão Social"
        tipo: short_text
        obrigatorio: true
      - id: cnpj
        label: "CNPJ"
        tipo: cnpj
        obrigatorio: true
        unico: true
      - id: data-ultimo-kyc
        label: "Data do último KYC"
        tipo: date
        obrigatorio: true
      - id: proximo-refresh
        label: "Próximo refresh agendado"
        tipo: date
      - id: status
        label: "Status do cliente"
        tipo: select
        opcoes: ["Ativo", "Suspenso", "Bloqueado"]
      - id: classificacao-risco
        label: "Classificação de risco"
        tipo: select
        opcoes: ["Baixo", "Médio", "Alto"]
```

## 🔗 Pipe Relations

```yaml
pipe_relations:
  - id: rel-kyc-original
    nome: "KYC original do cliente"
    pipe_filho_externo: "{{ kyc_pipe_id }}"
    cardinalidade: one_to_one
    auto_fill: false
    nome_no_filho: "Refresh aberto (KYC Periodic Refresh)"
    descricao: "Liga o card de refresh ao card original do onboarding KYC, para puxar histórico de documentos e decisões anteriores."
```

## 🪝 Webhooks

```yaml
webhooks:
  - id: alerta-compliance-divergencia
    nome: "Alertar compliance em divergências críticas"
    url: "{{ webhook_compliance_url }}"
    eventos:
      - card.field_update
    filtro:
      campo_igual:
        campo: cnpj_divergente
        valor: "Sim"
    metodo: POST
    payload_extra:
      template_id: "kyc-periodic-refresh"
      severity: "P0"
```

## 📌 Pós-clonagem

- **Scheduler**: configure manualmente um job diário (cron externo, n8n, Zapier ou similar) que consulte a DB `Clientes (KYC)` e crie um card em `Refresh agendado` quando `proximo_refresh - hoje < 30 dias`. O Pipefy não tem cron nativo para criação de cards.
- **Notificação ao cliente**: configure manualmente via UI um email de solicitação de documentos disparado ao mover para `Solicitação de documentos` (template não inclui email automatizado).
- **Popule a DB `Clientes (KYC)`** com sua base atual antes de ativar o pipe.
- **URL do webhook de compliance** (`{{ webhook_compliance_url }}`) deve ser configurada para o seu canal preferido (Slack, Teams, sistema interno).
- **Permissões**: restrinja escrita na fase `Decisão` para o time de compliance.
- **Verifique** que o pipe original de KYC (`{{ kyc_pipe_id }}`) existe na organização antes da clonagem.

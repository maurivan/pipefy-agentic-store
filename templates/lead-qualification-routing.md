---
id: lead-qualification-routing
nome: "Lead Qualification & Routing"
descricao_curta: "Captura, enriquecimento e roteamento de leads com scoring numérico simples por IA"
categoria: comercial
versao: 1.0.0
schema_version: 1
autor: pipefy-template-store
tags: [comercial, vendas, leads, scoring, sdr, routing]
icone: "🎯"
tempo_estimado_criacao: "~30 segundos"
fases_count: 5
campos_count: 15
requer_ai_agents: true
requer_database_tables: true
---

# Lead Qualification & Routing

## 📖 Sobre este template

Funil de qualificação de leads: captura → enriquecimento via HTTP
(Clearbit/Apollo) → scoring 0-100 → roteamento para SDR → agendamento via
Calendly → criação no CRM.

**Cluster anatomy: Simple-action**. O agente IA aqui faz apenas **um cálculo
de score** com um prompt mínimo. Toda a heavy lifting é feita por integrações
HTTP (enriquecimento, Calendly, CRM). Sales-ops Cluster B mostra que **schema
mata, prompts curtos vivem** — por isso o agente é minimalista.

**Indicado para:** times comerciais com SDR/BDR estruturados, captura via
formulários ou inbound, ICP claro o suficiente para scoring por regra.

## 🎯 Resultados esperados

- Lead enriquecido automaticamente antes de chegar ao SDR
- Score 0-100 padronizado, threshold automatiza o avanço de fase
- Roteamento ao SDR via assignee — não há "lead esquecido"
- Reunião agendada via Calendly conectado ao card
- CRM criado em background — vendedor não digita duas vezes

## ⚙️ Variáveis de criação

```yaml
variaveis:
  - nome: nome_do_pipe
    label: "Nome do pipe"
    tipo: string
    default: "Lead Qualification & Routing"
    obrigatorio: true

  - nome: icp_table_id
    label: "ID da database table de ICP / segmentos (deixe vazio para criar nova)"
    tipo: string
    obrigatorio: false

  - nome: enrichment_url
    label: "URL do serviço de enriquecimento (Clearbit, Apollo, próprio)"
    tipo: string
    obrigatorio: true

  - nome: calendly_url
    label: "URL de criação de link Calendly do time"
    tipo: string
    obrigatorio: true

  - nome: crm_url
    label: "URL da API do CRM para criar lead/oportunidade"
    tipo: string
    obrigatorio: true

  - nome: crm_token
    label: "Token de autenticação do CRM"
    tipo: string
    obrigatorio: false

  - nome: score_sql_minimo
    label: "Score mínimo para ser considerado SQL"
    tipo: number
    default: 60
    obrigatorio: true
```

## 🏗️ Estrutura do Pipe

```yaml
pipe:
  nome: "{{ nome_do_pipe }}"
  descricao: "Funil de qualificação e roteamento de leads com scoring por IA e integrações HTTP"
  publico: false
  preferencias:
    icone: "🎯"
    aiAgentsEnabled: true
    publicForm: true
    customCardName: empresa

  fases:
    - id: lead-capturado
      nome: "Lead capturado"
      descricao: "Entrada do lead (form público, integração inbound, importação)"
      ordem: 1
      campos:
        - id: origem
          label: "Origem"
          tipo: radio_vertical
          opcoes: ["Form", "Email", "Inbound chat", "Indicação", "Evento"]
          obrigatorio: true
        - id: nome
          label: "Nome"
          tipo: short_text
          obrigatorio: true
        - id: email
          label: "Email"
          tipo: email
          obrigatorio: true
        - id: empresa
          label: "Empresa"
          tipo: short_text
          obrigatorio: true
        - id: cargo
          label: "Cargo"
          tipo: short_text
        - id: tamanho-empresa
          label: "Tamanho da empresa"
          tipo: select
          opcoes: ["1-10", "11-50", "51-200", "201-1000", "1001-5000", "5000+"]
        - id: industria
          label: "Indústria"
          tipo: select
          opcoes: ["SaaS", "Financeiro", "Saúde", "Varejo", "Indústria", "Educação", "Outros"]

    - id: enriquecimento
      nome: "Enriquecimento"
      descricao: "HTTP a serviço de enriquecimento + scoring por IA"
      ordem: 2
      sla_dias: 1
      campos:
        - id: dados-enriquecidos
          label: "Dados enriquecidos (output HTTP)"
          tipo: long_text
        - id: score-lead
          label: "Score do lead (0-100)"
          tipo: number
          minimo: 0
          maximo: 100

    - id: qualificacao
      nome: "Qualificação"
      descricao: "SDR confirma e atribui próxima ação"
      ordem: 3
      sla_dias: 2
      campos:
        - id: status
          label: "Status"
          tipo: radio_vertical
          opcoes: ["SQL", "MQL", "Disqualified"]
          obrigatorio: true
        - id: sdr-atribuido
          label: "SDR atribuído"
          tipo: assignee_select
        - id: proxima-acao
          label: "Próxima ação"
          tipo: short_text

    - id: reuniao-agendada
      nome: "Reunião agendada"
      descricao: "Calendly criado e enviado ao lead"
      ordem: 4
      campos:
        - id: data-reuniao
          label: "Data da reunião"
          tipo: datetime
        - id: link-calendly
          label: "Link Calendly"
          tipo: short_text

    - id: oportunidade-aberta
      nome: "Oportunidade aberta"
      descricao: "Lead virou oportunidade no CRM"
      ordem: 5
      done: true
      campos:
        - id: id-crm
          label: "ID no CRM"
          tipo: short_text
        - id: valor-estimado
          label: "Valor estimado"
          tipo: currency
          moeda: "BRL"
```

## 🔔 Automações

```yaml
automacoes:
  - id: disparar-enriquecimento
    nome: "Enriquecer ao capturar lead"
    quando:
      evento: card_criado_em_fase
      fase: lead-capturado
    entao:
      tipo: enviar_webhook
      webhook_id: webhook-enriquecimento

  - id: auto-avancar-sql
    nome: "Avançar para Qualificação quando score for alto"
    quando:
      evento: campo_atualizado
      campo: score-lead
    entao:
      tipo: mover_card
      fase_destino: qualificacao

  - id: gerar-calendly-sql
    nome: "Gerar link Calendly em SQL"
    quando:
      evento: campo_atualizado
      campo: status
    entao:
      tipo: enviar_webhook
      webhook_id: webhook-calendly

  - id: criar-no-crm
    nome: "Criar lead no CRM ao agendar reunião"
    quando:
      evento: card_movido_para_fase
      fase: oportunidade-aberta
    entao:
      tipo: enviar_webhook
      webhook_id: webhook-crm
```

## 🧠 AI Agents

```yaml
ai_agents:
  - id: agente-score-lead
    nome: "Score lead"
    instruction: |
      Calcule um score 0-100 baseado em tamanho da empresa, indústria e cargo
      do lead. Saída numérica simples.
    behaviors:
      - nome: "Scorar lead após enriquecimento"
        trigger: card_moved
        evento_params:
          para_fase: enriquecimento
        prompt: |
          Score 0-100 baseado em {{ tamanho-empresa }} e {{ industria }} e {{ cargo }}.
          Enterprise + ICP industry + decisor (VP/Diretor/C-level) = 90+.
          Mid-market + ICP + Manager = 60-80.
          Small/non-ICP/IC = 30-50.
        acoes:
          - nome: "Preencher score do lead"
            tipo: update_card
            campos:
              - id: score-lead
                modo: fill_with_ai
```

## 🗄️ Database Tables

```yaml
database_tables:
  - id: icp-segmentos
    nome: "ICP / Segmentos"
    descricao: "Lista de indústrias e cargos considerados ICP — referência para o scoring"
    colunas:
      - id: industria
        label: "Indústria"
        tipo: short_text
        obrigatorio: true
      - id: peso-icp
        label: "Peso ICP"
        tipo: number
        obrigatorio: true
      - id: notas
        label: "Notas"
        tipo: long_text
```

## 🪝 Webhooks

```yaml
webhooks:
  - id: webhook-enriquecimento
    nome: "Enriquecer lead (Clearbit / Apollo)"
    url: "{{ enrichment_url }}"
    eventos:
      - card.create
    metodo: POST
    payload_extra:
      template_id: "lead-qualification-routing"

  - id: webhook-calendly
    nome: "Gerar link Calendly para SDR"
    url: "{{ calendly_url }}"
    eventos:
      - card.field_update
    filtro:
      campo_igual:
        campo: status
        valor: "SQL"
    metodo: POST

  - id: webhook-crm
    nome: "Criar lead no CRM"
    url: "{{ crm_url }}"
    eventos:
      - card.move
    filtro:
      fase_destino: oportunidade-aberta
    metodo: POST
    headers:
      Authorization: "Bearer {{ crm_token }}"
```

## 📌 Pós-criação

- **URLs de Clearbit/Apollo, Calendly e CRM** devem ser configuradas com os endpoints reais da sua stack. As variáveis colocadas na criação são placeholders.
- **Configure manualmente via UI** notificações ao SDR quando um lead cair em `Qualificação` (template não inclui emails automatizados).
- **Popule a database table `ICP / Segmentos`** com seus segmentos prioritários — opcionalmente substitua o prompt do agente por uma versão que consulte a tabela.
- **Ajuste o threshold** da automação `auto-avancar-sql` para `score >= {{ score_sql_minimo }}` no editor do Pipefy.
- **Restrinja o formulário público** a campos essenciais — o resto vem do enriquecimento.

---
id: gestao-fornecedores
nome: Gestão de Fornecedores
descricao_curta: Cadastro, homologação e renovação de fornecedores com IA para análise de risco e integração com ERP
categoria: operacoes
versao: 1.0.0
autor: pipefy-template-store
tags: [compras, fornecedores, homologacao, compliance, ia]
icone: 🏭
tempo_estimado_clonagem: "~90 segundos"
fases_count: 6
campos_count: 22
schema_version: 1
requer_ai_agents: true
requer_database_tables: true
---

# Gestão de Fornecedores

## 📖 Sobre este template

Processo completo de gestão de fornecedores: cadastro inicial, análise de
documentação, homologação, contratação e renovação anual. Inclui **AI Agent**
que analisa risco de compliance, **Database Table** centralizada de fornecedores
aprovados, e **Webhook** para sincronização com ERP.

**Indicado para:** empresas com compras descentralizadas e necessidade de
governança (médio porte+).
**Pré-requisitos:** plano Pipefy com AI Agents + Database Tables habilitados.

## 🎯 Resultados esperados

- Padronizar onboarding de fornecedor (de semanas para dias)
- Triagem automática de risco via IA
- Base de fornecedores aprovados centralizada e auditável
- Sincronização automática com ERP via webhook

## ⚙️ Variáveis de clonagem

```yaml
variaveis:
  - nome: nome_do_pipe
    label: "Nome do pipe"
    tipo: string
    default: "Gestão de Fornecedores"
    obrigatorio: true

  - nome: compras_email
    label: "Email do time de Compras"
    tipo: email
    obrigatorio: true

  - nome: compliance_email
    label: "Email do time de Compliance"
    tipo: email
    obrigatorio: true

  - nome: valor_critico
    label: "Valor de contrato considerado crítico (gatilho de revisão extra)"
    tipo: number
    default: 100000
    obrigatorio: true

  - nome: erp_webhook_url
    label: "URL do webhook do ERP (sincronização de fornecedores aprovados)"
    tipo: string
    obrigatorio: false
    placeholder: "https://erp.suaempresa.com/webhooks/fornecedores"

  - nome: erp_webhook_token
    label: "Token de autenticação do webhook ERP"
    tipo: string
    obrigatorio: false
```

## 🏗️ Estrutura do Pipe

```yaml
pipe:
  nome: "{{ nome_do_pipe }}"
  descricao: "Processo de homologação e gestão de fornecedores"
  preferencias:
    icone: "🏭"
    aiAgentsEnabled: true

  fases:
    - id: cadastro-inicial
      nome: "Cadastro Inicial"
      descricao: "Solicitação de cadastro recebida"
      ordem: 1
      campos:
        - id: razao-social
          label: "Razão Social"
          tipo: short_text
          obrigatorio: true
        - id: cnpj
          label: "CNPJ"
          tipo: cnpj
          obrigatorio: true
          unico: true
        - id: categoria
          label: "Categoria"
          tipo: select
          opcoes: ["Serviços", "Produtos", "Software", "Consultoria", "Outros"]
          obrigatorio: true
        - id: contato-comercial
          label: "Contato comercial (email)"
          tipo: email
          obrigatorio: true
        - id: valor-estimado
          label: "Valor estimado anual"
          tipo: currency
          obrigatorio: true
        - id: solicitante
          label: "Solicitante interno"
          tipo: assignee_select
          obrigatorio: true

    - id: documentacao
      nome: "Análise de Documentação"
      descricao: "Documentos enviados, validação inicial"
      ordem: 2
      sla_dias: 5
      campos:
        - id: contrato-social
          label: "Contrato Social"
          tipo: attachment
          obrigatorio: true
        - id: certidoes-negativas
          label: "Certidões negativas (federal, estadual, FGTS, trabalhista)"
          tipo: attachment
          obrigatorio: true
        - id: certidoes-validas
          label: "Certidões validadas"
          tipo: checklist_vertical
          opcoes:
            - "Receita Federal"
            - "Estadual"
            - "FGTS"
            - "Trabalhista"

    - id: analise-risco
      nome: "Análise de Risco (IA)"
      descricao: "IA analisa fornecedor e classifica risco"
      ordem: 3
      sla_dias: 2
      campos:
        - id: nivel-risco
          label: "Nível de risco (preenchido pela IA)"
          tipo: select
          opcoes: ["Baixo", "Médio", "Alto"]
        - id: justificativa-risco
          label: "Justificativa da classificação (IA)"
          tipo: long_text
        - id: requer-aprovacao-compliance
          label: "Requer aprovação de Compliance?"
          tipo: radio_horizontal
          opcoes: ["Sim", "Não"]

    - id: aprovacao
      nome: "Aprovação"
      descricao: "Decisão final de Compras (+ Compliance se necessário)"
      ordem: 4
      sla_dias: 5
      campos:
        - id: aprovado-por
          label: "Aprovado por"
          tipo: assignee_select
        - id: condicoes
          label: "Condições da aprovação"
          tipo: long_text
        - id: data-vigencia-inicio
          label: "Início da vigência"
          tipo: date

    - id: ativo
      nome: "Fornecedor Ativo"
      descricao: "Fornecedor homologado, em operação"
      ordem: 5
      campos:
        - id: data-vencimento-homologacao
          label: "Vencimento da homologação (renovação)"
          tipo: date
          obrigatorio: true
        - id: avaliacoes-periodicas
          label: "Avaliações periódicas"
          tipo: long_text

    - id: arquivado
      nome: "Arquivado"
      descricao: "Fornecedor removido, renovação não realizada ou rejeitado"
      ordem: 6
      done: true
      campos:
        - id: motivo-arquivamento
          label: "Motivo"
          tipo: long_text
```

## 🗄️ Database Tables

```yaml
database_tables:
  - id: fornecedores-aprovados
    nome: "Fornecedores Aprovados"
    descricao: "Tabela mestre de fornecedores homologados, referenciada por outros pipes"
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
      - id: categoria
        label: "Categoria"
        tipo: select
        opcoes: ["Serviços", "Produtos", "Software", "Consultoria", "Outros"]
      - id: nivel-risco
        label: "Nível de risco"
        tipo: select
        opcoes: ["Baixo", "Médio", "Alto"]
      - id: data-homologacao
        label: "Data de homologação"
        tipo: date
      - id: data-vencimento
        label: "Data de vencimento"
        tipo: date
      - id: card-origem
        label: "Card de origem (Pipefy)"
        tipo: short_text
```

## 🧠 AI Agents

```yaml
ai_agents:
  - id: analista-risco
    nome: "Analista de Risco de Fornecedores"

    instruction: |
      Você é um analista de risco de compliance para fornecedores corporativos.
      Analise dados do fornecedor (CNPJ, categoria, valor estimado, certidões
      validadas) e classifique o risco como Baixo, Médio ou Alto.

      Critérios:
      - **Alto**: valor anual acima de {{ valor_critico }}, ou alguma certidão
        não validada, ou categoria "Outros".
      - **Médio**: valor entre 30% e 100% do crítico, todas certidões OK,
        categoria conhecida.
      - **Baixo**: valor abaixo de 30% do crítico, todas certidões OK,
        categoria conhecida.

      Sempre justifique em 2-3 frases. Se faltar dado essencial, classifique
      como Médio e avise no campo de justificativa.

    behaviors:
      - nome: "Classificar risco ao entrar em Análise"
        trigger: card_moved
        evento_params:
          para_fase: analise-risco
        prompt: |
          Analise os campos do card (razao-social, cnpj, categoria,
          valor-estimado, certidoes-validas) e classifique o risco.
          Preencha os campos "nivel-risco" e "justificativa-risco".
          Marque "requer-aprovacao-compliance" como "Sim" se o risco for Alto
          ou se o valor for acima de {{ valor_critico }}.
        acoes:
          - nome: "Preencher classificação"
            tipo: update_card
            campos:
              - id: nivel-risco
                modo: fill_with_ai
              - id: justificativa-risco
                modo: fill_with_ai
              - id: requer-aprovacao-compliance
                modo: fill_with_ai
```

## 🔔 Automações

```yaml
automacoes:
  - id: notificar-compras-cadastro
    nome: "Notificar Compras ao receber novo cadastro"
    quando:
      evento: card_criado_em_fase
      fase: cadastro-inicial
    entao:
      tipo: email
      para: "{{ compras_email }}"
      template: novo-cadastro

  - id: notificar-compliance-alto-risco
    nome: "Notificar Compliance quando risco for Alto"
    quando:
      evento: campo_atualizado
      campo: nivel-risco
    entao:
      tipo: email
      para: "{{ compliance_email }}"
      template: alerta-alto-risco

  - id: criar-na-tabela-aprovados
    nome: "Adicionar à tabela de aprovados quando ativo"
    quando:
      evento: card_movido_para_fase
      fase: ativo
    entao:
      tipo: criar_card
      pipe_destino: fornecedores-aprovados
      campos:
        razao-social: "{{ card.razao-social }}"
        cnpj: "{{ card.cnpj }}"
        categoria: "{{ card.categoria }}"
        nivel-risco: "{{ card.nivel-risco }}"
        data-homologacao: "{{ card.data-vigencia-inicio }}"
        data-vencimento: "{{ card.data-vencimento-homologacao }}"
        card-origem: "{{ card.id }}"
```

## 📧 Email Templates

```yaml
email_templates:
  - id: novo-cadastro
    nome: "Novo cadastro de fornecedor"
    assunto: "Novo fornecedor para análise: {{ card.razao-social }}"
    corpo: |
      Um novo fornecedor foi cadastrado:

      Razão Social: {{ card.razao-social }}
      CNPJ: {{ card.cnpj }}
      Categoria: {{ card.categoria }}
      Valor estimado: {{ card.valor-estimado }}
      Solicitante: {{ card.solicitante }}

      Próximo passo: análise de documentação.
      Acesse: {{ card.url }}
    de: "no-reply@suaempresa.com"

  - id: alerta-alto-risco
    nome: "Alerta de fornecedor de alto risco"
    assunto: "⚠️ Fornecedor classificado como ALTO RISCO: {{ card.razao-social }}"
    corpo: |
      A IA classificou este fornecedor como de ALTO RISCO.

      Razão Social: {{ card.razao-social }}
      CNPJ: {{ card.cnpj }}
      Valor estimado: {{ card.valor-estimado }}

      Justificativa: {{ card.justificativa-risco }}

      Compliance precisa revisar antes da aprovação final.
      Acesse: {{ card.url }}
    de: "no-reply@suaempresa.com"
    cc: ["{{ compras_email }}"]
```

## 🪝 Webhooks

```yaml
webhooks:
  - id: sincronizar-erp
    nome: "Sincronizar fornecedor aprovado com ERP"
    url: "{{ erp_webhook_url }}"
    eventos:
      - card.move
    filtro:
      fase_destino: ativo
    headers:
      Authorization: "Bearer {{ erp_webhook_token }}"
      X-Source: "pipefy-fornecedores"
    metodo: POST
    payload_extra:
      origem: "pipefy"
      template_id: "gestao-fornecedores"
```

## 📌 Pós-clonagem

- Se `erp_webhook_url` não foi fornecida, o webhook é criado mas precisa ser
  habilitado manualmente quando o endpoint estiver pronto.
- Configure permissões: time de Compras vê tudo, Compliance vê apenas a partir
  de Análise de Risco, fornecedor (externo) não tem acesso.
- Adicione campo de "Avaliação Anual" como pipe relation se quiser conectar com
  pipe de avaliações periódicas.
- O webhook de sincronização com ERP é unidirecional (Pipefy → ERP). Se quiser
  sincronização inversa, configure receptor de webhook no Pipefy via API.

## 🔄 Mapeamento MCP

```yaml
mapeamento_mcp:
  ordem_execucao:
    - create_pipe
    - create_database_table              # antes dos campos connector
    - create_phase × 6
    - create_field × 22
    - create_email_template × 2
    - create_automation × 3
    - get_pipe                            # antes do AI Agent
    - get_automation_events
    - get_automation_actions
    - validate_ai_agent_behaviors        # pré-validação
    - create_ai_agent × 1
    - create_webhook × 1
```

---
id: customer-onboarding-kyc
nome: Onboarding de Cliente com KYC (PF/PJ)
descricao_curta: Onboarding completo de cliente com extração KYC adaptada para PF/PJ, validações automatizadas e integração com CRM/análise de crédito.
categoria: customer-success
versao: 1.1.0
schema_version: 1
autor: pipefy-template-store
tags: [customer-success, onboarding, kyc, doc-extraction, compliance, ia]
icone: 🤝
tempo_estimado_criacao: "~75 segundos"
fases_count: 5
campos_count: 22
requer_ai_agents: true
requer_database_tables: false
---

# Onboarding de Cliente com KYC (PF/PJ)

## 🤝 Sobre este template

Pipe orquestra o onboarding ponta-a-ponta de novos clientes (pessoa física ou pessoa jurídica), com KYC documental robusto, integração com serviços de PEP/sanctions, análise de crédito opcional e ativação no CRM. O processo é Process-heavy por design — KYC mal feito vira passivo regulatório, então cada etapa é explicitamente checada.

A IA carrega o coração do processo: ao receber os documentos, um agente especializado em extração KYC reconhece se é PF ou PJ, extrai os campos exigidos do documento correto (RG/CPF + comprovante endereço + IR para PF; Cartão CNPJ + contrato social + IR PJ para PJ), valida cruzamento de dados e indica pendências de forma estruturada. Após validação, automações disparam consultas a PEP/sanctions e ao CRM.

## 🎯 Resultados esperados

- KYC consistente entre PF e PJ — mesmo agente, schema diferente por tipo.
- Refresh periódico mantém base KYC viva (não envelhece em silêncio).
- Integração automatizada com CRM elimina retrabalho de cadastro manual.
- Análise de crédito opcional via sub-pipe (não polui o fluxo principal).
- Tempo de onboarding cai de semanas para dias úteis.

## ⚙️ Variáveis de criação

```yaml
variaveis:
  - nome: nome_do_pipe
    label: "Nome do pipe"
    tipo: string
    default: "Onboarding de Clientes"
    obrigatorio: true

  - nome: cs_responsavel_email
    label: "Email do CS responsável pelo onboarding"
    tipo: email
    obrigatorio: true

  - nome: webhook_pep_sanctions_url
    label: "URL do serviço de PEP/sanctions check"
    tipo: string
    placeholder: "https://compliance-api.suaempresa/check"
    obrigatorio: false

  - nome: webhook_pep_token
    label: "Token do serviço de PEP/sanctions"
    tipo: string
    obrigatorio: false

  - nome: webhook_crm_url
    label: "URL do CRM para criar conta após aprovação"
    tipo: string
    placeholder: "https://crm.suaempresa/api/accounts"
    obrigatorio: false

  - nome: webhook_crm_token
    label: "Token do CRM"
    tipo: string
    obrigatorio: false

  - nome: pipe_analise_credito_id
    label: "ID do pipe de Análise de Crédito (opcional, para sub-fluxo)"
    tipo: string
    obrigatorio: false
```

## 🏗️ Estrutura do Pipe

```yaml
pipe:
  nome: "{{ nome_do_pipe }}"
  descricao: "Onboarding completo de cliente com KYC PF/PJ e ativação no CRM"
  preferencias:
    icone: "🤝"
    aiAgentsEnabled: true

  fases:
    - id: cadastro-inicial
      nome: "Cadastro inicial"
      ordem: 1
      done: false
      sla_dias: 2
      descricao: "Dados de contato e identificação básica do cliente."
      campos:
        - id: nome-razao
          label: "Nome / Razão social"
          tipo: short_text
          obrigatorio: true
        - id: cpf-cnpj
          label: "CPF ou CNPJ"
          tipo: short_text
          obrigatorio: true
        - id: tipo-cliente
          label: "Tipo"
          tipo: radio_horizontal
          opcoes: [PF, PJ]
          obrigatorio: true
        - id: email-cliente
          label: "Email do cliente"
          tipo: email
          obrigatorio: true
        - id: telefone-cliente
          label: "Telefone"
          tipo: phone

    - id: documentos
      nome: "Documentos"
      ordem: 2
      done: false
      sla_dias: 5
      descricao: "Upload dos documentos KYC. IA extrai e valida automaticamente."
      campos:
        - id: anexo-identidade
          label: "Anexo de identidade (RG/CNH ou Cartão CNPJ)"
          tipo: attachment
          obrigatorio: true
        - id: anexo-comprovante-endereco
          label: "Comprovante de endereço (PF) ou Contrato social (PJ)"
          tipo: attachment
          obrigatorio: true
        - id: anexo-ir
          label: "Última declaração de IR (PF) ou IR PJ / DRE"
          tipo: attachment
        - id: dados-extraidos
          label: "Dados extraídos pela IA (JSON)"
          tipo: long_text

    - id: validacao
      nome: "Validação"
      ordem: 3
      done: false
      sla_dias: 3
      descricao: "Checks automáticos de PEP, sanctions e risco fiscal."
      campos:
        - id: validacao-documentos
          label: "Validação documental"
          tipo: radio_horizontal
          opcoes: [OK, Pendência, Reprovado]
        - id: pep-check
          label: "PEP check"
          tipo: radio_horizontal
          opcoes: [Limpo, Listado, Pendente]
        - id: sanctions-check
          label: "Sanctions check"
          tipo: radio_horizontal
          opcoes: [Limpo, Listado, Pendente]
        - id: risco-fiscal
          label: "Risco fiscal"
          tipo: select
          opcoes: [Baixo, Médio, Alto]
        - id: pendencias-validacao
          label: "Pendências encontradas"
          tipo: long_text

    - id: analise-credito
      nome: "Análise de Crédito (opcional)"
      ordem: 4
      done: false
      sla_dias: 5
      descricao: "Etapa opcional para clientes que precisam de limite/crédito."
      campos:
        - id: score-credito
          label: "Score de crédito"
          tipo: number
        - id: limite-proposto
          label: "Limite proposto"
          tipo: currency
          moeda: "BRL"
        - id: aprovador-credito
          label: "Aprovador de crédito"
          tipo: assignee_select
        - id: parecer-credito
          label: "Parecer de crédito"
          tipo: long_text

    - id: aprovado
      nome: "Aprovado"
      ordem: 5
      done: true
      descricao: "Cliente aprovado, conta criada no CRM."
      campos:
        - id: id-cliente-crm
          label: "ID do cliente no CRM"
          tipo: short_text
        - id: plano-contratado
          label: "Plano contratado"
          tipo: select
          opcoes: [Starter, Pro, Business, Enterprise]
        - id: data-ativacao
          label: "Data de ativação"
          tipo: date
```

## 🔔 Automações

```yaml
automacoes:
  - id: disparar-pep-sanctions
    nome: "Disparar PEP/sanctions ao entrar em Validação"
    quando:
      evento: card_moved_to_phase
      fase: validacao
    entao:
      tipo: send_http_request
      webhook_id: pep-sanctions-check

  - id: criar-conta-crm-aprovado
    nome: "Criar conta no CRM ao aprovar"
    quando:
      evento: card_moved_to_phase
      fase: aprovado
    entao:
      tipo: send_http_request
      webhook_id: crm-criar-conta

  - id: pular-credito-se-nao-aplicavel
    nome: "Mover direto para Aprovado quando crédito não aplicável"
    quando:
      evento: field_updated
      campo: validacao-documentos
    entao:
      tipo: move_single_card
      fase_destino: aprovado
```

## 🧠 AI Agents

```yaml
ai_agents:
  - id: extrator-kyc-pf-pj
    nome: "Extrator KYC PF/PJ"
    instruction: |
      Você é um agente especializado em extração e validação KYC (Know Your Customer)
      para clientes Pessoa Física (PF) e Pessoa Jurídica (PJ). Reconheça o tipo a partir
      do campo {{ tipo-cliente }} do card e aplique o schema correspondente. Nunca
      invente dados — quando um campo estiver ilegível, marque "ILEGIVEL". Quando o
      documento não bater com o esperado, marque "DOCUMENTO_INVALIDO". Seu output
      alimenta automações de PEP/sanctions/CRM, então precisa ser estruturado e literal.

    behaviors:
      - nome: "Extrair e validar KYC ao receber documentos"
        trigger: card_moved
        evento_params:
          para_fase: documentos
        prompt: |
          Você é um agente especializado em extração KYC para clientes PF e PJ.

          ENTRADA:
          - Tipo cliente: {{ tipo-cliente }} (PF ou PJ)
          - CPF/CNPJ informado: {{ cpf-cnpj }}
          - Nome/Razão social: {{ nome-razao }}
          - Documento de identidade: {{ anexo-identidade }}
          - Comprovante de endereço (PF) ou Contrato social (PJ): {{ anexo-comprovante-endereco }}
          - IR / DRE: {{ anexo-ir }}

          TAREFA:

          Se tipo = PF, extraia EXATAMENTE:
          1. CPF (11 dígitos numéricos, sem formatação)
          2. Nome completo
          3. Data de nascimento (YYYY-MM-DD)
          4. RG ou CNH (número e órgão emissor)
          5. Endereço completo (logradouro, número, complemento, bairro, CEP, município, UF)
          6. Renda declarada (do IR, se disponível)

          Se tipo = PJ, extraia EXATAMENTE:
          1. CNPJ (14 dígitos numéricos, sem formatação)
          2. Razão social
          3. Nome fantasia (se existir)
          4. Endereço completo (logradouro, número, complemento, bairro, CEP, município, UF)
          5. Situação cadastral (Ativa / Suspensa / Inapta / Baixada)
          6. Data de abertura (YYYY-MM-DD)
          7. Atividade principal (CNAE)
          8. Quadro societário (lista de sócios com nome e participação, se contrato social legível)
          9. Faturamento anual (do DRE/IR PJ, se disponível)

          REGRAS:
          - Não invente nem complete valores ilegíveis. Indique "ILEGIVEL" no campo.
          - Se o documento NÃO bater com o tipo declarado (ex: tipo PJ mas anexo é RG) → "DOCUMENTO_INVALIDO".
          - Compare CPF/CNPJ extraído com o informado no card. Se divergente → "CPF_DIVERGENTE" ou "CNPJ_DIVERGENTE".
          - PJ com situação cadastral diferente de "Ativa" → "PENDENCIA: <situação>".
          - PF com endereço incompatível com comprovante → "ENDERECO_DIVERGENTE".

          FORMATO DE SAÍDA (JSON obrigatório):

          Para PF:
          {
            "tipo": "PF",
            "cpf": "11 dígitos",
            "nome_completo": "texto",
            "data_nascimento": "YYYY-MM-DD",
            "documento_identidade": {"tipo": "RG|CNH", "numero": "...", "orgao_emissor": "..."},
            "endereco": {"logradouro": "...", "numero": "...", "cep": "...", "municipio": "...", "uf": "XX"},
            "renda_declarada": "valor ou null",
            "pendencias": ["..."]
          }

          Para PJ:
          {
            "tipo": "PJ",
            "cnpj": "14 dígitos",
            "razao_social": "texto",
            "nome_fantasia": "texto ou null",
            "endereco": {"logradouro": "...", "numero": "...", "cep": "...", "municipio": "...", "uf": "XX"},
            "situacao_cadastral": "Ativa|Suspensa|Inapta|Baixada",
            "data_abertura": "YYYY-MM-DD",
            "cnae_principal": "código + descrição",
            "socios": [{"nome": "...", "participacao_pct": 0}],
            "faturamento_anual": "valor ou null",
            "pendencias": ["..."]
          }

          EXEMPLO (PJ):
          Input: cartão CNPJ Empresa ABC LTDA, CNPJ 12.345.678/0001-99
          Output:
          {
            "tipo": "PJ",
            "cnpj": "12345678000199",
            "razao_social": "EMPRESA ABC LTDA",
            "nome_fantasia": "ABC",
            "endereco": {"logradouro": "Av. Paulista", "numero": "1000", "cep": "01310-100", "municipio": "São Paulo", "uf": "SP"},
            "situacao_cadastral": "Ativa",
            "data_abertura": "2010-05-15",
            "cnae_principal": "62.04-0/00 Consultoria em TI",
            "socios": [],
            "faturamento_anual": null,
            "pendencias": []
          }

          Preencha:
          - dados-extraidos com o JSON completo
          - validacao-documentos com OK (sem pendências), Pendência (alertas leves) ou Reprovado (DOCUMENTO_INVALIDO ou CPF/CNPJ_DIVERGENTE)
          - pendencias-validacao com a lista textual das pendências encontradas

        acoes:
          - tipo: update_card
            campos:
              - id: dados-extraidos
                modo: fill_with_ai
              - id: validacao-documentos
                modo: fill_with_ai
              - id: pendencias-validacao
                modo: fill_with_ai
```

## 🔗 Pipe Relations

```yaml
pipe_relations:
  - id: rel-analise-credito
    nome: "Análise de Crédito (sub-pipe)"
    pipe_filho_externo: "{{ pipe_analise_credito_id }}"
    cardinalidade: one_to_one
    auto_fill: false
    nome_no_filho: "Onboarding origem"
    descricao: "Sub-pipe acionado para clientes que precisam de análise de crédito antes da ativação."
```

## 🪝 Webhooks

```yaml
webhooks:
  - id: pep-sanctions-check
    nome: "PEP / Sanctions check externo"
    url: "{{ webhook_pep_sanctions_url }}"
    eventos:
      - card.move
    filtro:
      fase_destino: validacao
    headers:
      Authorization: "Bearer {{ webhook_pep_token }}"
    metodo: POST
    payload_extra:
      origem: "pipefy-onboarding-kyc"

  - id: crm-criar-conta
    nome: "Criar conta no CRM ao aprovar"
    url: "{{ webhook_crm_url }}"
    eventos:
      - card.move
    filtro:
      fase_destino: aprovado
    headers:
      Authorization: "Bearer {{ webhook_crm_token }}"
    metodo: POST
    payload_extra:
      origem: "pipefy-onboarding-kyc"
```

## 📌 Pós-criação

1. **Configurar notificações por email manualmente via UI** — o template não automatiza emails. Crie via Pipefy UI: alerta para `{{ cs_responsavel_email }}` quando card chega em "Validação" com `validacao-documentos = Pendência` ou `= Reprovado`, e notificação para o cliente (campo `email-cliente`) quando aprovado.
2. **Apontar `pipe_analise_credito_id`** — caso use sub-pipe de crédito, informe o ID na criação. Se deixar em branco, a relação será criada como skeleton (resolva depois).
3. **Configurar os webhooks** — sem URL e token de PEP/sanctions e CRM, as automações ficam dormentes. Configure as URLs reais antes de subir o primeiro card real.
4. **Habilitar scheduler de refresh KYC** (Pipefy UI → Automations) para reabrir cards de clientes ativos a cada 12 meses (PF) ou 24 meses (PJ). Refresh evita base envelhecida em silêncio.
5. **Validar com um card de teste por tipo** — submeta um PF e um PJ com documentos reais (anonimizados) e confira a saída JSON do agente. Refine o prompt se a extração estiver fraca para algum tipo de documento específico.
6. **Membros do pipe** — adicione o time de CS e o aprovador de crédito como membros antes de subir tráfego real.

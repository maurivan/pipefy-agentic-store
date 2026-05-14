---
id: vendor-onboarding-kyc
nome: Vendor Onboarding (KYC Fornecedor)
categoria: operacoes
versao: 1.0.0
schema_version: 1
descricao_curta: KYC de fornecedor com extração estruturada do Cartão CNPJ, validação documental, check PEP/sanções e refresh automático a cada 12 meses.
autor: pipefy-template-store
tags: [kyc, fornecedores, compliance, doc-extraction, ia, onboarding]
icone: 🏭
tempo_estimado_criacao: "~80 segundos"
fases_count: 5
campos_count: 22
requer_ai_agents: true
requer_database_tables: true
---

# Vendor Onboarding (KYC Fornecedor)

## 📖 Sobre este template

Pipeline de **Know-Your-Customer para fornecedores**: cadastro inicial, validação documental por IA (extração estruturada do Cartão CNPJ da Receita Federal), análise de compliance (PEP / sanções / risco fiscal), aprovação final e ativação no ERP. Inclui scheduler de refresh anual.

**Indicado para:** empresas com 20-500 fornecedores ativos sujeitas a compliance (financeiro, saúde, setor público). **Não indicado para:** organizações que já têm KYC dedicado (ComplyAdvantage, Refinitiv World-Check) totalmente integrado ao ERP.

## 🎯 Resultados esperados

- Reduzir tempo de homologação documental de dias para minutos via extração por IA.
- Output schema rígido (JSON) eliminando ambiguidade de dados do CNPJ.
- Detecção automática de divergência entre CNPJ informado e CNPJ no documento.
- Refresh KYC automático evitando fornecedores stale.
- Trilha de auditoria completa: documento, pendências, decisão, aprovador.

## ⚙️ Variáveis de criação

```yaml
variaveis:
  - nome: nome_do_pipe
    label: "Nome do pipe"
    tipo: string
    default: "Vendor Onboarding (KYC)"
    obrigatorio: true

  - nome: webhook_pep_sanctions_url
    label: "URL do serviço externo de PEP / Sanções (Receita Federal, OFAC, BACEN)"
    tipo: string
    obrigatorio: true
    placeholder: "https://compliance.suaempresa.com/api/pep-check"

  - nome: webhook_erp_fornecedor_url
    label: "URL do webhook do ERP para criar registro de fornecedor"
    tipo: string
    obrigatorio: true
    placeholder: "https://erp.suaempresa.com/api/vendors"

  - nome: organization_id
    label: "ID da sua organização Pipefy (para criar a Database Table)"
    tipo: string
    obrigatorio: true
```

## 🏗️ Estrutura do Pipe

```yaml
pipe:
  nome: "{{ nome_do_pipe }}"
  descricao: "KYC e homologação cadastral de fornecedores."
  preferencias:
    icone: "🏭"
    aiAgentsEnabled: true

  fases:
    - id: cadastro-inicial
      nome: "Cadastro Inicial"
      descricao: "Fornecedor envia documentação básica"
      ordem: 1
      campos:
        - id: razao_social
          label: "Razão social"
          tipo: short_text
          obrigatorio: true
        - id: cnpj
          label: "CNPJ"
          tipo: cnpj
          obrigatorio: true
        - id: email_contato
          label: "Email"
          tipo: email
          obrigatorio: true
        - id: telefone
          label: "Telefone"
          tipo: phone
        - id: pessoa_contato
          label: "Pessoa de contato"
          tipo: short_text
        - id: cartao_cnpj
          label: "Cartão CNPJ"
          tipo: attachment
          obrigatorio: true
        - id: contrato_social
          label: "Contrato social"
          tipo: attachment
          obrigatorio: true
        - id: comprovante_endereco
          label: "Comprovante de endereço"
          tipo: attachment
        - id: inscricao_estadual
          label: "Inscrição estadual"
          tipo: short_text

    - id: validacao-documental
      nome: "Validação Documental"
      descricao: "Agente extrai dados do Cartão CNPJ e valida"
      ordem: 2
      sla_dias: 1
      campos:
        - id: dados_extraidos
          label: "Dados extraídos (JSON)"
          tipo: long_text
        - id: status_validacao
          label: "Status validação"
          tipo: radio_horizontal
          opcoes: ["OK", "Pendência", "Reprovado"]
        - id: pendencias_detectadas
          label: "Pendências detectadas"
          tipo: long_text

    - id: analise-compliance
      nome: "Análise Compliance"
      descricao: "Verificação PEP, sanções e risco fiscal"
      ordem: 3
      sla_dias: 2
      campos:
        - id: pep_check
          label: "PEP check"
          tipo: radio_horizontal
          opcoes: ["Sim", "Não"]
        - id: sancoes_check
          label: "Sanções check"
          tipo: radio_horizontal
          opcoes: ["Sim", "Não"]
        - id: risco_fiscal
          label: "Risco fiscal"
          tipo: radio_horizontal
          opcoes: ["Baixo", "Médio", "Alto"]

    - id: aprovacao-final
      nome: "Aprovação Final"
      descricao: "Decisão final e validade KYC"
      ordem: 4
      sla_dias: 2
      campos:
        - id: decisao_final
          label: "Decisão"
          tipo: radio_horizontal
          opcoes: ["Aprovado", "Reprovado", "Pendência"]
        - id: aprovador
          label: "Aprovador"
          tipo: assignee_select
        - id: data_validade_kyc
          label: "Data validade KYC (auto +12 meses)"
          tipo: date

    - id: ativo-no-erp
      nome: "Ativo no ERP"
      descricao: "Fornecedor ativo e disponível para contratação"
      ordem: 5
      done: true
      campos:
        - id: id_no_erp
          label: "ID no ERP"
          tipo: short_text
        - id: data_ativacao
          label: "Data ativação"
          tipo: date
```

## 🔔 Automações

```yaml
automacoes:
  - id: auto-move-validacao-ok
    nome: "Auto-move para Análise Compliance quando validação OK"
    quando:
      evento: campo_atualizado
      campo: status_validacao
    entao:
      tipo: mover_card
      fase_destino: analise-compliance

  - id: webhook-pep-sanctions
    nome: "Disparar consulta PEP/Sanções"
    quando:
      evento: card_movido_para_fase
      fase: analise-compliance
    entao:
      tipo: enviar_webhook
      webhook_id: webhook-pep-check

  - id: webhook-erp-criar-fornecedor
    nome: "Criar fornecedor no ERP ao aprovar"
    quando:
      evento: campo_atualizado
      campo: decisao_final
    entao:
      tipo: enviar_webhook
      webhook_id: webhook-erp-vendor
```

## 🧠 AI Agents

```yaml
ai_agents:
  - id: extracao-cartao-cnpj
    nome: "Extração de dados do Cartão CNPJ"
    instruction: |
      Você é um agente especializado em extração de dados do Cartão CNPJ da Receita Federal (Comprovante de Inscrição e Situação Cadastral).

      ENTRADA: anexo PDF no campo {{ Cartão CNPJ }}.

      TAREFA: extraia EXATAMENTE os seguintes campos do documento:
      1. CNPJ (14 dígitos numéricos, sem formatação)
      2. Razão social
      3. Nome fantasia (se existir)
      4. Endereço completo (logradouro, número, complemento, bairro, CEP, município, UF)
      5. Situação cadastral (Ativa / Suspensa / Inapta / Baixada)
      6. Data de abertura (formato YYYY-MM-DD)
      7. Atividade principal (CNAE)

      REGRAS:
      - Não invente nem complete valores ilegíveis. Indique "ILEGIVEL" no campo.
      - Se o documento NÃO for um Cartão CNPJ válido → retorne erro "DOCUMENTO_INVALIDO".
      - Compare o CNPJ extraído com o CNPJ informado no card. Se divergente → marque "CNPJ_DIVERGENTE".
      - Status cadastral diferente de "Ativa" → marque "PENDENCIA: <situação>".

      FORMATO DE SAÍDA (JSON obrigatório):
      {
        "cnpj": "14 dígitos numéricos",
        "razao_social": "texto",
        "nome_fantasia": "texto ou null",
        "endereco": {"logradouro": "...", "numero": "...", "cep": "...", "municipio": "...", "uf": "XX"},
        "situacao_cadastral": "Ativa|Suspensa|Inapta|Baixada",
        "data_abertura": "YYYY-MM-DD",
        "cnae_principal": "código + descrição",
        "pendencias": ["array de strings", ...]
      }

      EXEMPLO:
      Input: cartão CNPJ Empresa ABC LTDA, CNPJ 12.345.678/0001-99
      Output:
      {
        "cnpj": "12345678000199",
        "razao_social": "EMPRESA ABC LTDA",
        "nome_fantasia": "ABC",
        "endereco": {"logradouro": "Av. Paulista", "numero": "1000", "cep": "01310-100", "municipio": "São Paulo", "uf": "SP"},
        "situacao_cadastral": "Ativa",
        "data_abertura": "2010-05-15",
        "cnae_principal": "62.04-0/00 Consultoria em TI",
        "pendencias": []
      }
    behaviors:
      - nome: "Extrair dados ao entrar em Validação Documental"
        trigger: card_moved
        evento_params:
          para_fase: validacao-documental
        prompt: |
          Quando o card entrar na fase Validação Documental, leia o anexo do campo cartao_cnpj, execute a extração no formato JSON definido na instruction, escreva o JSON em dados_extraidos e atualize status_validacao (OK se sem pendências; Pendência se houver alertas; Reprovado se DOCUMENTO_INVALIDO ou CNPJ_DIVERGENTE). Liste itens em pendencias_detectadas.
        acoes:
          - nome: "Preencher dados extraídos + status"
            tipo: update_card
            campos:
              - id: dados_extraidos
                modo: fill_with_ai
              - id: status_validacao
                modo: fill_with_ai
              - id: pendencias_detectadas
                modo: fill_with_ai
```

## 🗄️ Database Tables

```yaml
database_tables:
  - id: db_fornecedores_homologados
    nome: "Fornecedores Homologados"
    descricao: "Fornecedores aprovados via KYC, com data de validade"
    colunas:
      - id: razao_social
        label: "Razão Social"
        tipo: short_text
        obrigatorio: true
      - id: cnpj
        label: "CNPJ"
        tipo: cnpj
        unico: true
        obrigatorio: true
      - id: id_erp
        label: "ID no ERP"
        tipo: short_text
      - id: data_validade_kyc
        label: "Data validade KYC"
        tipo: date
      - id: risco_fiscal
        label: "Risco fiscal"
        tipo: select
        opcoes: ["Baixo", "Médio", "Alto"]
      - id: status
        label: "Status"
        tipo: select
        opcoes: ["Ativo", "Inativo", "Em renovação"]
```

## 🪝 Webhooks

```yaml
webhooks:
  - id: webhook-pep-check
    nome: "Consulta PEP / Sanções"
    url: "{{ webhook_pep_sanctions_url }}"
    eventos:
      - card.move
    filtro:
      fase_destino: analise-compliance
    metodo: POST
    headers:
      X-Source: "pipefy-template-store"

  - id: webhook-erp-vendor
    nome: "Criar fornecedor no ERP"
    url: "{{ webhook_erp_fornecedor_url }}"
    eventos:
      - card.field_update
    filtro:
      campo_igual:
        campo: decisao_final
        valor: Aprovado
    metodo: POST
    headers:
      X-Source: "pipefy-template-store"
```

## 📌 Pós-criação

- Configure as URLs reais dos webhooks PEP/Sanções e ERP durante a criação.
- Configure a regra de validação básica de CNPJ via regex (14 dígitos) como **automação manual via UI** se o seu plano permitir validação por regex em campo.
- Configure manualmente via UI um **scheduler mensal** que cria card de refresh quando `data_validade_kyc - hoje < 30 dias`. O template não inclui scheduler nativo.
- Configure manualmente notificação por email para o fornecedor quando houver pendência (não incluída neste template).
- Popule a Database Table **Fornecedores Homologados** com fornecedores legados (CSV import) antes de operar o pipe.
- Adicione os aprovadores e analistas de compliance como membros do pipe.

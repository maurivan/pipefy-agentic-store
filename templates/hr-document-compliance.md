---
id: hr-document-compliance
nome: Compliance de Documentos de RH
descricao_curta: Gestão de certificações e exames ocupacionais (NR-10/NR-35/ASO) com validação por IA e alertas preventivos de vencimento.
categoria: rh
versao: 1.0.0
schema_version: 1
autor: pipefy-template-store
tags: [rh, compliance, certificacoes, nr, aso, ia]
icone: 📋
tempo_estimado_criacao: "~50 segundos"
fases_count: 4
campos_count: 12
requer_ai_agents: true
requer_database_tables: true
---

# Compliance de Documentos de RH

## 📖 Sobre este template

Esteira de controle de certificações e exames ocupacionais dos colaboradores (NR-10, NR-35, ASO periódico, certificações técnicas). O processo garante que nenhum funcionário trabalhe com documento vencido — fundamental para evitar passivo trabalhista e multas regulatórias.

A IA atua na entrada dos documentos: lê o certificado anexado, confere se o tipo bate com o esperado, extrai data de validade e valida que o nome do funcionário corresponde ao cadastrado no card. Alertas preventivos disparam 60 dias antes do vencimento, e cards vencidos podem acionar bloqueio automático de acesso via webhook.

## 🎯 Resultados esperados

- Zero documentos vencidos sem ação corretiva — alertas preventivos 60 dias antes.
- Triagem documental automatizada elimina conferência manual repetitiva.
- Trilha de auditoria completa por funcionário, tipo de documento e data.
- Integração com sistema de controle de acesso para bloqueio automático de vencidos.
- Histórico consolidado por funcionário facilita auditorias internas e fiscais.

## ⚙️ Variáveis de criação

```yaml
variaveis:
  - nome: nome_do_pipe
    label: "Nome do pipe"
    tipo: string
    default: "Compliance de Documentos RH"
    obrigatorio: true

  - nome: rh_responsavel_email
    label: "Email do responsável de RH"
    tipo: email
    obrigatorio: true

  - nome: dias_alerta_vencimento
    label: "Quantos dias antes do vencimento disparar alerta"
    tipo: number
    default: 60
    obrigatorio: true

  - nome: webhook_bloqueio_acesso_url
    label: "URL do webhook para bloquear acesso em caso de documento vencido"
    tipo: string
    placeholder: "https://seu-sistema-acesso/api/bloquear"
    obrigatorio: false

  - nome: webhook_bloqueio_acesso_token
    label: "Token de autorização do webhook de bloqueio"
    tipo: string
    obrigatorio: false
```

## 🏗️ Estrutura do Pipe

```yaml
pipe:
  nome: "{{ nome_do_pipe }}"
  descricao: "Gestão de certificações, exames ocupacionais e documentos com prazo de validade"
  preferencias:
    icone: "📋"
    aiAgentsEnabled: true

  fases:
    - id: cadastro
      nome: "Cadastro"
      ordem: 1
      done: false
      sla_dias: 2
      descricao: "Cadastro inicial do funcionário e do documento a controlar."
      campos:
        - id: funcionario
          label: "Funcionário"
          tipo: assignee_select
          obrigatorio: true
        - id: tipo-documento
          label: "Tipo de documento"
          tipo: select
          opcoes: [NR-10, NR-35, ASO Periódico, ASO Admissional, Certificação Técnica, Curso Obrigatório, Outro]
          obrigatorio: true
        - id: data-emissao
          label: "Data de emissão"
          tipo: date
          obrigatorio: true
        - id: data-validade
          label: "Data de validade"
          tipo: date
          obrigatorio: true
        - id: anexo-certificado-inicial
          label: "Anexo do certificado"
          tipo: attachment
          obrigatorio: true

    - id: documento-ativo
      nome: "Documento ativo"
      ordem: 2
      done: false
      lateAfter: 30
      descricao: "Documento vigente — monitorado por scheduler diário."
      campos:
        - id: anexo-certificado
          label: "Anexo certificado vigente"
          tipo: attachment
          obrigatorio: true
        - id: status-documento
          label: "Status"
          tipo: radio_horizontal
          opcoes: [Válido, Próximo vencimento, Vencido]
        - id: entidade-emissora
          label: "Entidade emissora"
          tipo: short_text
        - id: dados-extraidos
          label: "Dados extraídos pela IA (JSON)"
          tipo: long_text

    - id: renovacao
      nome: "Renovação"
      ordem: 3
      done: false
      sla_dias: 30
      descricao: "Documento próximo do vencimento — agendar renovação."
      campos:
        - id: data-agendamento-renovacao
          label: "Data de agendamento da renovação"
          tipo: date
        - id: renovacao-concluida
          label: "Renovação concluída?"
          tipo: radio_horizontal
          opcoes: [Sim, Não]
        - id: novo-documento
          label: "Novo documento renovado"
          tipo: attachment

    - id: historico
      nome: "Histórico"
      ordem: 4
      done: true
      descricao: "Documento arquivado para histórico — renovação efetuada ou substituída."
      campos: []
```

## 🔔 Automações

```yaml
automacoes:
  - id: bloqueio-acesso-vencido
    nome: "Bloqueio de acesso ao vencer"
    quando:
      evento: campo_atualizado
      campo: status-documento
    entao:
      tipo: enviar_webhook
      webhook_id: bloqueio-acesso

  - id: mover-renovacao-quando-proximo
    nome: "Mover para Renovação ao detectar status próximo vencimento"
    quando:
      evento: campo_atualizado
      campo: status-documento
    entao:
      tipo: mover_card
      fase_destino: renovacao

  - id: arquivar-pos-renovacao
    nome: "Arquivar quando renovação concluída"
    quando:
      evento: campo_atualizado
      campo: renovacao-concluida
    entao:
      tipo: mover_card
      fase_destino: historico
```

## 🧠 AI Agents

```yaml
ai_agents:
  - id: validador-documento-rh
    nome: "Validador de Documento RH"
    instruction: |
      Você é um agente de compliance que valida certificações e exames ocupacionais
      (NR-10, NR-35, ASO, certificações técnicas). Sua missão é, ao receber um anexo
      novo, confirmar que o documento bate com o tipo esperado, extrair data de
      validade e entidade emissora, e validar que o nome do funcionário corresponde
      ao cadastrado no card. Nunca invente dados — quando o documento estiver ilegível,
      marque explicitamente como "ILEGIVEL". Seu output alimenta automações de
      bloqueio, então precisa ser literal e estruturado.

    behaviors:
      - nome: "Validar documento ao anexar"
        trigger: field_updated
        evento_params:
          campos_disparadores: [anexo-certificado]
        prompt: |
          Você valida documento de certificação/exame ocupacional.

          ENTRADA: anexo {{ anexo-certificado }}, tipo esperado {{ tipo-documento }},
          funcionário do card {{ funcionario }}.

          TAREFA:
          1. Confirme que o anexo é do tipo {{ tipo-documento }}.
          2. Extraia: Nome do funcionário, data emissão, data validade, entidade emissora.
          3. Compare Nome com {{ funcionario }}.
          4. Verifique data validade > hoje.

          REGRAS:
          - Tipo errado → status "TIPO_INVALIDO".
          - Nome divergente → status "NOME_DIVERGENTE".
          - Validade já expirada → status "JA_VENCIDO".
          - Sem data legível → status "DATA_AUSENTE".
          - Tudo OK → status "Válido".

          FORMATO (JSON):
          {
            "valido": bool,
            "data_validade": "YYYY-MM-DD",
            "entidade_emissora": "texto",
            "alertas": ["..."]
          }

          Preencha:
          - dados-extraidos com o JSON completo
          - status-documento com Válido / Próximo vencimento / Vencido conforme a data extraída
          - entidade-emissora com o nome do emissor
          - data-validade com a data extraída (sobrescreva se diferente do cadastrado)

        acoes:
          - tipo: update_card
            campos:
              - id: dados-extraidos
                modo: fill_with_ai
              - id: status-documento
                modo: fill_with_ai
              - id: entidade-emissora
                modo: fill_with_ai
              - id: data-validade
                modo: fill_with_ai
```

## 🗄️ Database Tables

```yaml
database_tables:
  - id: db-tipos-documentos-rh
    nome: "DB Tipos de Documentos RH"
    descricao: "Catálogo de tipos de documentos controlados, com periodicidade e área responsável."
    colunas:
      - id: tipo
        label: "Tipo de documento"
        tipo: short_text
        obrigatorio: true
        unico: true
      - id: periodicidade-meses
        label: "Periodicidade (meses)"
        tipo: number
        obrigatorio: true
      - id: area-responsavel
        label: "Área responsável"
        tipo: select
        opcoes: [SESMT, RH, Treinamento, TI]
      - id: regulamentacao
        label: "Regulamentação base"
        tipo: short_text
      - id: ativo
        label: "Ativo?"
        tipo: radio_horizontal
        opcoes: [Sim, Não]
```

## 🪝 Webhooks

```yaml
webhooks:
  - id: bloqueio-acesso
    nome: "Bloquear acesso quando documento vencido"
    url: "{{ webhook_bloqueio_acesso_url }}"
    eventos:
      - card.field_update
    filtro:
      campo_igual:
        campo: status-documento
        valor: Vencido
    headers:
      Authorization: "Bearer {{ webhook_bloqueio_acesso_token }}"
      X-Source: "pipefy-hr-compliance"
    metodo: POST
    payload_extra:
      origem: "pipefy"
      acao: "bloquear_acesso"
```

## 📌 Pós-criação

1. **Popular a database `DB Tipos de Documentos RH`** com os documentos que sua empresa controla (NR-10 a cada 2 anos, ASO anual, etc.) — o template já lista os tipos no dropdown, mas a tabela serve como referência cruzada.
2. **Configurar notificações por email manualmente via UI** — o template intencionalmente não inclui automações de email. Crie via Pipefy UI: alerta para `{{ rh_responsavel_email }}` quando status mudar para "Próximo vencimento" e para o funcionário (campo `funcionario`) quando entrar em "Renovação".
3. **Habilitar scheduler diário** (Pipefy UI → Automations → schedule) para varrer cards na fase "Documento ativo" e atualizar `status-documento` baseado em `data-validade` vs hoje.
4. **Testar o webhook de bloqueio** — execute uma chamada manual com card de teste antes de ativar em produção. O bloqueio é destrutivo; valide o payload.
5. **Importar histórico de documentos existentes** via planilha — todos os funcionários ativos precisam de pelo menos um card por tipo de documento aplicável.
6. **Considere uma pipe relation** com um pipe de Treinamento, caso renovações exijam novo curso obrigatório.

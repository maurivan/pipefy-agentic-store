---
id: contract-review-clauses
nome: Contract Review (Cláusulas Críticas)
categoria: juridico
versao: 1.0.0
schema_version: 1
descricao_curta: Revisão preliminar de contratos com detecção de 8 cláusulas críticas, score de risco numérico e routing condicional para revisor jurídico (sênior vs fast-track).
autor: pipefy-template-store
tags: [contratos, juridico, doc-extraction, compliance, lgpd, docusign, ia]
icone: 📝
tempo_estimado_clonagem: "~75 segundos"
fases_count: 6
campos_count: 19
requer_ai_agents: true
requer_database_tables: false
---

# Contract Review (Cláusulas Críticas)

## 📖 Sobre este template

Pipeline jurídico de **revisão preliminar de contratos**: upload, análise por IA das 8 cláusulas críticas (Limitação de Responsabilidade, Rescisão Unilateral, Confidencialidade, LGPD/DPA, PI, Foro, Multa, Reajuste), score numérico de risco 0-10, revisão jurídica humana, negociação, assinatura via plataforma (DocuSign/Clicksign) e arquivamento. Inclui renovação automática 90 dias antes do vencimento.

**Indicado para:** times jurídicos com 30-300 contratos/mês que precisam priorizar atenção humana onde realmente importa. **Não indicado para:** contratos altamente sensíveis (M&A, fusões) — nunca dispense revisão humana completa nesses casos.

## 🎯 Resultados esperados

- Triagem de contratos por risco em segundos vs. dias.
- Score numérico (0-10) permite routing automático (score ≥7 → sênior; score <4 → fast-track).
- Detecção sistemática de cláusulas AUSENTES (gap analysis).
- Renovação proativa via card automático 90 dias antes do vencimento.
- Trilha de revisão jurídica completa do upload ao arquivamento.

## ⚙️ Variáveis de clonagem

```yaml
variaveis:
  - nome: nome_do_pipe
    label: "Nome do pipe"
    tipo: string
    default: "Revisão de Contratos"
    obrigatorio: true

  - nome: threshold_revisor_senior
    label: "Score de risco a partir do qual o card vai para revisor sênior"
    tipo: number
    default: 7
    obrigatorio: true

  - nome: webhook_assinatura_url
    label: "URL da plataforma de assinatura (DocuSign / Clicksign) para gerar URL de assinatura"
    tipo: string
    obrigatorio: true
    placeholder: "https://api.docusign.com/v2/envelopes"

  - nome: webhook_callback_assinatura_url
    label: "URL pública (webhook in) que recebe callback quando contrato é assinado externamente"
    tipo: string
    obrigatorio: false
    placeholder: "https://app.pipefy.com/webhooks/..."
```

## 🏗️ Estrutura do Pipe

```yaml
pipe:
  nome: "{{ nome_do_pipe }}"
  descricao: "Revisão preliminar de contratos com detecção de cláusulas críticas via IA."
  preferencias:
    icone: "📝"
    aiAgentsEnabled: true

  fases:
    - id: upload-contrato
      nome: "Upload do Contrato"
      descricao: "Solicitante envia contrato e metadados"
      ordem: 1
      campos:
        - id: anexo_contrato
          label: "Anexo do contrato"
          tipo: attachment
          obrigatorio: true
        - id: tipo_contrato
          label: "Tipo"
          tipo: radio_vertical
          opcoes: ["Prestação de Serviços", "NDA", "Compra", "Licenciamento"]
          obrigatorio: true
        - id: contraparte
          label: "Contraparte"
          tipo: short_text
          obrigatorio: true
        - id: valor_contrato
          label: "Valor"
          tipo: currency
          moeda: "BRL"
        - id: vigencia_inicio
          label: "Vigência — início"
          tipo: date
        - id: vigencia_fim
          label: "Vigência — fim"
          tipo: date

    - id: analise-clausulas
      nome: "Análise de Cláusulas"
      descricao: "Agente IA detecta cláusulas críticas e calcula score"
      ordem: 2
      sla_dias: 1
      campos:
        - id: clausulas_criticas_detectadas
          label: "Cláusulas críticas detectadas (JSON, output do agente)"
          tipo: long_text
        - id: score_risco
          label: "Score de risco (0-10)"
          tipo: number
          minimo: 0
          maximo: 10
        - id: pontos_atencao
          label: "Pontos de atenção"
          tipo: long_text

    - id: revisao-juridica
      nome: "Revisão Jurídica"
      descricao: "Revisor humano analisa pontos sinalizados pelo agente"
      ordem: 3
      sla_dias: 3
      campos:
        - id: revisor_juridico
          label: "Revisor jurídico"
          tipo: assignee_select
        - id: decisao_revisao
          label: "Decisão"
          tipo: radio_horizontal
          opcoes: ["Aprovado", "Negociar", "Rejeitar"]
        - id: comentarios_revisao
          label: "Comentários da revisão"
          tipo: long_text

    - id: negociacao
      nome: "Negociação"
      descricao: "Negociação de cláusulas com a contraparte"
      ordem: 4
      sla_dias: 7
      campos:
        - id: versao_atualizada
          label: "Versão atualizada"
          tipo: attachment
        - id: clausulas_em_discussao
          label: "Cláusulas em discussão"
          tipo: long_text

    - id: assinatura
      nome: "Assinatura"
      descricao: "Geração de URL de assinatura e coleta"
      ordem: 5
      sla_dias: 5
      campos:
        - id: plataforma_assinatura
          label: "Plataforma"
          tipo: radio_horizontal
          opcoes: ["DocuSign", "Clicksign"]
        - id: url_assinatura
          label: "URL de assinatura"
          tipo: short_text
        - id: data_assinatura
          label: "Data de assinatura"
          tipo: date

    - id: arquivado
      nome: "Arquivado"
      descricao: "Contrato finalizado e arquivado"
      ordem: 6
      done: true
```

## 🔔 Automações

```yaml
automacoes:
  - id: routing-senior
    nome: "Routing para revisor sênior quando score >= threshold"
    quando:
      evento: campo_atualizado
      campo: score_risco
    entao:
      tipo: mover_card
      fase_destino: revisao-juridica

  - id: webhook-gerar-url-assinatura
    nome: "Gerar URL de assinatura (DocuSign/Clicksign)"
    quando:
      evento: card_movido_para_fase
      fase: assinatura
    entao:
      tipo: enviar_webhook
      webhook_id: webhook-assinatura

  - id: arquivar-pos-assinatura
    nome: "Arquivar card quando data de assinatura é preenchida"
    quando:
      evento: campo_atualizado
      campo: data_assinatura
    entao:
      tipo: mover_card
      fase_destino: arquivado
```

## 🧠 AI Agents

```yaml
ai_agents:
  - id: analise-clausulas-criticas
    nome: "Análise de cláusulas críticas"
    instruction: |
      Você é um agente especializado em revisão preliminar de contratos. Sua tarefa é detectar cláusulas críticas e fornecer um score de risco para triagem ao jurídico.

      ENTRADA: anexo PDF no campo {{ Anexo contrato }}, tipo {{ Tipo }}.

      TAREFA: analise o contrato e detecte presença/ausência destas cláusulas:

      1. LIMITAÇÃO DE RESPONSABILIDADE — existe? qual o teto?
      2. RESCISÃO UNILATERAL — qual prazo de aviso? penalidade?
      3. CONFIDENCIALIDADE — sim/não? duração?
      4. LGPD/DPA — sim/não? menção a data processor?
      5. PROPRIEDADE INTELECTUAL — quem fica com o IP do trabalho?
      6. FORO/JURISDIÇÃO — qual foi escolhido?
      7. MULTA/PENALIDADE — qual percentual?
      8. REAJUSTE ANUAL — sim/não? índice?

      REGRAS:
      - Se uma cláusula NÃO foi encontrada → marque "AUSENTE".
      - Se texto está ambíguo → marque "VAGA" + transcreva trecho.
      - Não opine sobre legalidade. Sua tarefa é DETECTAR, não JULGAR.
      - Score risco = 0-10. Calcule pelo seguinte critério:
        * +2 pra cada cláusula AUSENTE entre as 8.
        * +1 pra cada cláusula VAGA.
        * Tope em 10.

      FORMATO DE SAÍDA (JSON obrigatório):
      {
        "clausulas": {
          "limitacao_responsabilidade": {"status": "PRESENTE|AUSENTE|VAGA", "trecho": "...", "teto": "..." },
          "rescisao_unilateral": {"status": "...", "prazo": "...", "penalidade": "..."},
          "confidencialidade": {"status": "...", "duracao": "..."},
          ... (mesma estrutura para as outras)
        },
        "score_risco": 0,
        "pontos_atencao": ["lista de issues principais"]
      }

      EXEMPLO:
      Contrato sem cláusula LGPD, com rescisão de 90 dias sem penalidade, PI cedida ao cliente.
      Saída: {"clausulas": {"lgpd": {"status": "AUSENTE", "trecho": "", "duracao": ""}, "rescisao_unilateral": {"status": "PRESENTE", "prazo": "90 dias", "penalidade": "nenhuma"}, ...}, "score_risco": 4, "pontos_atencao": ["LGPD ausente — bloqueador pra processamento de dados pessoais"]}
    behaviors:
      - nome: "Analisar contrato ao entrar em Análise de Cláusulas"
        trigger: card_moved
        evento_params:
          para_fase: analise-clausulas
        prompt: |
          Quando o card entrar na fase Análise de Cláusulas, leia anexo_contrato e o tipo_contrato. Execute a análise de 8 cláusulas seguindo o método na instruction. Preencha clausulas_criticas_detectadas (JSON), score_risco (0-10 conforme cálculo) e pontos_atencao (sumário em prosa dos issues prioritários).
        acoes:
          - nome: "Preencher análise e score"
            tipo: update_card
            campos:
              - id: clausulas_criticas_detectadas
                modo: fill_with_ai
              - id: score_risco
                modo: fill_with_ai
              - id: pontos_atencao
                modo: fill_with_ai
```

## 🪝 Webhooks

```yaml
webhooks:
  - id: webhook-assinatura
    nome: "Gerar envelope DocuSign/Clicksign"
    url: "{{ webhook_assinatura_url }}"
    eventos:
      - card.move
    filtro:
      fase_destino: assinatura
    metodo: POST
    headers:
      X-Source: "pipefy-template-store"
```

## 📌 Pós-clonagem

- Configure a URL real do webhook da plataforma de assinatura (DocuSign / Clicksign) durante a clonagem.
- Configure manualmente via UI um **webhook in** apontando para o pipe que receba callback de assinatura externa — quando o contrato for assinado fora do Pipefy, esse callback move o card para Arquivado.
- Configure manualmente via UI um **scheduler de renovação**: 90 dias antes de `vigencia_fim`, criar um card novo de renovação. Isso requer um cron/automação externa ou recurso de scheduler do plano Pipefy.
- Configure manualmente notificação por email para o revisor jurídico quando o card cair em Revisão Jurídica com score ≥ threshold (template não inclui email).
- Adicione os revisores jurídicos (sênior e jr.) como membros do pipe.
- Crie regra manual no Pipefy para distinguir routing entre `revisor_juridico` sênior (score ≥ `threshold_revisor_senior`) e jr. (score < threshold).

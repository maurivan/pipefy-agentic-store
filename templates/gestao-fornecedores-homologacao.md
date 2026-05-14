---
id: gestao-fornecedores-homologacao
nome: Gestão de Fornecedores com Homologação
categoria: operacoes
versao: 1.0.0
schema_version: 1
descricao_curta: Homologação de fornecedores em 6 fases (cadastro, documental, financeira, técnica, aprovação) com triagem documental e classificação de risco automatizadas por IA.
autor: maurivan
tags: [compras, fornecedores, homologacao, procurement, compliance, ia]
icone: 🏭
tempo_estimado_criacao: "~60 segundos"
requer_ai_agents: true
---

# Gestão de Fornecedores com Homologação

## 📖 Sobre este template

Este template estrutura o processo de homologação de fornecedores conduzido pelo time de Compras. Cada fornecedor candidato percorre uma esteira de cinco análises (documental, financeira, técnica e aprovação final) antes de ser homologado e ficar disponível para contratação.

Dois pontos de IA aceleram o trabalho:

- **Triagem documental automática** — quando o card chega na fase de análise documental, um agente lê os documentos anexados, identifica o que está faltando ou vencido e preenche o campo de pendências.
- **Classificação de risco financeiro** — assim que o score Serasa é informado, o agente combina score, faturamento anual e categoria do fornecedor para sugerir o nível de risco (baixo / médio / alto).

## 🎯 Resultados esperados

- Compras reduz tempo em revisão manual de documentos repetitivos.
- Critério de risco financeiro fica consistente entre analistas (a IA aplica a mesma régua sempre).
- Trilha de auditoria completa: cada fase guarda quem decidiu o quê e quando.
- Após homologação, fornecedor fica claramente sinalizado e pronto para virar parceiro comercial.

## ⚙️ Variáveis de criação

```yaml
variaveis:
  - nome: nome_do_pipe
    label: "Nome do pipe"
    tipo: string
    default: "Homologação de Fornecedores"
    obrigatorio: true

  - nome: gestor_compras_email
    label: "Email do gestor de Compras responsável pela aprovação final"
    tipo: email
    obrigatorio: true

  - nome: sla_homologacao_dias
    label: "Prazo total de homologação (em dias)"
    tipo: number
    default: 30
    obrigatorio: true

  - nome: score_serasa_minimo
    label: "Score Serasa mínimo aceitável"
    tipo: number
    default: 500
    obrigatorio: true

  - nome: moeda
    label: "Moeda usada nos campos de faturamento"
    tipo: select
    opcoes: [BRL, USD, EUR]
    default: BRL
    obrigatorio: true
```

## 🏗️ Estrutura do Pipe

```yaml
pipe:
  nome: "{{ nome_do_pipe }}"
  preferencias:
    icone: "🏭"
    aiAgentsEnabled: true

  fases:
    - id: cadastro-fornecedor
      nome: "Cadastro do fornecedor"
      ordem: 1
      done: false
      sla_dias: 2
      descricao: "Formulário inicial preenchido pelo fornecedor ou pelo solicitante interno."
      campos:
        - id: razao-social
          label: "Razão social"
          tipo: short_text
          obrigatorio: true
        - id: cnpj
          label: "CNPJ"
          tipo: cnpj
          obrigatorio: true
        - id: nome-fantasia
          label: "Nome fantasia"
          tipo: short_text
        - id: categoria
          label: "Categoria de fornecimento"
          tipo: select
          opcoes: [Insumos, Serviços, TI, Logística, Outros]
          obrigatorio: true
        - id: contato-nome
          label: "Nome do contato comercial"
          tipo: short_text
          obrigatorio: true
        - id: contato-email
          label: "Email do contato comercial"
          tipo: email
          obrigatorio: true
        - id: contato-telefone
          label: "Telefone do contato comercial"
          tipo: phone
        - id: documentos
          label: "Documentos (contrato social, CNDs, cartão CNPJ)"
          tipo: attachment
          obrigatorio: true

    - id: analise-documental
      nome: "Análise documental"
      ordem: 2
      done: false
      sla_dias: 5
      descricao: "Compras confere completude e validade dos documentos. IA faz a triagem inicial."
      campos:
        - id: documentos-ok
          label: "Documentos completos e válidos?"
          tipo: yes_no
        - id: pendencias-encontradas
          label: "Pendências encontradas"
          tipo: long_text
        - id: data-analise-documental
          label: "Data da análise documental"
          tipo: date

    - id: avaliacao-financeira
      nome: "Avaliação financeira"
      ordem: 3
      done: false
      sla_dias: 7
      descricao: "Checagem de saúde financeira: score, faturamento e risco. IA classifica o risco a partir dos dados."
      campos:
        - id: score-serasa
          label: "Score Serasa"
          tipo: number
          obrigatorio: true
        - id: faturamento-anual
          label: "Faturamento anual ({{ moeda }})"
          tipo: currency
        - id: risco-financeiro
          label: "Risco financeiro"
          tipo: select
          opcoes: [Baixo, Médio, Alto]
        - id: observacoes-financeiras
          label: "Observações da análise financeira"
          tipo: long_text

    - id: avaliacao-tecnica
      nome: "Avaliação técnica"
      ordem: 4
      done: false
      sla_dias: 10
      descricao: "Avaliação de qualidade, certificações e capacidade técnica do fornecedor."
      campos:
        - id: certificacoes
          label: "Certificações apresentadas"
          tipo: checklist_vertical
          opcoes: ["ISO 9001", "ISO 14001", "ISO 27001", "Outras"]
        - id: nota-tecnica
          label: "Nota técnica (0 a 10)"
          tipo: number
        - id: visita-realizada
          label: "Visita técnica realizada?"
          tipo: yes_no
        - id: parecer-tecnico
          label: "Parecer técnico"
          tipo: long_text

    - id: aprovacao-final
      nome: "Aprovação final"
      ordem: 5
      done: false
      sla_dias: "{{ sla_homologacao_dias }}"
      descricao: "Gestor de Compras consolida as análises e decide pela homologação ou rejeição."
      campos:
        - id: decisao
          label: "Decisão final"
          tipo: select
          opcoes: [Aprovado, Rejeitado]
          obrigatorio: true
        - id: justificativa
          label: "Justificativa da decisão"
          tipo: long_text
          obrigatorio: true
        - id: condicoes-comerciais
          label: "Condições comerciais negociadas"
          tipo: long_text
        - id: gestor-responsavel
          label: "Gestor responsável pela aprovação"
          tipo: email
          default: "{{ gestor_compras_email }}"

    - id: finalizado
      nome: "Finalizado"
      ordem: 6
      done: true
      descricao: "Fase terminal — fornecedor homologado ou rejeitado. O campo Decisão final indica o desfecho."
      campos: []
```

## 🧠 AI Agents

```yaml
ai_agents:
  - id: assistente-homologacao-fornecedor
    nome: "Assistente de Homologação"
    instruction: |
      Você é um analista de Compras que auxilia o time na homologação de fornecedores.
      Sua missão é acelerar duas etapas críticas: (1) a triagem dos documentos enviados
      no cadastro, identificando o que está faltando ou vencido; e (2) a classificação
      de risco financeiro do fornecedor, combinando score Serasa, faturamento e categoria.
      Seja objetivo, conservador na avaliação de risco e nunca aprove um fornecedor —
      apenas forneça subsídios para que o analista humano decida.

    behaviors:
      - nome: "Triagem documental"
        trigger: card_moved
        evento_params:
          em_fase: analise-documental
        prompt: |
          O card acabou de entrar na fase "Análise documental". Os documentos do fornecedor
          estão anexados no campo "documentos" do card.

          Sua tarefa:
          1. Identifique quais documentos foram enviados (contrato social, cartão CNPJ,
             CND federal, CND estadual, CND municipal, CND trabalhista, CND FGTS, etc).
          2. Verifique se há datas de validade legíveis e se algum documento está vencido.
          3. Liste de forma objetiva, em bullet points, o que está faltando ou vencido.
          4. Se todos os documentos essenciais estiverem presentes e válidos, marque
             "documentos-ok" como sim. Caso contrário, marque como não.

          Não dê opinião sobre o mérito do fornecedor — apenas valide a completude dos documentos.

        acoes:
          - tipo: update_card
            campos:
              - id: documentos-ok
                modo: fill_with_ai
              - id: pendencias-encontradas
                modo: fill_with_ai
              - id: data-analise-documental
                modo: fill_with_ai

      - nome: "Classificação de risco financeiro"
        trigger: field_updated
        evento_params:
          campo: score-serasa
        prompt: |
          O campo "Score Serasa" foi atualizado. Use os dados disponíveis no card
          para classificar o risco financeiro do fornecedor:

          - Score Serasa (campo "score-serasa")
          - Faturamento anual (campo "faturamento-anual")
          - Categoria de fornecimento (campo "categoria")

          Regra geral (ajuste com bom senso):
          - Score abaixo de {{ score_serasa_minimo }} → Risco Alto, independentemente do resto.
          - Score entre {{ score_serasa_minimo }} e 700 → avaliar faturamento e categoria.
            Faturamento muito baixo para a categoria pretendida puxa o risco pra cima.
          - Score acima de 700 e faturamento compatível → Risco Baixo.

          Preencha o campo "risco-financeiro" com Baixo, Médio ou Alto, e registre
          em "observacoes-financeiras" um parágrafo curto explicando a classificação.

        acoes:
          - tipo: update_card
            campos:
              - id: risco-financeiro
                modo: fill_with_ai
              - id: observacoes-financeiras
                modo: fill_with_ai
```

## 📌 Pós-criação

Depois de criar o template na conta Pipefy:

1. **Confira o gestor responsável** — o email definido em `{{ gestor_compras_email }}` aparece como default no campo "Gestor responsável pela aprovação". Garanta que essa pessoa tem acesso ao pipe.
2. **Calibre o score Serasa mínimo** — o valor padrão (500) é conservador. Times mais maduros costumam exigir 600+ ou ter régua por categoria. Ajuste no prompt do AI Agent se precisar.
3. **Teste a triagem documental com um card real** — anexe documentos de teste e mova o card pra fase "Análise documental". Confira se a IA está identificando pendências de forma útil. Se não, refine o prompt do behavior "Triagem documental".
4. **Considere conectar com um pipe de Compras / Pedidos** — fornecedores homologados costumam virar input pra um pipe de cotação ou contratação. Esse template não inclui essa relação, mas pode ser adicionada via `## 🔗 Pipe Relations`.
5. **Database table de fornecedores ativos** (opcional) — se quiser que outros pipes consultem a lista de fornecedores homologados, crie uma database table separada e adicione uma automação ou behavior `create_table_record` no fim do fluxo.

## 🔄 Mapeamento MCP

```yaml
mcp_calls:
  - secao: pipe
    tool: create_pipe
    nota: "Cria o pipe com aiAgentsEnabled habilitado"
  - secao: pipe.fases
    tool: create_phase
    nota: "Uma chamada por fase, na ordem 1..6"
  - secao: pipe.fases[*].campos
    tool: create_phase_field
    nota: "Campos da fase 1 podem virar start form via update_phase"
  - secao: ai_agents
    tool: create_ai_agent
    nota: "Um agent com 2 behaviors; cada behavior usa update_card como ação"
```

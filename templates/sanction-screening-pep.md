---
id: sanction-screening-pep
nome: "Sanction Screening / PEP Check"
descricao_curta: "Triagem em listas OFAC/CSNU/PEP com classificação probabilística por IA em 4 níveis"
categoria: juridico
versao: 1.2.0
schema_version: 1
autor: pipefy-template-store
tags: [juridico, compliance, sanctions, pep, ofac, screening]
icone: "🛡️"
tempo_estimado_criacao: "~40 segundos"
fases_count: 4
campos_count: 16
requer_ai_agents: true
requer_database_tables: false
---

# Sanction Screening / PEP Check

## 📖 Sobre este template

Processo de triagem de pessoas físicas e jurídicas contra listas de sanctions
(OFAC, CSNU/ONU, lista interna) e contra listas PEP (Politically Exposed
Persons). A consulta às listas é determinística (HTTP a APIs externas); o
**agente IA atua apenas na análise probabilística de matches**, classificando
em 4 níveis (DEFINITIVO, PROVÁVEL, POSSÍVEL, NÃO MATCH) e tratando
explicitamente o problema de **homônimos**.

**Indicado para:** áreas de compliance/AML, fintechs, bancos, marketplaces
regulados, jurídico em onboarding de clientes/fornecedores expostos.

## 🎯 Resultados esperados

- Screening sistemático com trilha de auditoria por consulta
- Falso positivo controlado — agente trata homônimos comuns
- Escalation imediata em match definitivo
- 4 estados (não só pass/fail) — triagem fina sem perder o sinal
- Listas consultadas em paralelo (OFAC, BACEN/CSNU, interna)

## ⚙️ Variáveis de criação

```yaml
variaveis:
  - nome: nome_do_pipe
    label: "Nome do pipe"
    tipo: string
    default: "Sanction Screening / PEP Check"
    obrigatorio: true

  - nome: ofac_api_url
    label: "URL da API OFAC (ou broker que consolida)"
    tipo: string
    obrigatorio: true
    placeholder: "https://api.exemplo.com/ofac/search"

  - nome: bacen_api_url
    label: "URL da API BACEN / CSNU / ONU"
    tipo: string
    obrigatorio: true

  - nome: lista_interna_api_url
    label: "URL da API da lista interna de bloqueio"
    tipo: string
    obrigatorio: false

  - nome: api_token
    label: "Token de autenticação compartilhado (Bearer)"
    tipo: string
    obrigatorio: false

  - nome: score_alerta
    label: "Score de similaridade que força revisão obrigatória"
    tipo: number
    default: 85
    obrigatorio: true

  - nome: email_compliance_officer
    label: "Email do compliance officer para escalation"
    tipo: email
    obrigatorio: true
```

## 🏗️ Estrutura do Pipe

```yaml
pipe:
  nome: "{{ nome_do_pipe }}"
  descricao: "Triagem em listas de sanctions e PEP, com análise probabilística por IA"
  publico: false
  preferencias:
    icone: "🛡️"
    aiAgentsEnabled: true

  fases:
    - id: solicitacao-screening
      nome: "Solicitação de screening"
      descricao: "Dados do sujeito a ser consultado (pessoa física ou jurídica)"
      ordem: 1
      campos:
        - id: nome-razao
          label: "Nome / Razão social"
          tipo: short_text
          obrigatorio: true
        - id: documento
          label: "CPF ou CNPJ"
          tipo: short_text
          obrigatorio: true
        - id: data-nascimento-abertura
          label: "Data de nascimento ou abertura"
          tipo: date
        - id: origem
          label: "Origem da solicitação"
          tipo: select
          opcoes:
            - "Onboarding de cliente"
            - "Onboarding de fornecedor"
            - "KYC periódico"
            - "Auditoria interna"
            - "Solicitação manual"
          obrigatorio: true

    - id: consulta-listas
      nome: "Consulta às listas"
      descricao: "HTTP a APIs OFAC, CSNU/BACEN e lista interna; PEP pode ser flag externa"
      ordem: 2
      campos:
        - id: resultado-ofac
          label: "Resultado OFAC (raw)"
          tipo: long_text
        - id: resultado-csnu
          label: "Resultado CSNU / ONU (raw)"
          tipo: long_text
        - id: resultado-lista-interna
          label: "Resultado lista interna (raw)"
          tipo: long_text
        - id: resultado-pep
          label: "PEP?"
          tipo: radio_horizontal
          opcoes: ["Sim", "Não", "Indeterminado"]

    - id: analise-match
      nome: "Análise de match"
      descricao: "Agente IA classifica probabilidade do match"
      ordem: 3
      campos:
        - id: score-similaridade
          label: "Score de similaridade (0-100)"
          tipo: number
          minimo: 0
          maximo: 100
        - id: match-definitivo
          label: "Classificação do match"
          tipo: select
          opcoes: ["MATCH_DEFINITIVO", "MATCH_PROVAVEL", "MATCH_POSSIVEL", "NAO_MATCH"]
        - id: analise-agente
          label: "Análise (justificativa do agente)"
          tipo: long_text

    - id: decisao
      nome: "Decisão"
      descricao: "Compliance officer decide"
      ordem: 4
      done: true
      campos:
        - id: decisao
          label: "Decisão final"
          tipo: radio_horizontal
          opcoes: ["Aprovado", "Bloqueado", "Aprovado com monitoramento"]
          obrigatorio: true
        - id: justificativa-decisao
          label: "Justificativa"
          tipo: long_text
          obrigatorio: true
```

## 🔔 Automações

```yaml
automacoes:
  - id: consultar-listas-ao-criar
    nome: "Disparar consulta às listas externas"
    quando:
      evento: card_created_in_phase
      fase: solicitacao-screening
    entao:
      tipo: send_http_request
      webhook_id: consulta-ofac

  - id: revisao-obrigatoria
    nome: "Auto-flag para revisão quando score alto"
    quando:
      evento: field_updated
      campo: score-similaridade
    entao:
      tipo: update_card_field
      campo: match-definitivo
      valor: "MATCH_POSSIVEL"

  - id: escalation-match-definitivo
    nome: "Escalation P0 em match definitivo"
    quando:
      evento: field_updated
      campo: match-definitivo
    entao:
      tipo: send_http_request
      webhook_id: escalation-compliance-officer
```

## 🧠 AI Agents

```yaml
ai_agents:
  - id: agente-match-probabilistico
    nome: "Análise de match probabilístico"
    instruction: |
      Você é um analista de PLD-FT especializado em screening de sanctions e
      PEP. Recebe candidatos pré-coletados (OFAC, CSNU, listas internas) e
      classifica probabilisticamente em 4 níveis de match. Não consulta APIs;
      apenas analisa os hits que chegam.

      # Diretrizes de comportamento

      1. **Use apenas as 4 classificações canônicas** — MATCH_DEFINITIVO
         (documento + nome idênticos), MATCH_PROVAVEL (nome idêntico +
         data ±1 ano), MATCH_POSSIVEL (nome semelhante, score > 80, dados
         divergentes), NAO_MATCH (dados divergem). Não invente categorias
         intermediárias.

      2. **Conservadorismo é regra, não exceção** — em PLD-FT o custo de
         falso-negativo (deixar passar um sancionado) é incomparavelmente
         maior que o custo de falso-positivo. Em dúvida entre dois níveis,
         escolha SEMPRE o mais grave.

      3. **Homônimos exigem desambiguação ativa** — nomes muito comuns
         ("João Silva", "Maria Souza", "Carlos Oliveira") nunca são
         MATCH_PROVAVEL apenas pelo nome. Exige coincidência adicional
         (CPF/CNPJ, data de nascimento ou abertura, mãe/endereço).

      4. **Justifique cada classificação com evidência citada** — cite o
         campo da entrada e o campo da lista que motivaram a decisão.
         Formato: "Sujeito: '<nome>', '<doc>' vs lista: '<nome lista>',
         '<doc lista>' → score similaridade <X> → <classificação>".

      5. **Não inventar dados ausentes** — se a entrada não traz CPF/CNPJ e
         o candidato da lista também não, isso é fator de incerteza
         (aumenta a classificação um nível para o mais grave, não diminui).

      6. **Regulatório aplicável** — Lei 9.613/98 (lavagem), Circular Bacen
         3.978 (PLD-FT), Resolução COAF 36/2021. Toda classificação alimenta
         decisão de bloqueio/comunicação ao COAF — assuma rigor de auditoria.

      7. **Limite de escopo** — você preenche apenas `classificacao_match`,
         `score_final`, `justificativa` e `evidencia_citada`. Nunca decide
         bloqueio de conta, comunicação ao COAF nem aprovação — essas são
         decisões do compliance officer humano.
    behaviors:
      - nome: "Classificar match na análise"
        trigger: card_moved
        evento_params:
          para_fase: analise-match
        prompt: |
          Você analisa um possível match entre uma pessoa/empresa e uma entrada
          em lista de sanctions/PEP.

          ENTRADA:
          - Sujeito: {{ nome-razao }}, {{ documento }}, {{ data-nascimento-abertura }}
          - Candidato lista: extraído de {{ resultado-ofac }}, {{ resultado-csnu }}, {{ resultado-lista-interna }}
          - Score similaridade textual: {{ score-similaridade }}

          TAREFA — classifique o match:

          1. MATCH_DEFINITIVO: CPF/CNPJ + nome idênticos.
          2. MATCH_PROVAVEL: nome idêntico + data nascimento dentro de ±1 ano.
          3. MATCH_POSSIVEL: nome semelhante (Score > 80) mas dados divergentes.
          4. NAO_MATCH: dados divergem significativamente.

          REGRAS:
          - Homônimos comuns ("João Silva", "Maria Souza") → exigir match adicional (data, doc).
          - Nomes com sobrenome incomum + match exato → MATCH_PROVAVEL mesmo sem doc.
          - NUNCA classifique como MATCH_DEFINITIVO sem CPF/CNPJ idênticos.

          Saída: classificação + breve análise (max 3 frases).
        acoes:
          - nome: "Preencher classificação e análise"
            tipo: update_card
            campos:
              - id: match-definitivo
                modo: fill_with_ai
              - id: analise-agente
                modo: fill_with_ai
```

## 🪝 Webhooks

```yaml
webhooks:
  - id: consulta-ofac
    nome: "Consulta OFAC"
    url: "{{ ofac_api_url }}"
    eventos:
      - card.create
    metodo: POST
    headers:
      Authorization: "Bearer {{ api_token }}"
      X-Source: "pipefy-sanction-screening"
    payload_extra:
      template_id: "sanction-screening-pep"

  - id: consulta-csnu-bacen
    nome: "Consulta CSNU / BACEN"
    url: "{{ bacen_api_url }}"
    eventos:
      - card.create
    metodo: POST
    headers:
      Authorization: "Bearer {{ api_token }}"

  - id: consulta-lista-interna
    nome: "Consulta lista interna"
    url: "{{ lista_interna_api_url }}"
    eventos:
      - card.create
    metodo: POST
    headers:
      Authorization: "Bearer {{ api_token }}"

  - id: escalation-compliance-officer
    nome: "Escalation em match definitivo"
    url: "{{ webhook_escalation_url }}"
    eventos:
      - card.field_update
    metodo: POST
    payload_extra:
      template_id: "sanction-screening-pep"
      severity: "P0"
```

## 📌 Pós-criação

- **Configure as três URLs de APIs externas** (OFAC, CSNU/BACEN, lista interna) substituindo as variáveis de webhook após a criação. Use um broker (Comply Advantage, Refinitiv, ChainAnalysis, ou interno) se ainda não tiver os endpoints diretos.
- **Configure manualmente via UI** uma notificação ao compliance officer quando match definitivo for marcado (template não inclui email automatizado).
- **Filtros do webhook de escalation** devem ser ajustados no editor do Pipefy para disparar apenas quando `match-definitivo = MATCH_DEFINITIVO`.
- **Ajuste o threshold** da automação `revisao-obrigatoria` no Pipefy para `score > {{ score_alerta }}` — condições numéricas exigem ajuste no editor.
- **Auditoria**: retenha o log do agente (`analise-agente`) — é a justificativa documental do compliance officer.

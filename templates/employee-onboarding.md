---
id: employee-onboarding
nome: Onboarding de Funcionários
descricao_curta: Onboarding completo de novos colaboradores em 5 fases, com IA extraindo documentos de admissão, IA gerando email corporativo padronizado, card conectado em Pipe IT e integração com Workspace API.
categoria: rh
versao: 1.1.0
schema_version: 1
autor: pipefy-template-store
tags: [rh, onboarding, admissao, hr-ops, ia, doc-extraction, workspace]
icone: 🧑‍💼
tempo_estimado_criacao: "~75 segundos"
fases_count: 5
campos_count: 24
requer_ai_agents: true
requer_database_tables: true
---

# Onboarding de Funcionários

## 📖 Sobre este template

Esteira completa de onboarding de novos colaboradores, da pré-admissão ao 30º dia. Combina extração estruturada de documentos (RG, CPF, comprovante de endereço, carteira de trabalho) por IA Process-heavy com um segundo agente Simple-action que gera o padrão de email corporativo (primeiro.ultimo@empresa.com) sem boilerplate. Dispara card conectado em Pipe IT para solicitação de acesso/notebook e integra com Workspace API (Google Workspace, Microsoft 365) para criação automática do usuário corporativo.

**Indicado para:** times de RH em empresas de 50-2000 colaboradores que admitem entre 5 e 50 pessoas/mês.
**Não indicado para:** organizações com volume muito alto (>200 admissões/mês — usar HRIS dedicado) ou onde RH e TI já operam em sistema unificado completo.

## 🎯 Resultados esperados

- Reduzir tempo médio de admissão completa de 10 dias para 5 dias úteis.
- Eliminar erro de digitação de dados pessoais via extração automática dos documentos.
- Email corporativo padronizado e sem ambiguidade (lowercase, sem acentos).
- Onboarding técnico (acesso, notebook) sincronizado com Pipe IT via card conectado.
- Avaliação de 30 dias agendada automaticamente — sem cair no esquecimento.

## ⚙️ Variáveis de criação

```yaml
variaveis:
  - nome: nome_do_pipe
    label: "Nome do pipe"
    tipo: string
    default: "Onboarding de Funcionários"
    obrigatorio: true

  - nome: rh_email
    label: "Email do RH (alertas internos)"
    tipo: email
    obrigatorio: true

  - nome: dominio_empresa
    label: "Domínio do email corporativo (ex: empresa.com)"
    tipo: string
    default: "empresa.com"
    obrigatorio: true

  - nome: pipe_it_id
    label: "ID do Pipe IT (para card conectado de acesso/notebook)"
    tipo: string
    obrigatorio: true

  - nome: webhook_workspace_api_url
    label: "URL Workspace API (Google Workspace / Microsoft 365) para criar usuário"
    tipo: string
    default: ""
    obrigatorio: false

  - nome: webhook_workspace_api_token
    label: "Token de autenticação Workspace API"
    tipo: string
    default: ""
    obrigatorio: false
```

## 🏗️ Estrutura do Pipe

```yaml
pipe:
  nome: "{{ nome_do_pipe }}"
  descricao: "Onboarding completo do novo colaborador, da pré-admissão ao 30º dia"
  preferencias:
    icone: "🧑‍💼"
    aiAgentsEnabled: true

  fases:
    - id: pre-admissao
      nome: "Pré-admissão"
      descricao: "RH inicia o card com dados básicos do candidato selecionado"
      ordem: 1
      done: false
      sla_dias: 2
      campos:
        - id: nome-completo
          label: "Nome completo"
          tipo: short_text
          obrigatorio: true
        - id: cpf
          label: "CPF"
          tipo: cpf
          obrigatorio: true
        - id: email-pessoal
          label: "Email pessoal"
          tipo: email
          obrigatorio: true
        - id: cargo
          label: "Cargo"
          tipo: select
          opcoes: [Analista, Coordenador, Gerente, Diretor, Especialista, Estagiário, "Outro"]
          obrigatorio: true
        - id: departamento
          label: "Departamento (lookup DB Departamentos)"
          tipo: short_text
          obrigatorio: true
        - id: data-inicio
          label: "Data de início"
          tipo: date
          obrigatorio: true
        - id: salario
          label: "Salário (BRL)"
          tipo: currency
          obrigatorio: true

    - id: documentacao
      nome: "Documentação"
      descricao: "Coleta e extração de documentos pessoais via IA"
      ordem: 2
      done: false
      sla_dias: 3
      campos:
        - id: anexo-rg
          label: "Anexo RG"
          tipo: attachment
          obrigatorio: true
        - id: anexo-cpf
          label: "Anexo CPF"
          tipo: attachment
          obrigatorio: true
        - id: anexo-comprovante-endereco
          label: "Anexo comprovante de endereço (máx 90 dias)"
          tipo: attachment
          obrigatorio: true
        - id: anexo-carteira-trabalho
          label: "Anexo carteira de trabalho"
          tipo: attachment
          obrigatorio: true
        - id: dados-extraidos
          label: "Dados extraídos (JSON do agente)"
          tipo: long_text

    - id: setup-acessos
      nome: "Setup Acessos"
      descricao: "Email corporativo, Slack e ferramentas — sincroniza com Pipe IT"
      ordem: 3
      done: false
      sla_dias: 2
      campos:
        - id: email-corporativo
          label: "Email corporativo"
          tipo: email
        - id: slack-handle
          label: "Slack handle"
          tipo: short_text
        - id: acesso-ferramentas
          label: "Ferramentas necessárias"
          tipo: checklist_vertical
          opcoes: ["Google Workspace", "Slack", "Notion", "Jira", "Github", "Pipefy", "VPN", "ERP", "CRM"]
        - id: notebook
          label: "Notebook"
          tipo: radio_horizontal
          opcoes: ["Solicitar", "Tem próprio"]
        - id: aprovacao-acessos
          label: "Aprovação dos acessos"
          tipo: assignee_select

    - id: primeiro-dia
      nome: "Primeiro Dia"
      descricao: "Boas-vindas, buddy e agenda do primeiro dia"
      ordem: 4
      done: false
      sla_dias: 1
      campos:
        - id: welcome-email-enviado
          label: "Welcome email enviado?"
          tipo: radio_horizontal
          opcoes: [Sim, Não]
        - id: onboarding-agendado
          label: "Data do onboarding agendado"
          tipo: date
        - id: buddy
          label: "Buddy atribuído"
          tipo: assignee_select

    - id: onboarding-completo
      nome: "Onboarding Completo"
      descricao: "30 dias depois — documentos assinados, treinamentos e avaliação"
      ordem: 5
      done: true
      campos:
        - id: documentos-assinados
          label: "Documentos assinados?"
          tipo: radio_horizontal
          opcoes: [Sim, Não]
        - id: treinamentos-concluidos
          label: "Treinamentos concluídos"
          tipo: checklist_vertical
          opcoes: ["Cultura e valores", "Segurança da informação", "LGPD", "Compliance", "Produto", "Ferramentas internas"]
        - id: avaliacao-30-dias
          label: "Data da avaliação de 30 dias"
          tipo: date
```

## 🔔 Automações

```yaml
automacoes:
  - id: criar-card-pipe-it
    nome: "Criar card conectado no Pipe IT ao criar o onboarding"
    quando:
      evento: card_created_in_phase
      fase: pre-admissao
    entao:
      tipo: create_connected_card
      relation_id: rel-onboarding-it
      campos:
        nome-novo-funcionario: "{{ card.nome-completo }}"
        cargo: "{{ card.cargo }}"
        data-inicio: "{{ card.data-inicio }}"

  - id: criar-usuario-workspace
    nome: "Criar usuário no Workspace API quando email corporativo definido"
    quando:
      evento: field_updated
      campo: email-corporativo
    entao:
      tipo: send_http_request
      webhook_id: criar-usuario-workspace

  - id: agendar-avaliacao-30-dias
    nome: "Agendar avaliação de 30 dias após primeira semana"
    quando:
      evento: card_moved_to_phase
      fase: primeiro-dia
    entao:
      tipo: update_card_field
      campo: avaliacao-30-dias
      valor: "{{ card.data-inicio }} + 30 dias"
```

## 🧠 AI Agents

```yaml
ai_agents:
  - id: extracao-docs-rh
    nome: "Extração de Documentos RH"
    instruction: |
      Você é um agente Process-heavy especializado em extração estruturada de
      documentos de admissão brasileiros (RG, CPF, Comprovante de endereço,
      Carteira de Trabalho). Saída sempre em JSON. Detecte e flagge prazos
      expirados e divergências de CPF.

    behaviors:
      - nome: "Extrair dados ao entrar em Documentação"
        trigger: card_moved
        evento_params:
          em_fase: documentacao
        prompt: |
          Você é um agente que extrai dados de documentos de admissão (RG, CPF, Comprovante de endereço, Carteira de Trabalho).

          ENTRADA: anexos nos campos {{ Anexo RG }}, {{ Anexo CPF }}, {{ Anexo comprovante endereço }}, {{ Anexo carteira trabalho }}.

          TAREFA — para cada documento, extraia:

          RG: número, órgão emissor, UF, data emissão
          CPF: número (11 dígitos, sem formatação)
          Comprovante endereço: logradouro, número, CEP, cidade, UF, data do comprovante
          Carteira de trabalho: número, série, PIS

          REGRAS:
          - Comprovante de endereço deve ter no máximo 90 dias. Senão → "PRAZO_EXPIRADO".
          - CPF deve coincidir com o CPF informado no card. Senão → "DIVERGENCIA_CPF".
          - Se um documento ilegível → "ILEGIVEL".

          FORMATO DE SAÍDA (JSON):
          { "rg": {...}, "cpf": {...}, "comprovante_endereco": {...}, "carteira_trabalho": {...}, "alertas": [...] }

        acoes:
          - tipo: update_card
            campos:
              - id: dados-extraidos
                modo: fill_with_ai

  - id: gerador-email-corporativo
    nome: "Gerador de Email Corporativo"
    instruction: |
      Você gera o email corporativo padronizado a partir do nome completo do
      novo colaborador. Curto, sem boilerplate.

    behaviors:
      - nome: "Gerar email corporativo ao entrar em Setup Acessos"
        trigger: card_moved
        evento_params:
          em_fase: setup-acessos
        prompt: |
          Update {{ Email corporativo }} para o padrão primeiro.ultimo@empresa.com baseado em {{ Nome completo }}. Use lowercase. Remova acentos.

        acoes:
          - tipo: update_card
            campos:
              - id: email-corporativo
                modo: fill_with_ai
```

## 🗄️ Database Tables

```yaml
database_tables:
  - id: departamentos
    nome: "Departamentos"
    descricao: "Hierarquia de departamentos com gerente e diretor — usada para routing de aprovações"
    colunas:
      - id: departamento-id
        label: "ID do departamento"
        tipo: short_text
        obrigatorio: true
        unico: true
      - id: nome
        label: "Nome do departamento"
        tipo: short_text
        obrigatorio: true
      - id: gerente
        label: "Email do gerente"
        tipo: email
      - id: diretor
        label: "Email do diretor"
        tipo: email
      - id: centro-custo
        label: "Centro de custo"
        tipo: short_text
      - id: ativo
        label: "Ativo?"
        tipo: radio_horizontal
        opcoes: [Sim, Não]
```

## 🔗 Pipe Relations

```yaml
pipe_relations:
  - id: rel-onboarding-it
    nome: "Card conectado em Pipe IT (acesso + notebook)"
    pipe_filho_externo: "{{ pipe_it_id }}"
    cardinalidade: one_to_one
    auto_fill: true
    nome_no_filho: "Card pai (Onboarding RH)"
    descricao: "Ao criar o onboarding, abre automaticamente o card de setup técnico no Pipe IT. Cada time owns seu pipe; permanecem sincronizados via relation."
```

## 🪝 Webhooks

```yaml
webhooks:
  - id: criar-usuario-workspace
    nome: "Criar usuário no Workspace API (Google Workspace / Microsoft 365)"
    url: "{{ webhook_workspace_api_url }}"
    eventos:
      - card.field_update
    filtro:
      campo_igual:
        campo: email-corporativo
        valor: "*"
    headers:
      Authorization: "Bearer {{ webhook_workspace_api_token }}"
      Content-Type: "application/json"
    payload_extra:
      operacao: "criar_usuario"
      origem: "pipefy-employee-onboarding"
      dominio: "{{ dominio_empresa }}"
```

## 📌 Pós-criação

1. **Popular DB `departamentos`** — sem ela, o routing de aprovações fica solto. Importe via CSV ou conecte ao seu HRIS.
2. **Pipe IT existente** — o `{{ pipe_it_id }}` precisa ser um pipe já criado no seu workspace. Se não tiver, crie um pipe IT mínimo (Solicitação → Provisionamento → Entregue) antes de criar este.
3. **Workspace API** — configure URL/token do Google Workspace Admin SDK ou Microsoft Graph para criar usuários automaticamente. Deixe vazio durante o piloto e teste em sandbox.
4. **Notificações por email** — configure manualmente via UI:
   - Welcome email ao novo colaborador no `email-pessoal` ao entrar em Primeiro Dia.
   - Notificação ao buddy e gerente -7 dias antes da `data-início`.
   - Notificação ao RH (`{{ rh_email }}`) quando o agente flaggar `PRAZO_EXPIRADO` ou `DIVERGENCIA_CPF`.
   - Lembrete de avaliação de 30 dias para o gestor.
5. **Calibrar prompt de extração** — após 20-30 admissões, ajuste o prompt para incluir documentos adicionais (CNH, título de eleitor, certificado de reservista) se eles forem coletados pela sua empresa.
6. **Membros do pipe** — adicione o time de RH (escrita em todas as fases), TI (leitura + escrita em Setup Acessos), e gestores (leitura).
7. **Customizar template de email corporativo** — se sua empresa usa outro padrão (nome.sobrenome, n.sobrenome, etc.), ajuste o prompt do agente "Gerador de Email Corporativo".

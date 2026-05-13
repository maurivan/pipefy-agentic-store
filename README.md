# Pipefy Agentic Store

Loja pública de **templates de processo do Pipefy** que podem ser clonados em segundos no seu workspace via [Claude Code](https://claude.com/claude-code) + [MCP do Pipefy](https://github.com/gbrlcustodio/pipefy-mcp-server).

Cada template descreve um pipe completo — fases, campos, AI Agents e relações entre pipes — em um único arquivo Markdown com YAML frontmatter. O Claude Code lê o template, pede as variáveis ao usuário e cria tudo no Pipefy via MCP.

## O que tem aqui

```
.
├── templates/                       # Catálogo de templates clonáveis (.md)
│   └── onboarding-clientes-b2b.md
└── .claude/skills/
    ├── install-pipefy-mcp/          # Instala/configura o MCP do Pipefy
    └── agentic-store/               # Lista e clona templates desta loja
```

## Como usar

### 1. Pré-requisitos

- [Claude Code](https://claude.com/claude-code) instalado (`claude --version`)
- `git`, `uv` (`brew install uv`), `python3` 3.11+
- `gh` CLI logado na conta que tem acesso a este repo (`gh auth login`)
- Uma **Service Account do Pipefy** com Client ID e Client Secret — gere em **Admin Panel → Service Accounts**

### 2. Instalar o MCP do Pipefy

Dentro de qualquer sessão do Claude Code que tenha as skills deste repo carregadas:

```
/install-pipefy-mcp
```

A skill clona o servidor MCP, instala dependências com `uv`, pede o Client ID e Client Secret e registra o servidor no Claude Code (escopo `user` por padrão). Após a instalação, **reinicie o Claude Code** para as tools `mcp__pipefy__*` ficarem disponíveis.

> **Importante:** adicione a Service Account como **membro de cada pipe** que você quer manipular via agente. Sem isso, o OAuth autentica mas não enxerga nada.

### 3. Clonar um template

```
/agentic-store
```

O fluxo é:

1. Confere que o MCP está conectado (se não estiver, roda `/install-pipefy-mcp`).
2. Lista os templates desta loja direto do GitHub (você sempre vê a versão mais recente do `main`).
3. Pergunta qual você quer clonar.
4. Detecta os placeholders `{{ variavel }}` do template e pede os valores numa única mensagem.
5. Mostra um plano em 5 linhas e **espera** sua aprovação (`pode executar`).
6. Cria pipe → fases → campos → AI Agents → pipe_relations, na ordem certa.
7. Devolve `pipe_id`, URL e contagem do que foi criado.

Nada é executado no Pipefy antes da aprovação explícita.

## Formato dos templates

Cada arquivo em `templates/` é um Markdown com YAML frontmatter:

```yaml
---
id: onboarding-clientes-b2b
nome: Onboarding de Clientes B2B
descricao_curta: Receba novos clientes desde contrato assinado até kickoff concluído
categoria: customer-success
versao: 1.1.0
tags: [onboarding, b2b, customer-success]
icone: 🤝
tempo_estimado_clonagem: "~45 segundos"
fases_count: 5
campos_count: 16
schema_version: 1
requer_ai_agents: true
---

# Onboarding de Clientes B2B

## 📖 Sobre este template
...

## ⚙️ Estrutura
- fases: [...]
- campos: [...]
- ai_agents: [...]
- pipe_relations: [...]
```

O corpo do `.md` descreve a estrutura do pipe (fases, campos, AI Agents, relações). Use placeholders `{{ nome_variavel }}` para qualquer valor que o usuário deva preencher na clonagem.

### Campos do frontmatter

| Campo | Obrigatório | Descrição |
|---|---|---|
| `id` | sim | Slug único do template (kebab-case) |
| `nome` | sim | Nome amigável exibido na escolha |
| `descricao_curta` | sim | Uma linha sobre o que o template faz |
| `categoria` | sim | Categoria (`customer-success`, `vendas`, `it`, etc.) |
| `versao` | sim | SemVer |
| `tags` | sim | Lista de tags para busca |
| `icone` | recomendado | Emoji exibido junto ao nome |
| `fases_count` | sim | Quantidade de fases |
| `campos_count` | sim | Quantidade total de campos |
| `requer_ai_agents` | sim | `true` se o template inclui AI Agents |
| `schema_version` | sim | Versão do schema deste arquivo |

## Contribuindo um novo template

1. Crie um novo arquivo em `templates/<slug>.md` seguindo o formato acima.
2. Use placeholders `{{ variavel }}` para valores que o usuário precisará preencher.
3. Teste rodando `/agentic-store` numa sessão local — o skill puxa do `main` do GitHub, então faça PR e merge antes de testar a versão publicada (ou aponte o skill temporariamente para sua branch durante desenvolvimento).
4. Abra um PR.

## Atualização e remoção do MCP

```bash
# Atualizar o servidor MCP
cd ~/.pipefy-mcp-server && git pull && uv sync

# Remover o MCP
claude mcp remove pipefy
```

## Licença

MIT.

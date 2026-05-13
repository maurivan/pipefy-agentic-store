# Pipefy Agentic Store

Loja pública de **templates de processo do Pipefy** que podem ser clonados em segundos no seu workspace via [Claude Code](https://claude.com/claude-code) + [MCP do Pipefy](https://github.com/gbrlcustodio/pipefy-mcp-server).

Cada template descreve um pipe completo — fases, campos, AI Agents e relações entre pipes — em um único arquivo Markdown com YAML frontmatter. O Claude Code lê o template, pede as variáveis ao usuário e cria tudo no Pipefy via MCP.

## O que tem aqui

```
.
├── README.md                            # Este arquivo
├── AGENTS.md                            # Guia para agentes de IA que editam o repo
├── INSTALL-MCP.md                       # Instruções de instalação do MCP do Pipefy
├── templates/                           # Catálogo de templates clonáveis (.md)
│   └── onboarding-clientes-b2b.md
└── .claude/skills/
    ├── install-pipefy-mcp/              # Skill local para instalar o MCP (opcional)
    └── agentic-store/                   # Skill principal — lista e clona templates
```

## Install

Instale a skill `agentic-store` no seu Claude Code para ter o comando `/agentic-store` disponível em qualquer projeto.

### Opção 1 — Prompt direto para o Claude Code (recomendado)

Cole isto numa sessão do Claude Code:

> Instale a skill `agentic-store` do repositório `maurivan/pipefy-agentic-store` no escopo global do meu Claude Code. Baixe o arquivo de `https://raw.githubusercontent.com/maurivan/pipefy-agentic-store/main/.claude/skills/agentic-store/SKILL.md` e salve em `~/.claude/skills/agentic-store/SKILL.md`. Depois me peça pra reiniciar o Claude Code.

O Claude vai criar o diretório, baixar o arquivo e te avisar pra reiniciar.

### Opção 2 — Manual no terminal

```bash
mkdir -p ~/.claude/skills/agentic-store
curl -fsSL \
  'https://raw.githubusercontent.com/maurivan/pipefy-agentic-store/main/.claude/skills/agentic-store/SKILL.md' \
  -o ~/.claude/skills/agentic-store/SKILL.md
```

### Opção 3 — Só para este projeto

Clone o repo e use-o como projeto no Claude Code — skills em `.claude/skills/` são carregadas automaticamente:

```bash
git clone https://github.com/maurivan/pipefy-agentic-store.git
cd pipefy-agentic-store
claude
```

### Verificar e ativar

Após qualquer das opções acima, **reinicie o Claude Code** e confirme que a skill apareceu:

```
/agentic-store
```

URLs úteis:

- Source da skill: <https://github.com/maurivan/pipefy-agentic-store/blob/main/.claude/skills/agentic-store/SKILL.md>
- Raw (usada pelo curl): <https://raw.githubusercontent.com/maurivan/pipefy-agentic-store/main/.claude/skills/agentic-store/SKILL.md>
- Instruções de instalação do MCP do Pipefy (puxadas automaticamente pela skill): <https://github.com/maurivan/pipefy-agentic-store/blob/main/INSTALL-MCP.md>

## Como usar

### 1. Pré-requisitos

- [Claude Code](https://claude.com/claude-code) instalado (`claude --version`)
- `git`, `uv` (`brew install uv`), `python3` 3.11+
- `gh` CLI logado (`gh auth login`)
- Uma **Service Account do Pipefy** com Client ID e Client Secret — gere em **Admin Panel → Service Accounts**

### 2. Rodar `/agentic-store`

Numa sessão do Claude Code com as skills deste repo carregadas:

```
/agentic-store
```

Ponto. A skill cuida do resto:

1. **Verifica se o MCP do Pipefy está instalado.** Se não estiver, baixa [`INSTALL-MCP.md`](./INSTALL-MCP.md) deste repo e segue as instruções (clona o servidor MCP, instala dependências com `uv`, pede Client ID/Secret, registra no Claude). Você reinicia o Claude Code e roda `/agentic-store` de novo.
2. **Lista os templates** desta loja direto do `main` no GitHub — você sempre vê a versão mais recente.
3. **Pergunta qual clonar** via menu interativo.
4. **Detecta os placeholders `{{ variavel }}`** do template e pede os valores numa única mensagem.
5. **Mostra um plano em 5 linhas** e **espera sua aprovação** (`pode executar`).
6. **Cria** pipe → fases → campos → AI Agents → pipe_relations na ordem certa.
7. **Devolve** `pipe_id`, URL do pipe e contagem do que foi criado.

Nada é executado no Pipefy antes da aprovação explícita.

> **Importante:** depois de instalar o MCP, **adicione a Service Account como membro de cada pipe** que você quer manipular via agente. Sem isso, o OAuth autentica mas não enxerga os pipes.

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

## Sobre este template
...

## Estrutura
- fases: [...]
- campos: [...]
- ai_agents: [...]
- pipe_relations: [...]
```

O corpo do `.md` descreve a estrutura do pipe (fases, campos, AI Agents, relações). Use placeholders `{{ nome_variavel }}` para qualquer valor que o usuário deva preencher na clonagem.

### Campos do frontmatter

| Campo | Obrigatório | Descrição |
|---|---|---|
| `id` | sim | Slug único do template (kebab-case, igual ao nome do arquivo) |
| `nome` | sim | Nome amigável exibido no menu |
| `descricao_curta` | sim | Uma linha sobre o que o template faz |
| `categoria` | sim | Categoria (`customer-success`, `vendas`, `it`, etc.) |
| `versao` | sim | SemVer — bump em toda mudança |
| `tags` | sim | Lista de tags para busca |
| `icone` | recomendado | Emoji exibido junto ao nome |
| `fases_count` | sim | Quantidade de fases |
| `campos_count` | sim | Quantidade total de campos |
| `requer_ai_agents` | sim | `true` se o template inclui AI Agents |
| `schema_version` | sim | Versão do schema deste arquivo (atual: `1`) |

## Contribuindo um novo template

1. Crie um arquivo em `templates/<slug>.md` seguindo o formato acima.
2. Use placeholders `{{ variavel }}` para valores que o usuário deve preencher.
3. Bump a `versao` (SemVer): patch para correções, minor para fases/campos novos, major se quebra clonagens existentes.
4. Abra um PR. A skill `/agentic-store` puxa do `main`, então o template só fica "publicado" depois do merge — para testar antes, ajuste a URL da skill temporariamente para a sua branch.

Leia também o [`AGENTS.md`](./AGENTS.md) para regras detalhadas (não introduzir dependências, não criar planos.md, não auto-commitar, etc.).

## Manutenção do MCP

```bash
# Atualizar o servidor MCP
cd ~/.pipefy-mcp-server && git pull && uv sync

# Ver config atual
claude mcp get pipefy

# Remover o MCP
claude mcp remove pipefy
```

## Licença

MIT.

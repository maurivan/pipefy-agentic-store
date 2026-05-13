# AGENTS.md

Guia para agentes de IA (Claude Code, etc.) que vão modificar este repositório.

## O que este repo é

Um catálogo público de **templates de processo do Pipefy** clonáveis via Claude Code + MCP do Pipefy. O repo não é uma aplicação executável — não tem build, deploy, dev server ou test suite. É composto de duas coisas:

1. **Templates** em `templates/*.md` — arquivos Markdown com YAML frontmatter descrevendo pipes (fases, campos, AI Agents, relações).
2. **Skills** do Claude Code em `.claude/skills/` — descritas em `SKILL.md` com frontmatter `name` + `description`.

Não introduza framework, package manager, CI, lint, ou test runner sem alinhamento explícito com o mantenedor — o repo é deliberadamente leve.

## Estrutura

```
.
├── README.md                            # Documentação para usuários humanos
├── AGENTS.md                            # Este arquivo
├── templates/                           # Catálogo público de templates
│   └── <slug>.md
└── .claude/skills/
    ├── install-pipefy-mcp/SKILL.md      # Bootstrap do servidor MCP do Pipefy
    └── agentic-store/SKILL.md           # Clonagem interativa de templates
```

## Skills — limites e responsabilidades

### `install-pipefy-mcp`

- Instala `github.com/gbrlcustodio/pipefy-mcp-server` em `~/.pipefy-mcp-server`.
- Coleta Client ID + Client Secret da Service Account interativamente (texto livre, **não** AskUserQuestion).
- Registra o MCP via `claude mcp add` (escopo `user` por padrão).
- **Nunca** loga os secrets em texto puro no transcript após a coleta.
- **Não** commita nada no repo do projeto.

### `agentic-store`

- Lê templates do `main` deste repo via GitHub API (`gh api` preferido, `curl` como fallback).
- Sempre **aspar URLs com `?`, `&`, `*`, `[]`** — zsh trata como glob e dá `no matches found`.
- Faz preflight do MCP (`claude mcp get pipefy`) e roteia para `install-pipefy-mcp` se necessário.
- **Espera aprovação explícita** (`pode executar` / sim / ok) antes de criar qualquer coisa no Pipefy.
- Tool calls do MCP em ordem **sequencial** (pipe → fases → campos → AI agents → pipe_relations) — há dependências entre eles.
- Cache de template em `/tmp/agentic-store-*.md`, nunca grava no repo.
- AI Agents requerem `aiAgentsEnabled = true` no pipe e `repo_uuid = pipe.uuid` (não o `pipe_id` numérico).

## Convenções de template

Cada arquivo em `templates/` precisa de:

- **Slug** (`id`) em kebab-case, igual ao nome do arquivo sem `.md`.
- **Frontmatter completo** — ver `README.md` para a tabela de campos obrigatórios.
- **Placeholders `{{ variavel }}`** com `snake_case` para valores que o usuário preenche na clonagem. Mantenha os espaços: `{{ nome_do_pipe }}`, não `{{nome_do_pipe}}` — o regex da skill aceita os dois, mas a convenção é com espaço.
- **`fases_count` e `campos_count` corretos** — a skill mostra esses números na escolha; valores errados confundem o usuário.
- **`requer_ai_agents: true`** se houver `ai_agents` no corpo; isso vira badge na lista.

Ao criar/editar templates:

1. Bumpe a `versao` (SemVer) — patch para correções, minor para campos/fases novos, major se quebra clonagens existentes.
2. Mantenha `schema_version: 1` enquanto não mudarmos o schema do frontmatter.
3. Não use templates como teste — eles são produção. Para experimentar, abra PR e teste via branch antes de mergear.

## Regras gerais para agentes que editam este repo

- **Não rode o skill `/agentic-store` em modo "execução real" durante desenvolvimento sem autorização.** Ele cria pipes reais no Pipefy do usuário.
- **Não commite nem push automaticamente.** Sempre pergunte antes de `git commit`, `git push`, ou qualquer ação que afete o GitHub remoto.
- **Não crie arquivos `.md` de análise, plano ou resumo** (CHANGES.md, PLAN.md, etc.) — trabalhe direto no diff e use a descrição do PR para narrativa.
- **Não introduza dependências npm/pip/etc.** Este repo é só Markdown + skills.
- **Não ative hooks, CI, ou automações** sem alinhamento — eles afetam quem faz fork do repo.
- **Edite, não recrie.** Prefira `Edit` a `Write` em arquivos existentes para minimizar diff.
- **Skills referenciam-se pelo `name` do frontmatter**, não pelo path. Se você criar uma skill nova, escolha um `name` em kebab-case único.

## Verificação manual após mudança

- **Mexeu em `agentic-store`:** rode `gh api 'repos/maurivan/pipefy-agentic-store/contents/templates?ref=main' --jq '.[].name'` localmente para confirmar que a listagem ainda funciona, e leia o `SKILL.md` completo de novo procurando comandos com `?`/`&` sem aspas.
- **Mexeu em `install-pipefy-mcp`:** verifique se `claude mcp` ainda tem os subcomandos referenciados rodando `claude mcp --help`. A CLI já mudou no passado (o subcomando `add-env` deixou de existir; agora é `add -e KEY=VALUE`).
- **Mexeu num template:** confira que `grep -oE '\{\{ *[a-zA-Z_][a-zA-Z0-9_]* *\}\}' templates/<slug>.md | sort -u` lista todas as variáveis que o usuário deveria informar — placeholder esquecido vira string literal no pipe criado.

## Quando perguntar ao usuário antes de agir

- Antes de qualquer `git push`, `gh pr create`, ou alteração no GitHub remoto.
- Antes de invocar `/agentic-store` em modo real (cria pipes no Pipefy).
- Antes de adicionar uma skill nova (decisão de produto).
- Antes de alterar o `schema_version` do frontmatter (afeta retrocompatibilidade).

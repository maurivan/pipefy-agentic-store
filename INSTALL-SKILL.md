# Instalação da skill `agentic-store`

Instruções autoexplicativas para instalar a skill `agentic-store` (do repo `maurivan/pipefy-agentic-store`) no Claude Code.

Um agente que estiver seguindo este documento deve executá-lo **em ordem**, parando e reportando ao usuário se qualquer passo falhar.

## Constantes

- **Repositório:** `maurivan/pipefy-agentic-store`
- **Branch:** `main`
- **SKILL.md remoto (raw URL):** `https://raw.githubusercontent.com/maurivan/pipefy-agentic-store/main/.claude/skills/agentic-store/SKILL.md`
- **Caminho global (escopo de usuário):** `~/.claude/skills/agentic-store/SKILL.md`
- **Caminho local (escopo de projeto):** `./.claude/skills/agentic-store/SKILL.md` (relativo ao cwd)

## Passo 1 — Perguntar escopo

Use `AskUserQuestion` com 2 opções:

- **Global (`~/.claude/skills/`)** (recomendado) — disponível em todos os projetos do Claude Code nesta máquina.
- **Apenas neste projeto (`./.claude/skills/`)** — só no diretório atual.

Determine `TARGET_DIR`:
- Global → `$HOME/.claude/skills/agentic-store`
- Projeto → `$PWD/.claude/skills/agentic-store`

**Não decida sozinho.** Sempre pergunte, mesmo que o usuário esteja num repositório git (cwd não implica escopo).

## Passo 2 — Verificar se já existe

```bash
test -e "<TARGET_DIR>/SKILL.md" && echo "exists" || echo "missing"
```

Se **exists**, pergunte (via `AskUserQuestion`) se quer **sobrescrever** ou **cancelar**. Não sobrescreva sem confirmação.

## Passo 3 — Criar diretório e baixar SKILL.md

```bash
mkdir -p "<TARGET_DIR>"
curl -fsSL 'https://raw.githubusercontent.com/maurivan/pipefy-agentic-store/main/.claude/skills/agentic-store/SKILL.md' \
  -o "<TARGET_DIR>/SKILL.md"
```

Verifique que o arquivo foi escrito e não está vazio:

```bash
test -s "<TARGET_DIR>/SKILL.md" && echo "ok" || echo "vazio"
```

Se vazio ou se o `curl` falhar, pare e reporte.

## Passo 4 — Mensagem final ao usuário

1. Skill instalada em `<TARGET_DIR>/SKILL.md` (escopo: `global` ou `projeto`).
2. **Reinicie o Claude Code** (feche e reabra a sessão) para a skill aparecer na lista.
3. Após o restart, rode `/agentic-store` numa sessão para usá-la.

## Regras de comportamento

- **Sempre pergunte o escopo** — não escolha sozinho.
- **Não sobrescreva** um SKILL.md existente sem confirmação.
- **Não baixe nada além do SKILL.md** — não clone o repo inteiro, não baixe outros arquivos.
- **Não commita nada** no repo do usuário.
- Se algum passo falhar, pare e reporte; não pule etapas.

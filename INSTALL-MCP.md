# Instalação do MCP do Pipefy

Instruções autoexplicativas para instalar e configurar o [Pipefy MCP Server](https://github.com/gbrlcustodio/pipefy-mcp-server) no Claude Code.

Um agente que estiver seguindo este documento deve executá-lo **em ordem**, parando e reportando ao usuário se qualquer passo falhar.

## Constantes

- **Repositório do MCP:** `https://github.com/gbrlcustodio/pipefy-mcp-server.git`
- **Diretório de instalação:** `~/.pipefy-mcp-server` (resolva `~` para `$HOME`)
- **Nome do MCP no Claude:** `pipefy`
- **Env vars obrigatórias** (todas as 5):
  - `PIPEFY_OAUTH_CLIENT` — Client ID (Secret ID) da Service Account
  - `PIPEFY_OAUTH_SECRET` — Client Secret (Secret Key) da Service Account
  - `PIPEFY_GRAPHQL_URL` = `https://app.pipefy.com/graphql`
  - `PIPEFY_INTERNAL_API_URL` = `https://app.pipefy.com/internal_api`
  - `PIPEFY_OAUTH_URL` = `https://app.pipefy.com/oauth/token`

## Passo 1 — Verificar pré-requisitos

Rode em paralelo. Reporte falhas e pare antes de seguir.

```bash
command -v git >/dev/null && git --version
command -v uv  >/dev/null && uv --version
command -v claude >/dev/null && claude --version
python3 --version
```

- `git`, `uv`, `claude`, `python3` 3.11+ obrigatórios.
- Se `uv` faltar, instrua o usuário: `curl -LsSf https://astral.sh/uv/install.sh | sh` (não rode sem confirmação).
- Se `python3 < 3.11`, aborte.

## Passo 2 — Clonar o repositório

```bash
test -d "$HOME/.pipefy-mcp-server/.git" && echo "exists" || echo "missing"
```

- Se **missing**: `git clone https://github.com/gbrlcustodio/pipefy-mcp-server.git "$HOME/.pipefy-mcp-server"`
- Se **exists**: pergunte (via `AskUserQuestion`) se quer reutilizar ou rodar `git -C "$HOME/.pipefy-mcp-server" pull --ff-only`.

## Passo 3 — Instalar dependências

```bash
uv sync --directory "$HOME/.pipefy-mcp-server"
```

Se falhar, mostre o stderr completo e pare.

## Passo 4 — Coletar credenciais

Peça em **mensagens separadas** (texto livre, não `AskUserQuestion`). **Não ecoe os valores de volta** — confirme apenas com os últimos 4 caracteres (`***1a2b`).

1. Primeira mensagem ao usuário:

   > Cole agora o **Client ID** (Secret ID) da Service Account do Pipefy. Você gera em **Admin Panel → Service Accounts**. Ele será salvo na configuração do MCP local — **não** será enviado a lugar nenhum além disso.

   Guarde como `PIPEFY_OAUTH_CLIENT`. Trim whitespace. Se vier vazio, peça de novo.

2. Segunda mensagem ao usuário:

   > Agora cole o **Client Secret** (Secret Key) da Service Account. Mesma origem (Admin Panel → Service Accounts). Cuidado: trate como senha — não compartilhe esse valor.

   Guarde como `PIPEFY_OAUTH_SECRET`. Trim whitespace. Se vier vazio, peça de novo.

**Não escreva os valores em arquivo nenhum do repo** (`.env`, `.mcp.json`, etc.) — eles vão direto pra config do MCP no passo 6.

## Passo 5 — Escolher escopo

Use `AskUserQuestion` com 3 opções:

- **user** (recomendado) — disponível em todos os projetos do Claude Code nesta máquina.
- **local** — só neste projeto, não compartilhado via git.
- **project** — grava `.mcp.json` na raiz do repo (tipicamente commitado). **Avise** que os secrets coletados vazariam se o usuário escolher esse e commitar.

## Passo 6 — Registrar o MCP

A versão atual do `claude mcp add` aceita env vars **inline** com `-e KEY=VALUE`.

> **Atenção:** versões antigas tinham `claude mcp add-env <name> <key> <value>`, mas esse subcomando **não existe mais**. Não use.

Para evitar logar os secrets no transcript do agente, escreva os valores em arquivos temporários e passe via `$(cat ...)`:

```bash
TMP_ID=$(mktemp)
TMP_SECRET=$(mktemp)
printf %s '<CLIENT_ID>'     > "$TMP_ID"
printf %s '<CLIENT_SECRET>' > "$TMP_SECRET"

claude mcp add --scope <SCOPE> pipefy \
  -e "PIPEFY_OAUTH_CLIENT=$(cat "$TMP_ID")" \
  -e "PIPEFY_OAUTH_SECRET=$(cat "$TMP_SECRET")" \
  -e "PIPEFY_GRAPHQL_URL=https://app.pipefy.com/graphql" \
  -e "PIPEFY_INTERNAL_API_URL=https://app.pipefy.com/internal_api" \
  -e "PIPEFY_OAUTH_URL=https://app.pipefy.com/oauth/token" \
  -- uv run --directory "$HOME/.pipefy-mcp-server" pipefy-mcp-server

rm -f "$TMP_ID" "$TMP_SECRET"
```

Se `claude mcp add` retornar `MCP server pipefy already exists`, pergunte ao usuário se quer substituir. Se sim, rode `claude mcp remove pipefy -s <SCOPE>` antes de tentar de novo.

## Passo 7 — Verificar

```bash
claude mcp list
claude mcp get pipefy
```

- A saída de `mcp list` deve conter `pipefy: ... ✓ Connected`.
- A saída de `mcp get pipefy` deve listar as 5 env vars.

Se falhar, mostre a saída exata e pare.

## Passo 8 — Mensagem final ao usuário

1. MCP instalado em `~/.pipefy-mcp-server` e registrado como `pipefy` (escopo: `<escolhido>`).
2. **Reinicie o Claude Code** (feche e reabra a sessão) para as tools `mcp__pipefy__*` carregarem.
3. **Adicione a Service Account como membro de cada pipe** que o agente vai acessar — sem isso, o OAuth autentica mas não enxerga os pipes.
4. Atualizar depois: `cd ~/.pipefy-mcp-server && git pull && uv sync`
5. Remover: `claude mcp remove pipefy`

## Regras de comportamento

- **Nunca logue ou ecoe os secrets** após o usuário colá-los. Mascarar para os últimos 4 caracteres.
- **Não rode `git pull`, `uv sync` ou `claude mcp add` em paralelo** — escrevem em estado compartilhado.
- **Não commita nada** no repo do usuário como parte deste fluxo.
- Se qualquer passo falhar, pare e reporte; não pule etapas.
- Se o usuário interromper, deixe o estado parcial como está e informe ao usuário quais passos foram concluídos.

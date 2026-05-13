---
name: install-pipefy-mcp
description: Instala e configura o Pipefy MCP Server (github.com/gbrlcustodio/pipefy-mcp-server) no Claude Code, pedindo de forma interativa o Client ID e o Client Secret da Service Account do Pipefy.
---

# Install Pipefy MCP Server

You are guiding the user through the installation and configuration of the **Pipefy MCP Server** (open-source community project at `https://github.com/gbrlcustodio/pipefy-mcp-server`) so it becomes available inside Claude Code.

Follow the steps below **in order**. Do not skip steps. If a step fails, stop and surface the error to the user before continuing.

## Constants

- **Repository:** `https://github.com/gbrlcustodio/pipefy-mcp-server.git`
- **Clone target:** `~/.pipefy-mcp-server` (expand `~` to the user's home; do not hardcode it).
- **MCP server name** (used in `claude mcp` commands): `pipefy`
- **Required env vars** (all five must be set on the MCP entry):
  - `PIPEFY_OAUTH_CLIENT` — the **Client ID** (a.k.a. "Secret ID") from the Pipefy Service Account
  - `PIPEFY_OAUTH_SECRET` — the **Client Secret** (a.k.a. "Secret Key") from the Pipefy Service Account
  - `PIPEFY_GRAPHQL_URL` = `https://app.pipefy.com/graphql`
  - `PIPEFY_INTERNAL_API_URL` = `https://app.pipefy.com/internal_api`
  - `PIPEFY_OAUTH_URL` = `https://app.pipefy.com/oauth/token`

## Step 1 — Preflight: verify prerequisites

Run these checks in parallel and report any failure before continuing. Do **not** silently auto-install anything.

```bash
command -v git >/dev/null && git --version
command -v uv  >/dev/null && uv --version
command -v claude >/dev/null && claude --version
python3 --version
```

- `git` is required.
- `uv` is required. If missing, tell the user to install it via `curl -LsSf https://astral.sh/uv/install.sh | sh` (do not run it without confirmation).
- `claude` CLI is required to register the MCP — if missing, abort with a clear message.
- `python3` must be **3.11 or higher**. If lower, abort and ask the user to install a newer Python.

## Step 2 — Clone (or update) the repository

The clone target is `~/.pipefy-mcp-server`. Check whether it already exists:

```bash
test -d "$HOME/.pipefy-mcp-server/.git" && echo "exists" || echo "missing"
```

- If **missing**, clone it:
  ```bash
  git clone https://github.com/gbrlcustodio/pipefy-mcp-server.git "$HOME/.pipefy-mcp-server"
  ```
- If it **already exists**, ask the user whether to:
  1. Reuse as-is, or
  2. Pull latest (`git -C "$HOME/.pipefy-mcp-server" pull --ff-only`).

  Use `AskUserQuestion` for this choice. Do **not** force-pull or reset without consent.

## Step 3 — Install dependencies with `uv`

Sync the Python virtualenv. This pins the project's dependencies declared in `pyproject.toml`/`uv.lock`.

```bash
uv sync --directory "$HOME/.pipefy-mcp-server"
```

If `uv sync` fails (e.g. Python version mismatch, network), surface the full stderr and stop.

## Step 4 — Collect credentials interactively

You **must** prompt the user for two secrets, one at a time, using plain text messages (not `AskUserQuestion`, since these are free-text secrets, not multiple-choice). Wait for the user's reply between each prompt.

1. First, send a message asking exactly:

   > Cole agora o **Client ID** (Secret ID) da Service Account do Pipefy. Você gera em **Admin Panel → Service Accounts**. Ele será salvo na configuração do MCP local — **não** será enviado a lugar nenhum além disso.

   Wait for the response. Store the value as `PIPEFY_OAUTH_CLIENT`. Trim whitespace. If empty, ask again.

2. Then send a message asking exactly:

   > Agora cole o **Client Secret** (Secret Key) da Service Account. Mesma origem (Admin Panel → Service Accounts). Cuidado: trate como senha — não compartilhe esse valor.

   Wait for the response. Store the value as `PIPEFY_OAUTH_SECRET`. Trim whitespace. If empty, ask again.

**Do not echo the secret back** in your assistant messages. When confirming, show only the last 4 characters of each, e.g. `***1a2b`.

**Do not write these values to any file other than the MCP config produced by the `claude` CLI.** Never write them to a project file (`.env`, `.mcp.json` committed to git, etc.) unless the user explicitly chose project/committed scope in Step 5.

## Step 5 — Ask which MCP scope to register under

Use `AskUserQuestion` with these three options:

- **user** — Available in every Claude Code project (recommended for personal machines).
- **project** — Creates/updates `.mcp.json` at the current repo root. Shared via git, so **do not store secrets there** — they go into `.env` referenced from JSON, or you must warn the user explicitly.
- **local** — Only this project, not shared.

If the user picks **project**, before continuing **warn them** that the secrets they just pasted would end up in `.mcp.json` (which is typically committed). Confirm they want to proceed, or offer to switch to `user`/`local`.

## Step 6 — Register the MCP server with Claude Code

Resolve `~` to the absolute home path first (`echo "$HOME"`), because `claude mcp add` requires an absolute path for `--directory`.

Run the add command with the chosen scope:

```bash
claude mcp add --scope <SCOPE> pipefy \
  -- uv run --directory <ABSOLUTE_HOME>/.pipefy-mcp-server pipefy-mcp-server
```

Then register each env var (run these **sequentially**, not in parallel, to avoid CLI write races):

```bash
claude mcp add-env pipefy PIPEFY_OAUTH_CLIENT     "<VALUE_FROM_STEP_4_1>"
claude mcp add-env pipefy PIPEFY_OAUTH_SECRET     "<VALUE_FROM_STEP_4_2>"
claude mcp add-env pipefy PIPEFY_GRAPHQL_URL      "https://app.pipefy.com/graphql"
claude mcp add-env pipefy PIPEFY_INTERNAL_API_URL "https://app.pipefy.com/internal_api"
claude mcp add-env pipefy PIPEFY_OAUTH_URL        "https://app.pipefy.com/oauth/token"
```

**Critical:** when passing the secret values via `Bash`, the `command` string is logged. To avoid leaking the secret in the transcript, write each value to a temp file first and pass it via `"$(cat /tmp/...)"`, then `shred`/`rm` the file. Example:

```bash
TMP=$(mktemp) && printf %s "<SECRET>" > "$TMP" \
  && claude mcp add-env pipefy PIPEFY_OAUTH_SECRET "$(cat "$TMP")" \
  && rm -f "$TMP"
```

(Do the same for `PIPEFY_OAUTH_CLIENT`.)

## Step 7 — Verify

Run:

```bash
claude mcp list
```

Confirm that `pipefy` appears in the output with the chosen scope. Then run:

```bash
claude mcp get pipefy
```

Confirm the five env vars are present (their **values will be masked** by the CLI — that's expected).

If verification fails, surface the exact output and stop.

## Step 8 — Final message to the user

Tell the user:

1. The MCP server is installed at `~/.pipefy-mcp-server` and registered as `pipefy` (scope: `<chosen scope>`).
2. They may need to **restart Claude Code** (close and reopen the session) for the new MCP tools to load.
3. They should **add the Service Account as a member of every pipe they want the agent to access** — without that, the OAuth token authenticates but has no scope on those pipes.
4. To update the server later: `cd ~/.pipefy-mcp-server && git pull && uv sync`.
5. To remove it: `claude mcp remove pipefy`.

## Behavior rules

- **Never log or repeat the raw secret values** in any assistant message after the user pastes them. Mask to last-4 only.
- **Do not run `git pull`, `uv sync`, or `claude mcp add` in parallel.** They write to shared state.
- **Do not commit anything** to the user's repo as part of this skill.
- If any step fails, stop and report; do not continue to later steps.
- If the user interrupts mid-flow, leave the system in whatever partial state it's in and tell them which steps completed.

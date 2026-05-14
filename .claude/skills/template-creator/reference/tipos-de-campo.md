# Tipos de campo — referência

Lista completa dos tipos de campo aceitos pelo Pipefy MCP, com orientação de **quando usar cada um**. Tipos em ordem de frequência de uso.

## Tipos de texto

| Tipo | Quando usar | Validação |
|------|-------------|-----------|
| `short_text` | Texto livre curto: nome, título, código de referência | Até ~500 chars no frontend |
| `long_text` | Texto livre longo: descrição, observações, feedback, resumo | Sem limite prático |
| `email` | Endereço de email | Formato email válido |
| `phone` | Telefone | Apenas formato visual, não bloqueia |
| `cpf` | CPF (Brasil) | Validação de dígito verificador |
| `cnpj` | CNPJ (Brasil) | Validação de dígito verificador |

## Tipos numéricos

| Tipo | Quando usar | Campos extras |
|------|-------------|---------------|
| `number` | Quantidade, contagem, score, NPS | `min`, `max` |
| `currency` | Valores monetários (contrato, despesa, comissão) | `moeda` (BRL, USD, EUR) |

**Quando escolher `currency` vs `number`:** se o valor representa dinheiro, sempre `currency`. Ele formata na exibição (R$ 1.234,56) e participa de relatórios financeiros do Pipefy. `number` é para tudo que não é dinheiro.

## Tipos de data

| Tipo | Quando usar |
|------|-------------|
| `date` | Data sem hora: data de assinatura, prazo final, aniversário |
| `datetime` | Data + hora: agendamento de reunião, timestamp de evento |

## Tipos de seleção (escolha de uma opção entre N)

| Tipo | Quando usar |
|------|-------------|
| `select` | Dropdown — boa pra muitas opções (5+) ou quando ocupa pouco espaço |
| `radio_vertical` | Radio em coluna — 2-4 opções, todas visíveis |
| `radio_horizontal` | Radio em linha — 2-3 opções curtas (sim/não/talvez) |

Todos exigem `opcoes: [...]` com lista de strings.

## Tipos de seleção múltipla

| Tipo | Quando usar |
|------|-------------|
| `checklist_vertical` | Múltiplos checkboxes em coluna — checklist de tarefas, recursos |
| `checklist_horizontal` | Múltiplos checkboxes em linha — tags rápidas |

**Diferença vs `select`:** `checklist_*` permite marcar várias; `select`/`radio_*` permite só uma.

## Tipos especiais

| Tipo | Quando usar |
|------|-------------|
| `assignee_select` | Atribuir responsável — lista os membros do pipe automaticamente |
| `attachment` | Anexar arquivo (PDF, imagem, planilha) |
| `label_select` | Tag visual (rótulo colorido) — bom para prioridade, status visual |

## Tipos de conexão

| Tipo | Quando usar | Campos extras |
|------|-------------|---------------|
| `connector` | Referenciar card de outro pipe OU registro de uma database table | `conector_pipe` (id do pipe) OU `conector_tabela` (id da tabela) |

**Exemplo:** num pipe de Onboarding, ter um campo `cliente` do tipo `connector` apontando para a database table `clientes`. Quando preenchido, o usuário escolhe um cliente cadastrado.

## Árvore de decisão — qual tipo usar?

**O valor é texto livre?**
- Curto → `short_text`
- Longo → `long_text`
- Email → `email`
- Telefone → `phone`
- CPF/CNPJ → `cpf` / `cnpj`

**O valor é numérico?**
- Dinheiro → `currency`
- Outro número → `number`

**O valor é uma data?**
- Sem hora → `date`
- Com hora → `datetime`

**O valor é escolha entre opções fixas?**
- Uma opção, lista curta visível → `radio_vertical` ou `radio_horizontal`
- Uma opção, lista longa → `select`
- Múltiplas opções → `checklist_vertical` ou `checklist_horizontal`
- Tag visual → `label_select`

**O valor é uma pessoa?**
- Responsável do card → `assignee_select`

**O valor é um arquivo?**
- → `attachment`

**O valor referencia outro card ou registro?**
- Card de outro pipe → `connector` com `conector_pipe`
- Registro de uma database table → `connector` com `conector_tabela`

## Erros comuns ao escolher tipos

**Usar `short_text` para dinheiro.** Perde formatação, validação e participação em relatórios. Use `currency`.

**Usar `select` quando deveria ser `connector`.** Se a lista cresce com o tempo (clientes, fornecedores), use `connector` apontando para database table. Listas estáticas (status, prioridade) ficam OK em `select`.

**Usar `checklist_vertical` quando deveria ser fases.** Se cada item do checklist tem prazo, responsável e fluxo, isso são fases — não campos.

**Usar `long_text` quando deveria ser estruturado.** Se o usuário sempre preenche "Nome: X, Email: Y, Telefone: Z", vire 3 campos. Long_text vira lixo difícil de filtrar.

**Esquecer `obrigatorio: true` em campos críticos.** Se o pipe trava sem aquele dado, marque obrigatório. Senão você descobre tarde que metade dos cards está incompleto.

**Usar `yes_no` como tipo de campo.** ⚠️ `yes_no` **não é tipo válido** em `create_phase_field` nem `create_table_field`. Pipefy rejeita com erro enganoso `"Phase not found"`. Use `radio_horizontal` com `opcoes: ["Sim", "Não"]` no lugar — visualmente idêntico no card, mas reconhecido pela API.

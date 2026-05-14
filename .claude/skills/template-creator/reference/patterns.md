# Padrões paramétricos — arquétipos de processo

Quase todo processo de negócio cabe em um dos 4 esqueletos abaixo. Em vez de inventar do zero, **encaixe** o briefing num arquétipo, e use os parâmetros pra customizar.

Cada arquétipo lista:
- **Forma estrutural** — sequência de fases típica
- **Parâmetros** — o que muda por instância (vira variáveis ou decisões da entrevista)
- **Campos típicos por fase** — abstraídos sem domínio
- **AI Agents naturais** — quando o padrão admite (auto-proposal heurística)
- **Anti-patterns** — armadilhas comuns desse arquétipo

---

## 1. intake → review → decide

**Forma:** Captura → análise → decisão → execução

```
Fase 1 (start form): Captura (formulário inicial)
Fase 2: Verificação / KYC / Documentação
Fase 3: Análise / Avaliação / Cálculo
Fase 4: Decisão / Comitê / Aprovação
Fase 5: Execução / Formalização
Fase 6 (done): Concluído
```

**Encaixa em:** aprovação de despesas, homologação de fornecedor, concessão de crédito, contratação de prestador, recrutamento (candidato → entrevista → oferta), revisão de contrato, abertura de conta, KYC inicial.

**Parâmetros (viram variáveis ou decisões da entrevista):**
- Quem decide (gestor, comitê, alçada matricial)
- Limite de alçada simples vs. comitê (geralmente numérico)
- Critérios de aceitação (score, valor, categoria)
- SLA total
- Granularidade de "análise" (uma fase só vs. múltiplas: documental + financeira + técnica)

**Campos típicos por fase:**
- Captura: identificação do item/cliente, valor/escopo, contato, finalidade
- Verificação: documentos (`attachment`), status (`select: Aprovado/Pendente/Reprovado`), pendências (`long_text`), flag de compliance (`radio_horizontal Sim/Não`)
- Análise: indicadores numéricos, rating (`select`), parecer (`long_text`)
- Decisão: resumo executivo (`long_text`), decisão (`select` com 2-3 valores), justificativa, valor aprovado, condições
- Execução: contrato anexado (`attachment`), data, conta/identificador, valor executado
- Done: dados de fechamento

**AI Agents naturais:**
- Verificação/KYC: **triagem documental** (anexo → pendências + status)
- Análise: **classificação** (indicador numérico → rating categórico) ou **lookup de histórico** (se houver database table de clientes ativos)
- Decisão: **resumo executivo** (sintetiza fases anteriores no campo de resumo)

**Anti-patterns:**
- Misturar "captura" com "verificação" na mesma fase (vira formulário gigante)
- Fase de execução sem campo `attachment` (sem evidência do que foi executado)
- AI Agent escrevendo no campo `decisao` (esse campo é exclusivo humano)
- Pular a decisão (vira `linear flow` com nome enganoso)

---

## 2. linear flow

**Forma:** Etapas sequenciais sem decisão complexa — cada fase é um marco de progresso.

```
Fase 1 (start form): Início / Cadastro
Fase 2: Preparação
Fase 3: Execução
Fase 4: Validação / Aceite
Fase 5 (done): Concluído
```

**Encaixa em:** onboarding de cliente, onboarding de funcionário, implantação de sistema, produção (kanban industrial), entrega de projeto, ciclo de avaliação.

**Parâmetros:**
- Quantidade de checkpoints (cada um é uma fase)
- Quem executa cada fase (papel responsável)
- SLA por etapa
- O que conta como "aceite" na fase final

**Campos típicos por fase:**
- Início: identificação do item, contato, escopo, expectativa
- Cada etapa intermediária: campos da entrega esperada nessa fase (datas, anexos, confirmação)
- Validação: aceite formal (`radio_horizontal Sim/Não`), feedback (`long_text`)
- Done: data de fechamento, satisfação (opcional)

**AI Agents naturais:**
- Poucos. O padrão é orientado a execução, não a decisão.
- Se houver coleta documental em alguma fase: **validação documental**
- Se houver campo de feedback livre na validação: **resumo de feedback** (long_text → bullet points estruturados)

**Anti-patterns:**
- >7 fases (vira lista de tarefas; considere quebrar em pipes conectados)
- Cada fase tem 1-2 campos só (granular demais; consolidar)
- Field condition pra esconder campos por fase (linearidade não precisa disso)
- AI Agent forçado sem padrão estrutural claro

---

## 3. triage → routing

**Forma:** Item entra, é classificado, segue caminhos diferentes baseado na classificação.

```
Fase 1 (start form): Entrada (qualquer item)
Fase 2: Triagem / Classificação
Fase 3+: Caminhos específicos por tipo (uma fase por categoria principal)
Fase final (done): Resolvido / Encerrado
```

**Encaixa em:** tickets de suporte, leads de venda (SDR), backlog de TI, fila de atendimento, requisições genéricas.

**Parâmetros:**
- Critérios de classificação (categoria, prioridade, time responsável)
- Quantos caminhos diferentes (geralmente 3-6)
- SLA por classificação (urgente vs. normal)

**Campos típicos por fase:**
- Entrada: descrição do item (`long_text`), solicitante, urgência reportada
- Triagem: categoria (`select`), prioridade (`select`), time (`select`), idioma se relevante, resumo (`long_text`)
- Caminhos específicos: campos próprios de cada categoria; field conditions úteis aqui
- Done: solução aplicada, tempo gasto, satisfação

**AI Agents naturais (foco em triagem é o sweet spot):**
- **Classificação multidimensional**: descrição livre → categoria + prioridade + time + idioma + resumo (1 behavior populando vários campos)
- **Lookup de segmento**: identifica solicitante → enriquece com dados de database table (segmento, tier, contrato)
- **Detecção de duplicata**: novo item entra → procura cards similares já abertos

**Anti-patterns:**
- Sem fase de triagem (cards vão direto pra resolução sem classificação)
- Triagem manual quando IA classificaria melhor
- Caminhos como fases paralelas em vez de field conditions (use phase jumps configuradas via UI ou só uma fase de "Em atendimento" com label da categoria)

---

## 4. periodic refresh

**Forma:** Disparado por scheduler em intervalo regular → coleta dados → re-valida → fecha.

```
Fase 1 (start form ou scheduler): Disparo (programado ou manual)
Fase 2: Solicitação de dados atualizados
Fase 3: Coleta / Aguardo de resposta
Fase 4: Re-validação
Fase 5 (done): Refresh concluído
```

**Encaixa em:** KYC anual, refresh de cadastro, auditoria periódica, certificação recorrente, renovação de contrato, compliance check-up.

**Parâmetros:**
- Periodicidade (mensal, semestral, anual)
- Critérios de re-validação (mesmos do KYC inicial? ou apenas delta?)
- Quem é notificado se houver mudança
- O que acontece se cliente não responder (escalation)

**Campos típicos por fase:**
- Disparo: identificação do item alvo, data prevista, motivo (rotineiro vs. exceção)
- Solicitação: documentos solicitados (`checklist`), data limite, link enviado
- Coleta: documentos recebidos (`attachment`), pendências (`long_text`)
- Re-validação: status (`select: Confirmado/Mudança detectada/Pendente`), diff vs. cadastro anterior (`long_text`)
- Done: data de fechamento, próxima revisão programada

**AI Agents naturais:**
- **Detecção de mudança**: cruza dados atuais vs. cadastro anterior (via database table de cadastro vivo) → flagga mudanças relevantes
- **Triagem documental** (igual ao intake→review→decide): valida documentos enviados
- **Resumo de mudanças**: gera bullet points das alterações pra log de auditoria

**Anti-patterns:**
- Replicar todo o processo inicial em vez de focar no delta
- Esquecer de marcar `data_proximo_refresh` no fechamento
- Não ter automação de scheduler (vira fluxo manual disfarçado)

---

## Como escolher o arquétipo

Pergunte (mentalmente ou ao usuário):

1. **Tem decisão central** (sim/não, aprovado/rejeitado, vai/não-vai)? → **intake → review → decide**
2. **Item entra com tipo desconhecido** e precisa ser classificado antes de seguir? → **triage → routing**
3. **Disparado por calendário** ou prazo recorrente? → **periodic refresh**
4. **Cada fase é progresso, sem decisão estrutural**? → **linear flow**

**Híbridos** acontecem (ex: ticket triagem → análise → resolução combina #3 com #1). Quando houver, declare ao usuário qual base + qual extensão, e gere coerente.

---

## Quando NÃO encaixar em arquétipo

Algumas raridades não cabem nos 4: workflows com **forking não-linear** (estado-máquina complexa), processos **assincronos com fan-out** (1 item → N filhos paralelos). Pipefy não é a melhor ferramenta pra eles — alertar o usuário antes de modelar.

Se encaixar mal e o usuário insistir, modele o melhor que conseguir com `pipe_relations` e documente as limitações no `## 📌 Pós-criação`.

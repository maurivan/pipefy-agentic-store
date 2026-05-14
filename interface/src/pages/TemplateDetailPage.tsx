import type { ReactNode } from "react";
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { MarkdownLite } from "../components/MarkdownLite";
import { countCamposInFases, type AutomacaoResumo, type FaseResumo } from "../lib/templateParser";
import { getTemplateById } from "../lib/loadTemplates";

const LABEL_CATEGORIA: Record<string, string> = {
  financeiro: "Financeiro",
  "customer-success": "Customer Success",
  operacoes: "Operações",
  vendas: "Vendas",
  it: "TI",
};

function labelCategoria(slug: string): string {
  return LABEL_CATEGORIA[slug] ?? slug.replace(/-/g, " ");
}

function Section({
  title,
  id,
  children,
}: {
  title: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <section className="detail-section" id={id} aria-labelledby={`${id}-heading`}>
      <h2 className="detail-h2" id={`${id}-heading`}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function FaseBlock({ fase, index }: { fase: FaseResumo; index: number }) {
  const campos = fase.campos ?? [];
  return (
    <article className="fase-card">
      <header className="fase-head">
        <span className="fase-ordem">{index + 1}</span>
        <div>
          <h3 className="fase-nome">{fase.nome ?? fase.id ?? "Fase"}</h3>
          {fase.descricao ? <p className="fase-desc">{fase.descricao}</p> : null}
        </div>
      </header>
      <dl className="fase-dl">
        {fase.id ? (
          <>
            <dt>ID</dt>
            <dd>
              <code>{fase.id}</code>
            </dd>
          </>
        ) : null}
        {fase.sla_dias != null && fase.sla_dias !== "" ? (
          <>
            <dt>SLA</dt>
            <dd>{String(fase.sla_dias)} dias</dd>
          </>
        ) : null}
        {fase.done ? (
          <>
            <dt>Conclusão</dt>
            <dd>Sim (fase final)</dd>
          </>
        ) : null}
      </dl>
      {campos.length > 0 ? (
        <>
          <h4 className="fase-campos-title">Campos ({campos.length})</h4>
          <ul className="campo-list">
            {campos.map((c, i) => (
              <li key={c.id ?? i}>
                <span className="campo-label">{c.label ?? c.id ?? "Campo"}</span>
                {c.tipo ? (
                  <span className="campo-tipo">
                    <code>{c.tipo}</code>
                  </span>
                ) : null}
                {c.obrigatorio ? <span className="pill pill-req">obrigatório</span> : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </article>
  );
}

function formatQuando(a: AutomacaoResumo): string {
  const q = a.quando;
  if (!q || typeof q !== "object") return "—";
  const parts: string[] = [];
  const ev = (q as Record<string, unknown>).evento;
  const fase = (q as Record<string, unknown>).fase;
  if (typeof ev === "string") parts.push(ev.replace(/_/g, " "));
  if (typeof fase === "string") parts.push(`fase: ${fase}`);
  return parts.length ? parts.join(" · ") : JSON.stringify(q);
}

function formatEntao(a: AutomacaoResumo): string {
  const e = a.entao;
  if (!e || typeof e !== "object") return "—";
  const o = e as Record<string, unknown>;
  const tipo = o.tipo;
  const para = o.para;
  const bits: string[] = [];
  if (typeof tipo === "string") bits.push(tipo);
  if (typeof para === "string") bits.push(`para: ${para}`);
  if (typeof o.assunto === "string") bits.push(`assunto: ${o.assunto}`);
  return bits.length ? bits.join(" · ") : JSON.stringify(e);
}

export function TemplateDetailPage() {
  const { id: idParam } = useParams();
  const id = idParam ? decodeURIComponent(idParam) : "";
  const template = useMemo(() => (id ? getTemplateById(id) : undefined), [id]);

  if (!template) {
    return (
      <Layout>
        <div className="page detail-page">
          <p className="empty">Template não encontrado.</p>
          <Link to="/" className="back-link">
            ← Voltar ao catálogo
          </Link>
        </div>
      </Layout>
    );
  }

  const fm = template.frontmatter;
  const camposParsed = countCamposInFases(template.fases);

  return (
    <Layout>
      <div className="page detail-page">
        <Link to="/" className="back-link">
          ← Catálogo
        </Link>

        <header className="detail-hero">
          <span className="detail-icon" aria-hidden>
            {fm.icone ?? "📋"}
          </span>
          <div>
            <p className="detail-cat">{labelCategoria(fm.categoria)}</p>
            <h1 className="detail-title">{fm.nome}</h1>
            <p className="detail-lede">{fm.descricao_curta}</p>
            <div className="detail-chips">
              <span className="pill">v{fm.versao}</span>
              <span className="pill">
                {fm.fases_count} fases · {fm.campos_count} campos
              </span>
              {camposParsed > 0 ? (
                <span className="pill pill-muted">{camposParsed} campos no YAML</span>
              ) : null}
              {fm.tempo_estimado_criacao ? (
                <span className="pill pill-muted">Criação ~ {fm.tempo_estimado_criacao}</span>
              ) : null}
              {fm.requer_ai_agents ? <span className="pill pill-ai">AI Agents</span> : null}
              {fm.requer_database_tables ? <span className="pill pill-db">Database tables</span> : null}
            </div>
            {fm.tags.length > 0 ? (
              <div className="detail-tags">
                {fm.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </header>

        <nav className="detail-toc" aria-label="Seções">
          <a href="#sobre">Sobre</a>
          <a href="#categoria">Categoria</a>
          <a href="#fases">Fases e campos</a>
          {template.automacoes.length > 0 ? <a href="#automacoes">Automações</a> : null}
          {template.aiAgents.length > 0 ? <a href="#ai-agents">AI Agents</a> : null}
          {template.pipeRelations.length > 0 ? <a href="#relacoes">Pipe relations</a> : null}
          {template.emailTemplates.length > 0 ? <a href="#emails">Email templates</a> : null}
          {template.variaveis.length > 0 ? <a href="#variaveis">Variáveis de criação</a> : null}
        </nav>

        {template.sobreMarkdown ? (
          <Section title="Sobre este template" id="sobre">
            <MarkdownLite text={template.sobreMarkdown} />
          </Section>
        ) : null}

        <Section title="Categoria" id="categoria">
          <p>
            <strong>{labelCategoria(fm.categoria)}</strong>{" "}
            <span className="muted">({fm.categoria})</span>
          </p>
          <p className="muted small">
            A categoria agrupa templates por área de negócio; o slug é o valor usado no frontmatter.
          </p>
        </Section>

        <Section title="Fases e campos" id="fases">
          {template.fases.length === 0 ? (
            <p className="muted">Nenhuma fase encontrada no bloco YAML do pipe neste arquivo.</p>
          ) : (
            <div className="fase-grid">
              {template.fases.map((fase, i) => (
                <FaseBlock key={fase.id ?? i} fase={fase} index={i} />
              ))}
            </div>
          )}
        </Section>

        {template.automacoes.length > 0 ? (
          <Section title="Automações" id="automacoes">
            <ul className="auto-list">
              {template.automacoes.map((a, i) => (
                <li key={a.id ?? i} className="auto-item">
                  <h3 className="auto-nome">{a.nome ?? a.id ?? "Automação"}</h3>
                  <dl className="auto-dl">
                    <dt>Quando</dt>
                    <dd>{formatQuando(a)}</dd>
                    <dt>Então</dt>
                    <dd>{formatEntao(a)}</dd>
                  </dl>
                </li>
              ))}
            </ul>
          </Section>
        ) : (
          <Section title="Automações" id="automacoes">
            <p className="muted">Este template não declara bloco YAML de automações (ou está vazio).</p>
          </Section>
        )}

        {template.aiAgents.length > 0 ? (
          <Section title="AI Agents" id="ai-agents">
            <ul className="agent-list">
              {template.aiAgents.map((agent, i) => (
                <li key={agent.id ?? i} className="agent-card">
                  <h3 className="agent-nome">{agent.nome ?? agent.id ?? "Agent"}</h3>
                  {agent.instruction ? (
                    <details className="agent-details">
                      <summary>Instrução (system)</summary>
                      <pre className="instruction-pre">{String(agent.instruction).trim()}</pre>
                    </details>
                  ) : null}
                  {agent.behaviors && agent.behaviors.length > 0 ? (
                    <>
                      <h4 className="behaviors-title">Comportamentos</h4>
                      <ul className="behavior-list">
                        {agent.behaviors.map((b, j) => (
                          <li key={j}>
                            <strong>{b.nome ?? "Comportamento"}</strong>
                            {b.trigger ? (
                              <>
                                {" "}
                                <span className="muted">
                                  · trigger: <code>{b.trigger}</code>
                                </span>
                              </>
                            ) : null}
                            {b.prompt ? (
                              <details className="behavior-prompt">
                                <summary>Prompt</summary>
                                <pre className="instruction-pre">{String(b.prompt).trim()}</pre>
                              </details>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          </Section>
        ) : (
          <Section title="AI Agents" id="ai-agents">
            <p className="muted">Nenhum AI Agent declarado neste template.</p>
          </Section>
        )}

        {template.pipeRelations.length > 0 ? (
          <Section title="Pipe relations" id="relacoes">
            <ul className="relation-list">
              {template.pipeRelations.map((r, i) => (
                <li key={r.id ?? i} className="relation-card">
                  <h3>{r.nome ?? r.id ?? "Relação"}</h3>
                  {r.cardinalidade ? (
                    <p>
                      Cardinalidade: <code>{r.cardinalidade}</code>
                    </p>
                  ) : null}
                  {r.pipe_filho_externo ? (
                    <p>
                      Pipe filho: <code>{r.pipe_filho_externo}</code>
                    </p>
                  ) : null}
                  {r.descricao ? <MarkdownLite text={r.descricao.trim()} /> : null}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {template.emailTemplates.length > 0 ? (
          <Section title="Email templates" id="emails">
            <ul className="email-list">
              {template.emailTemplates.map((e, i) => (
                <li key={e.id ?? i}>
                  <strong>{e.nome ?? e.id}</strong>
                  {e.assunto ? (
                    <span className="muted">
                      {" "}
                      — <em>{e.assunto}</em>
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {template.variaveis.length > 0 ? (
          <Section title="Variáveis de criação" id="variaveis">
            <p className="muted small">
              Valores que o usuário informa ao criar com a skill <code>/agentic-store</code>.
            </p>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Label</th>
                    <th>Tipo</th>
                    <th>Padrão</th>
                    <th>Obrig.</th>
                  </tr>
                </thead>
                <tbody>
                  {template.variaveis.map((v, i) => (
                    <tr key={v.nome ?? i}>
                      <td>
                        <code>{v.nome}</code>
                      </td>
                      <td>{v.label ?? "—"}</td>
                      <td>
                        <code>{v.tipo ?? "—"}</code>
                      </td>
                      <td>{v.default != null ? String(v.default) : "—"}</td>
                      <td>{v.obrigatorio ? "sim" : "não"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        ) : null}

        <footer className="detail-foot muted small">
          Arquivo: <code>{template.sourceFile}</code> · schema v{fm.schema_version}
          {fm.autor ? <> · autor: {fm.autor}</> : null}
        </footer>
      </div>
    </Layout>
  );
}

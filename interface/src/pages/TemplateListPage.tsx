import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { categoriasUnicas, getTemplates } from "../lib/loadTemplates";

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

export function TemplateListPage() {
  const templates = useMemo(() => getTemplates(), []);
  const cats = useMemo(() => categoriasUnicas(), []);
  const [filtroCat, setFiltroCat] = useState<string>("");
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return templates.filter((t) => {
      if (filtroCat && t.frontmatter.categoria !== filtroCat) return false;
      if (!q) return true;
      const fm = t.frontmatter;
      const hay = [fm.nome, fm.descricao_curta, fm.categoria, ...fm.tags]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [templates, filtroCat, busca]);

  return (
    <Layout>
      <div className="page list-page">
        <div className="page-hero">
          <h1>Templates de processo</h1>
          <p className="lede">
            Visualize o que cada template inclui — fases, campos, automações, AI Agents e relações —
            antes de clonar no Pipefy.
          </p>
        </div>

        <div className="toolbar">
          <label className="field">
            <span className="field-label">Buscar</span>
            <input
              type="search"
              className="input"
              placeholder="Nome, tag, categoria…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span className="field-label">Categoria</span>
            <select
              className="input"
              value={filtroCat}
              onChange={(e) => setFiltroCat(e.target.value)}
            >
              <option value="">Todas</option>
              {cats.map((c) => (
                <option key={c} value={c}>
                  {labelCategoria(c)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <ul className="card-grid">
          {filtrados.map((t) => {
            const fm = t.frontmatter;
            return (
              <li key={fm.id}>
                <Link to={`/template/${encodeURIComponent(fm.id)}`} className="card">
                  <div className="card-top">
                    <span className="card-icon" aria-hidden>
                      {fm.icone ?? "📋"}
                    </span>
                    <span className="pill pill-cat">{labelCategoria(fm.categoria)}</span>
                  </div>
                  <h2 className="card-title">{fm.nome}</h2>
                  <p className="card-desc">{fm.descricao_curta}</p>
                  <div className="card-meta">
                    <span>
                      {fm.fases_count} fases · {fm.campos_count} campos
                    </span>
                    {fm.requer_ai_agents ? <span className="pill pill-ai">AI Agents</span> : null}
                    {fm.requer_database_tables ? (
                      <span className="pill pill-db">Database</span>
                    ) : null}
                  </div>
                  <div className="card-tags">
                    {fm.tags.slice(0, 5).map((tag) => (
                      <span key={tag} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        {filtrados.length === 0 ? (
          <p className="empty">Nenhum template corresponde aos filtros.</p>
        ) : null}
      </div>
    </Layout>
  );
}

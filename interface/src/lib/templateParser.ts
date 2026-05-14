import { parse as parseYaml } from "yaml";

export type TemplateFrontmatter = {
  id: string;
  nome: string;
  descricao_curta: string;
  categoria: string;
  versao: string;
  tags: string[];
  icone?: string;
  tempo_estimado_criacao?: string;
  fases_count: number;
  campos_count: number;
  schema_version: number;
  requer_ai_agents?: boolean;
  requer_database_tables?: boolean;
  autor?: string;
};

export type CampoResumo = {
  id?: string;
  label?: string;
  tipo?: string;
  obrigatorio?: boolean;
};

export type FaseResumo = {
  id?: string;
  nome?: string;
  descricao?: string;
  ordem?: number;
  sla_dias?: number | string;
  done?: boolean;
  campos?: CampoResumo[];
};

export type AutomacaoResumo = {
  id?: string;
  nome?: string;
  quando?: Record<string, unknown>;
  entao?: Record<string, unknown>;
};

export type AiBehaviorResumo = {
  nome?: string;
  trigger?: string;
  prompt?: string;
};

export type AiAgentResumo = {
  id?: string;
  nome?: string;
  instruction?: string;
  behaviors?: AiBehaviorResumo[];
};

export type PipeRelationResumo = {
  id?: string;
  nome?: string;
  descricao?: string;
  cardinalidade?: string;
  pipe_filho_externo?: string;
};

export type EmailTemplateResumo = {
  id?: string;
  nome?: string;
  assunto?: string;
};

export type VariavelResumo = {
  nome?: string;
  label?: string;
  tipo?: string;
  default?: string | number;
  obrigatorio?: boolean;
};

export type ParsedTemplate = {
  sourceFile: string;
  frontmatter: TemplateFrontmatter;
  sobreMarkdown: string;
  fases: FaseResumo[];
  automacoes: AutomacaoResumo[];
  aiAgents: AiAgentResumo[];
  pipeRelations: PipeRelationResumo[];
  emailTemplates: EmailTemplateResumo[];
  variaveis: VariavelResumo[];
};

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

function extractYamlFences(body: string): string[] {
  const re = /```yaml\s*\r?\n([\s\S]*?)```/g;
  const blocks: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    blocks.push(m[1].trim());
  }
  return blocks;
}

function mergeYamlDocuments(body: string): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const block of extractYamlFences(body)) {
    try {
      const doc = parseYaml(block) as unknown;
      if (doc && typeof doc === "object" && !Array.isArray(doc)) {
        Object.assign(merged, doc as Record<string, unknown>);
      }
    } catch {
      /* bloco YAML inválido ou parcial — ignora */
    }
  }
  return merged;
}

function extractSobreMarkdown(body: string): string {
  const idx = body.search(/^##\s*📖/m);
  if (idx === -1) return "";
  const after = body.slice(idx);
  const next = after.search(/\n##\s/m);
  const slice = next === -1 ? after : after.slice(0, next);
  return slice.replace(/^##\s*📖[^\n]*\n?/m, "").trim();
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function parseFrontmatter(raw: string): { frontmatter: TemplateFrontmatter; body: string } {
  const m = raw.match(FRONTMATTER_RE);
  if (!m) {
    throw new Error("Frontmatter YAML ausente ou malformado");
  }
  const data = parseYaml(m[1]) as Record<string, unknown>;
  const body = m[2] ?? "";
  const frontmatter: TemplateFrontmatter = {
    id: String(data.id ?? ""),
    nome: String(data.nome ?? ""),
    descricao_curta: String(data.descricao_curta ?? ""),
    categoria: String(data.categoria ?? ""),
    versao: String(data.versao ?? ""),
    tags: asArray<string>(data.tags),
    icone: data.icone != null ? String(data.icone) : undefined,
    tempo_estimado_criacao:
      data.tempo_estimado_criacao != null ? String(data.tempo_estimado_criacao) : undefined,
    fases_count: Number(data.fases_count ?? 0),
    campos_count: Number(data.campos_count ?? 0),
    schema_version: Number(data.schema_version ?? 1),
    requer_ai_agents: Boolean(data.requer_ai_agents),
    requer_database_tables: Boolean(data.requer_database_tables),
    autor: data.autor != null ? String(data.autor) : undefined,
  };
  return { frontmatter, body };
}

export function parseTemplateMarkdown(raw: string, sourcePath: string): ParsedTemplate {
  const { frontmatter, body } = parseFrontmatter(raw);
  const merged = mergeYamlDocuments(body);
  const pipe = merged.pipe as Record<string, unknown> | undefined;
  const fases = asArray<FaseResumo>(pipe?.fases);

  const sourceFile = sourcePath.split("/").pop() ?? sourcePath;

  return {
    sourceFile,
    frontmatter,
    sobreMarkdown: extractSobreMarkdown(body),
    fases,
    automacoes: asArray<AutomacaoResumo>(merged.automacoes),
    aiAgents: asArray<AiAgentResumo>(merged.ai_agents),
    pipeRelations: asArray<PipeRelationResumo>(merged.pipe_relations),
    emailTemplates: asArray<EmailTemplateResumo>(merged.email_templates),
    variaveis: asArray<VariavelResumo>(merged.variaveis),
  };
}

export function countCamposInFases(fases: FaseResumo[]): number {
  let n = 0;
  for (const f of fases) {
    n += asArray<CampoResumo>(f.campos).length;
  }
  return n;
}

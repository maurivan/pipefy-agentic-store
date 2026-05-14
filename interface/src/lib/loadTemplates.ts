import { parseTemplateMarkdown, type ParsedTemplate } from "./templateParser";

const rawModules = import.meta.glob<string>("../../../templates/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
});

function parseAll(): ParsedTemplate[] {
  const list: ParsedTemplate[] = [];
  for (const [path, raw] of Object.entries(rawModules)) {
    try {
      list.push(parseTemplateMarkdown(raw, path));
    } catch (e) {
      console.warn(`Ignorando template em ${path}:`, e);
    }
  }
  return list.sort((a, b) =>
    a.frontmatter.nome.localeCompare(b.frontmatter.nome, "pt-BR"),
  );
}

let cache: ParsedTemplate[] | null = null;

export function getTemplates(): ParsedTemplate[] {
  if (!cache) cache = parseAll();
  return cache;
}

export function getTemplateById(id: string): ParsedTemplate | undefined {
  return getTemplates().find((t) => t.frontmatter.id === id);
}

export function categoriasUnicas(): string[] {
  const s = new Set(getTemplates().map((t) => t.frontmatter.categoria));
  return [...s].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

import type { ReactNode } from "react";

function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const m = part.match(/^\*\*([^*]+)\*\*$/);
    if (m) return <strong key={i}>{m[1]}</strong>;
    return <span key={i}>{part}</span>;
  });
}

type Props = { text: string };

export function MarkdownLite({ text }: Props) {
  const blocks = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="markdown-lite">
      {blocks.map((block, i) => {
        const lines = block.split("\n").map((l) => l.trim());
        const isList = lines.every((l) => l.startsWith("- ") || l === "");
        if (isList && lines.some((l) => l.startsWith("- "))) {
          return (
            <ul key={i}>
              {lines
                .filter((l) => l.startsWith("- "))
                .map((l, j) => (
                  <li key={j}>{renderInline(l.slice(2))}</li>
                ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            {lines.map((line, j) => (
              <span key={j}>
                {j > 0 ? " " : null}
                {renderInline(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

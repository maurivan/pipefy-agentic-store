import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type Props = { children: ReactNode };

export function Layout({ children }: Props) {
  return (
    <div className="layout">
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="brand">
            <span className="brand-mark" aria-hidden>
              ◈
            </span>
            <span>
              <span className="brand-title">Agentic Store</span>
              <span className="brand-sub">Catálogo de templates Pipefy</span>
            </span>
          </Link>
        </div>
      </header>
      <main className="main">{children}</main>
      <footer className="footer">
        <p>
          Fonte: pasta <code>templates/</code> deste repositório. Para clonar no Pipefy, use a skill{" "}
          <code>/agentic-store</code> no Claude Code.
        </p>
      </footer>
    </div>
  );
}

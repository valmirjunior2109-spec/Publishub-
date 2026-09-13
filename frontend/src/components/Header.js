"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import styles from "./Header.module.css";

const LANDING_LINKS = [
  { href: "#features", label: "O que analisamos" },
  { href: "#how-it-works", label: "Como funciona" },
  { href: "#faq", label: "Dúvidas" },
];

export default function Header() {
  const { loading, session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  // Âncoras só existem na landing; nas outras rotas o menu é o de navegação do app.
  const showAnchors = pathname === "/" && !session;

  // Fecha o menu ao trocar de rota (inclusive no voltar do navegador), ajustando
  // o estado durante a renderização em vez de num efeito.
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  async function logout() {
    setMenuOpen(false);
    await getSupabase()?.auth.signOut();
    router.push("/");
  }

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href={session ? "/dashboard" : "/"} className={styles.brand}>
          <span className={styles.logo}>P</span>
          Publishub
        </Link>

        {!loading && (
          <>
            {showAnchors && (
              <nav className={styles.anchors}>
                {LANDING_LINKS.map((link) => (
                  <a key={link.href} href={link.href} className={styles.anchor}>
                    {link.label}
                  </a>
                ))}
              </nav>
            )}

            <nav className={styles.nav}>
              {session ? (
                <>
                  <Link href="/dashboard" className="btn btn-ghost">
                    Meus vídeos
                  </Link>
                  <Link href="/analyze" className="btn btn-primary">
                    Nova análise
                  </Link>
                  <button type="button" className="btn btn-ghost" onClick={logout}>
                    Sair
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn btn-ghost">
                    Entrar
                  </Link>
                  <Link href="/signup" className="btn btn-primary">
                    Começar agora
                  </Link>
                </>
              )}
            </nav>

            <button
              type="button"
              className={styles.toggle}
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="menu-mobile"
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            >
              <span className={menuOpen ? styles.barsOpen : styles.bars} />
            </button>
          </>
        )}
      </div>

      {!loading && menuOpen && (
        <div id="menu-mobile" className={styles.mobile}>
          <div className="container">
            {showAnchors &&
              LANDING_LINKS.map((link) => (
                <a key={link.href} href={link.href} className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
                  {link.label}
                </a>
              ))}
            {session ? (
              <>
                <Link href="/dashboard" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
                  Meus vídeos
                </Link>
                <Link href="/analyze" className="btn btn-primary btn-block" onClick={() => setMenuOpen(false)}>
                  Nova análise
                </Link>
                <button type="button" className="btn btn-secondary btn-block" onClick={logout}>
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
                  Entrar
                </Link>
                <Link href="/signup" className="btn btn-primary btn-block" onClick={() => setMenuOpen(false)}>
                  Começar agora
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

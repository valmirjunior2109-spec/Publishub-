"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { getSupabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import styles from "./Header.module.css";

const LANDING_LINKS = [
  { href: "#features", label: "O que analisamos" },
  { href: "#how-it-works", label: "Como funciona" },
  { href: "#faq", label: "Dúvidas" },
];

function initialOf(user) {
  const name = user?.user_metadata?.full_name || user?.email || "";
  return name.trim().charAt(0).toUpperCase() || "?";
}

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

  const user = session?.user;

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href={session ? "/dashboard" : "/"} className={styles.brand} aria-label="Publishub">
          <Logo size={30} />
          <span className={styles.wordmark}>Publishub</span>
        </Link>

        {!loading && (
          <>
            {showAnchors && (
              <nav className={styles.anchors} aria-label="Seções">
                {LANDING_LINKS.map((link) => (
                  <a key={link.href} href={link.href} className={styles.anchor}>
                    {link.label}
                  </a>
                ))}
              </nav>
            )}

            <nav className={styles.nav} aria-label="Principal">
              {session ? (
                <>
                  <Link href="/dashboard" className={`${styles.navLink} ${pathname === "/dashboard" ? styles.navActive : ""}`}>
                    Meus vídeos
                  </Link>
                  <Link href="/analyze" className="btn btn-primary">
                    Nova análise
                  </Link>
                  <details className={styles.user}>
                    <summary className={styles.avatar} aria-label="Conta">
                      {initialOf(user)}
                    </summary>
                    <div className={styles.userMenu}>
                      <p className={styles.userEmail}>{user.email}</p>
                      <button type="button" className={styles.userAction} onClick={logout}>
                        Sair
                      </button>
                    </div>
                  </details>
                </>
              ) : (
                <>
                  <Link href="/login" className={styles.navLink}>
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
                <p className={`${styles.mobileLink} ${styles.mobileEmail}`}>{user.email}</p>
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

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import styles from "./Header.module.css";

export default function Header() {
  const { loading, session } = useSession();
  const router = useRouter();

  async function logout() {
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
                  Criar conta
                </Link>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}

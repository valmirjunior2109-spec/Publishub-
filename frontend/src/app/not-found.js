import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container page">
      <h1 className="page-title">Página não encontrada</h1>
      <p className="muted">O endereço que você acessou não existe.</p>
      <Link href="/dashboard" className="btn btn-secondary" style={{ alignSelf: "flex-start" }}>
        Ir para meus vídeos
      </Link>
    </div>
  );
}

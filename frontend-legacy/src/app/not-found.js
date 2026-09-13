import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container page" style={{ alignItems: "center", textAlign: "center", paddingTop: 96 }}>
      <div>
        <p className="eyebrow">Erro 404</p>
        <h1 className="page-title" style={{ marginTop: 10 }}>
          Essa página não existe
        </h1>
        <p className="page-lead" style={{ margin: "10px auto 0" }}>
          O endereço pode estar errado, ou o conteúdo foi removido.
        </p>
      </div>
      <Link href="/dashboard" className="btn btn-secondary">
        Ir para meus vídeos
      </Link>
    </div>
  );
}

import Link from "next/link";
import styles from "./page.module.css";

const STEPS = [
  { title: "Envie seu vídeo", text: "MP4, MOV ou WEBM, direto do celular ou do computador." },
  { title: "O Publishub analisa", text: "A IA avalia hook, cortes, ritmo, legendas e retenção." },
  { title: "Receba recomendações", text: "Pontos fracos com o momento exato e o que mudar na edição." },
];

const AREAS = [
  { title: "Hook", text: "Os primeiros segundos prendem a atenção?" },
  { title: "Edição", text: "Ritmo, cortes, pausas e trechos que podem sair." },
  { title: "Legendas", text: "Clareza, timing e quantidade de texto." },
  { title: "Retenção", text: "O que pode fazer o público sair do vídeo." },
];

export default function Home() {
  return (
    <div className="container">
      <section className={styles.hero}>
        <span className="badge">Copiloto de edição com IA</span>
        <h1 className={styles.title}>Descubra o que melhorar na edição antes de publicar</h1>
        <p className={styles.lead}>
          Envie seu vídeo → o Publishub analisa → você recebe recomendações práticas para aplicar no seu editor (CapCut,
          Premiere, o que você já usa).
        </p>
        <div className={styles.actions}>
          <Link href="/signup" className="btn btn-primary">
            Criar conta grátis
          </Link>
          <Link href="/login" className="btn btn-secondary">
            Já tenho conta
          </Link>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Como funciona</h2>
        <ol className={styles.steps}>
          {STEPS.map((step, index) => (
            <li key={step.title} className="card">
              <span className={styles.stepNumber}>{index + 1}</span>
              <h3>{step.title}</h3>
              <p className="muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>O que analisamos</h2>
        <div className={styles.areas}>
          {AREAS.map((area) => (
            <div key={area.title} className="card">
              <h3>{area.title}</h3>
              <p className="muted">{area.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

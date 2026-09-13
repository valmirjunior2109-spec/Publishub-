"use client";

import RequireAuth from "@/components/RequireAuth";
import UploadForm from "@/components/UploadForm";
import styles from "./analyze.module.css";

const NEXT_STEPS = [
  { title: "Medimos o vídeo", text: "Silêncios, volume e cortes de cena, direto do arquivo." },
  { title: "A IA avalia os frames", text: "Hook, edição, legendas e retenção, cada um com nota e motivo." },
  { title: "Você recebe o que fazer", text: "Recomendações com o momento exato, para aplicar no seu editor." },
];

export default function AnalyzePage() {
  return (
    <RequireAuth>
      {(session) => (
        <div className="container page">
          <div className="page-header">
            <div>
              <p className="eyebrow">Nova análise</p>
              <h1 className="page-title">Envie o vídeo antes de publicar</h1>
              <p className="page-lead">Você recebe as recomendações em poucos minutos. Pode fechar a página; a análise continua.</p>
            </div>
          </div>

          <div className={styles.layout}>
            <UploadForm session={session} />

            <aside className={styles.aside}>
              <p className="eyebrow">O que acontece depois</p>
              <ol className={styles.steps}>
                {NEXT_STEPS.map((step, index) => (
                  <li key={step.title} className={styles.step}>
                    <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <p className={styles.stepTitle}>{step.title}</p>
                      <p className="muted small">{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className={`muted small ${styles.tip}`}>
                Funciona melhor com o corte que você pretende publicar, não com o material bruto — assim a nota reflete o
                vídeo de verdade.
              </p>
            </aside>
          </div>
        </div>
      )}
    </RequireAuth>
  );
}

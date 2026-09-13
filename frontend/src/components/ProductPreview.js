import styles from "./ProductPreview.module.css";

/* Mockup estático da tela de análise. Os números espelham o formato real que a
   API devolve (notas 0-10, findings com timestamp), mas são ilustrativos. */

const CUTS = [
  { at: 4, label: "0:00" },
  { at: 31, label: "0:12" },
  { at: 47, label: "0:19" },
  { at: 72, label: "0:28" },
];

const FINDINGS = [
  { area: "Hook", score: 4, time: "0:00 – 0:01", text: "1,5s de silêncio antes da primeira fala." },
  { area: "Edição", score: 6, time: "0:12 – 0:15", text: "Pausa de 2,6s quebra o ritmo no meio." },
  { area: "Legendas", score: 3, time: null, text: "Sem texto na tela: quem assiste sem som se perde." },
  { area: "Retenção", score: 5, time: "0:28 – 0:31", text: "O vídeo continua depois da última frase." },
];

function scoreTone(score) {
  if (score >= 7) return styles.good;
  if (score >= 5) return styles.mid;
  return styles.low;
}

export default function ProductPreview() {
  return (
    <div className={styles.frame} aria-hidden="true">
      <div className={styles.chrome}>
        <span className={styles.dots}>
          <i />
          <i />
          <i />
        </span>
        <span className={styles.file}>reels-lancamento.mp4</span>
        <span className={styles.overall}>
          <strong>58</strong>
          <small>/100</small>
        </span>
      </div>

      <div className={styles.body}>
        <div className={styles.player}>
          <div className={styles.shot}>
            <span className={styles.subject} />
            <span className={styles.play} />
          </div>
          <div className={styles.meta}>
            <span className={styles.live}>análise concluída</span>
            <span>0:31</span>
          </div>
        </div>

        <div className={styles.panel}>
          {FINDINGS.map((f) => (
            <div key={f.area} className={styles.finding}>
              <div className={styles.findingTop}>
                <span className={styles.area}>{f.area}</span>
                <span className={`${styles.score} ${scoreTone(f.score)}`}>{f.score}/10</span>
              </div>
              <p className={styles.text}>{f.text}</p>
              {f.time && <span className={styles.stamp}>{f.time}</span>}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.timeline}>
        <div className={styles.trackRow}>
          <span className={styles.trackLabel}>Cortes sugeridos</span>
          <div className={styles.track}>
            {CUTS.map((c) => (
              <span key={c.at} className={styles.cut} style={{ left: `${c.at}%` }}>
                <em>{c.label}</em>
              </span>
            ))}
            <span className={styles.playhead} />
          </div>
        </div>
        <div className={styles.trackRow}>
          <span className={styles.trackLabel}>Ritmo</span>
          <div className={styles.wave}>
            {Array.from({ length: 44 }, (_, i) => (
              <i key={i} style={{ height: `${18 + Math.abs(Math.sin(i * 0.8)) * 70}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

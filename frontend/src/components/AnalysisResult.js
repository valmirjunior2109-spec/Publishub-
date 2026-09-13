import { formatDuration, formatTimestamp } from "@/lib/format";
import styles from "./AnalysisResult.module.css";

const PRIORITY = { high: "Alta", medium: "Média", low: "Baixa" };
const CATEGORY = { hook: "Hook", editing: "Edição", captions: "Legendas", retention: "Retenção" };
const FUNNEL = {
  top: "Topo do funil (descoberta)",
  middle: "Meio do funil (consideração)",
  bottom: "Fundo do funil (conversão)",
};

function scoreClass(score, max = 10) {
  const ratio = score / max;
  if (ratio >= 0.8) return styles.good;
  if (ratio >= 0.6) return styles.ok;
  return styles.bad;
}

function Score({ value }) {
  return (
    <span className={`${styles.score} ${scoreClass(value)}`}>
      {value}
      <span className={styles.scoreMax}>/10</span>
    </span>
  );
}

function Findings({ items, onSeek }) {
  if (!items?.length) return null;
  return (
    <ul className={styles.findings}>
      {items.map((item, index) => (
        <li key={index}>
          {item.start_seconds !== null && (
            <button type="button" className={styles.time} onClick={() => onSeek(item.start_seconds)} title="Ver este momento">
              ▶ {formatTimestamp(item.start_seconds)}
              {item.end_seconds !== null && item.end_seconds - item.start_seconds >= 1 ? `–${formatTimestamp(item.end_seconds)}` : ""}
            </button>
          )}
          <p>
            <strong>Problema:</strong> {item.problem}
          </p>
          <p>
            <strong>Recomendação:</strong> {item.recommendation}
          </p>
        </li>
      ))}
    </ul>
  );
}

function Section({ title, score, children }) {
  return (
    <section className="card stack">
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {score !== undefined && <Score value={score} />}
      </div>
      {children}
    </section>
  );
}

export default function AnalysisResult({ result, onSeek }) {
  const signals = result.signals || {};
  const longPauses = (signals.silences || []).filter((s) => s.end - s.start >= 0.7);

  return (
    <div className="stack">
      <section className={`card ${styles.overview}`}>
        <div className={`${styles.overall} ${scoreClass(result.overall_score, 100)}`}>
          <span>{result.overall_score}</span>
          <small>de 100</small>
        </div>
        <div className="stack">
          <p className={styles.summary}>{result.summary}</p>
          <p className="muted small">
            Análise por IA com base em {result.frames_analyzed} frames do vídeo e nos sinais medidos de áudio e cortes.
          </p>
        </div>
      </section>

      {result.recommendations?.length > 0 && (
        <Section title="Recomendações prioritárias">
          <ol className={styles.recommendations}>
            {result.recommendations.map((rec, index) => (
              <li key={index}>
                <span className={`badge ${styles[`priority_${rec.priority}`]}`}>{PRIORITY[rec.priority]}</span>
                <span className="muted small">{CATEGORY[rec.category]}</span>
                <p>{rec.text}</p>
              </li>
            ))}
          </ol>
        </Section>
      )}

      <Section title="Hook" score={result.hook.score}>
        <p>{result.hook.assessment}</p>
        <p>
          <strong>Problema identificado:</strong> {result.hook.problem}
        </p>
        <p>
          <strong>Recomendação:</strong> {result.hook.recommendation}
        </p>
      </Section>

      <Section title="Edição" score={result.editing.score}>
        <p>{result.editing.assessment}</p>
        <Findings items={result.editing.findings} onSeek={onSeek} />
      </Section>

      <Section title="Legendas" score={result.captions.score}>
        <p>
          <span className="badge">{result.captions.has_captions ? "Legendas detectadas" : "Sem legendas detectadas"}</span>
        </p>
        <p>{result.captions.assessment}</p>
        {result.captions.recommendations?.length > 0 && (
          <ul className={styles.bullets}>
            {result.captions.recommendations.map((text, index) => (
              <li key={index}>{text}</li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Retenção e engajamento" score={result.retention.score}>
        <p>{result.retention.assessment}</p>
        <Findings items={result.retention.findings} onSeek={onSeek} />
      </Section>

      {result.weak_points?.length > 0 && (
        <Section title="Pontos fracos">
          <ul className={styles.bullets}>
            {result.weak_points.map((text, index) => (
              <li key={index}>{text}</li>
            ))}
          </ul>
        </Section>
      )}

      {result.funnel && result.funnel.stage !== "unknown" && (
        <Section title="Estágio no funil">
          <p>
            <strong>{FUNNEL[result.funnel.stage]}</strong> — {result.funnel.reason}
          </p>
        </Section>
      )}

      <details className="card">
        <summary className={styles.detailsSummary}>Dados medidos no vídeo</summary>
        <dl className={styles.signals}>
          <div>
            <dt>Duração</dt>
            <dd>{formatDuration(signals.duration_seconds)}</dd>
          </div>
          <div>
            <dt>Resolução</dt>
            <dd>{signals.width && signals.height ? `${signals.width}×${signals.height}` : "—"}</dd>
          </div>
          <div>
            <dt>Cortes de cena</dt>
            <dd>{signals.scene_cuts?.length ?? 0}</dd>
          </div>
          <div>
            <dt>Pausas longas</dt>
            <dd>{longPauses.length}</dd>
          </div>
          <div>
            <dt>Volume médio</dt>
            <dd>{signals.mean_volume_db !== null && signals.mean_volume_db !== undefined ? `${signals.mean_volume_db} dB` : "sem áudio"}</dd>
          </div>
        </dl>
        {longPauses.length > 0 && (
          <p className="muted small">
            Pausas:{" "}
            {longPauses.slice(0, 12).map((pause, index) => (
              <button key={index} type="button" className={styles.time} onClick={() => onSeek(pause.start)}>
                {formatTimestamp(pause.start)} ({(pause.end - pause.start).toFixed(1)}s)
              </button>
            ))}
          </p>
        )}
      </details>
    </div>
  );
}

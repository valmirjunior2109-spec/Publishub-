import { formatDuration, formatTimestamp, scoreTone } from "@/lib/format";
import styles from "./AnalysisResult.module.css";

const PRIORITY = { high: "Alta prioridade", medium: "Média prioridade", low: "Baixa prioridade" };
const PRIORITY_TONE = { high: "badge-accent", medium: "", low: "" };
const CATEGORY = { hook: "Hook", editing: "Edição", captions: "Legendas", retention: "Retenção" };
const FUNNEL = {
  top: "Topo do funil",
  middle: "Meio do funil",
  bottom: "Fundo do funil",
};
const FUNNEL_HINT = {
  top: "descoberta e alcance",
  middle: "consideração e educação",
  bottom: "conversão e oferta",
};

function Score({ value, max = 10, size = "md" }) {
  return (
    <span className={`${styles.score} ${styles[`score_${size}`]} ${scoreTone(value, max)}`}>
      {value}
      <small>/{max}</small>
    </span>
  );
}

function TimeButton({ start, end, onSeek }) {
  const range = end !== null && end !== undefined && end - start >= 1 ? ` – ${formatTimestamp(end)}` : "";
  return (
    <button type="button" className={styles.time} onClick={() => onSeek(start)} title="Ver este momento no vídeo">
      {formatTimestamp(start)}
      {range}
    </button>
  );
}

function Findings({ items, onSeek }) {
  if (!items?.length) return null;
  return (
    <ul className={styles.findings}>
      {items.map((item, index) => (
        <li key={index} className={styles.finding}>
          <div className={styles.findingTime}>
            {item.start_seconds !== null && item.start_seconds !== undefined ? (
              <TimeButton start={item.start_seconds} end={item.end_seconds} onSeek={onSeek} />
            ) : (
              <span className={styles.timeGeneral}>Geral</span>
            )}
          </div>
          <div className={styles.findingBody}>
            <p className={styles.problem}>{item.problem}</p>
            <p className={styles.fix}>
              <span className={styles.fixLabel}>O que fazer</span> {item.recommendation}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Section({ title, score, lead, children }) {
  return (
    <section className={`card ${styles.section}`}>
      <div className={styles.sectionHead}>
        <div>
          <h3 className={styles.sectionTitle}>{title}</h3>
          {lead && <p className={styles.sectionLead}>{lead}</p>}
        </div>
        {score !== undefined && <Score value={score} />}
      </div>
      {children}
    </section>
  );
}

/** Dados medidos com ffmpeg. Fica na coluna do vídeo, compacto. */
export function MeasuredSignals({ signals = {}, onSeek }) {
  const longPauses = (signals.silences || []).filter((s) => s.end - s.start >= 0.7);
  const rows = [
    ["Duração", formatDuration(signals.duration_seconds)],
    ["Resolução", signals.width && signals.height ? `${signals.width}×${signals.height}` : "—"],
    ["Cortes de cena", signals.scene_cuts?.length ?? 0],
    ["Pausas longas", longPauses.length],
    ["Volume médio", signals.mean_volume_db !== null && signals.mean_volume_db !== undefined ? `${signals.mean_volume_db} dB` : "sem áudio"],
  ];

  return (
    <details className={`card ${styles.signals}`}>
      <summary className={styles.signalsSummary}>
        <span>Dados medidos no vídeo</span>
        <span className={styles.signalsChevron} aria-hidden="true" />
      </summary>
      <dl className={styles.signalsList}>
        {rows.map(([label, value]) => (
          <div key={label} className={styles.signalRow}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {longPauses.length > 0 && (
        <div className={styles.pauses}>
          <p className="muted small">Pausas de 0,7s ou mais:</p>
          <div className={styles.pauseList}>
            {longPauses.slice(0, 12).map((pause, index) => (
              <button key={index} type="button" className={styles.time} onClick={() => onSeek(pause.start)}>
                {formatTimestamp(pause.start)} · {(pause.end - pause.start).toFixed(1)}s
              </button>
            ))}
          </div>
        </div>
      )}
    </details>
  );
}

export default function AnalysisResult({ result, onSeek }) {
  const recommendations = result.recommendations || [];

  return (
    <div className={styles.result}>
      <section className={`card ${styles.overview}`}>
        <div className={styles.overallBlock}>
          <p className="eyebrow">Nota geral</p>
          <p className={`${styles.overall} ${scoreTone(result.overall_score, 100)}`}>
            {result.overall_score}
            <small>/100</small>
          </p>
        </div>
        <div className={styles.summaryBlock}>
          <p className={styles.summary}>{result.summary}</p>
          <p className="muted small">
            Com base em {result.frames_analyzed} frames do vídeo e nos sinais medidos de áudio e cortes. A IA não ouve a fala —
            avalia o que se vê e o ritmo do que se ouve.
          </p>
        </div>
      </section>

      {recommendations.length > 0 && (
        <section className={styles.block}>
          <div className={styles.blockHead}>
            <p className="eyebrow">O que fazer primeiro</p>
            <h2 className={styles.blockTitle}>Recomendações, na ordem de impacto</h2>
          </div>
          <ol className={styles.recs}>
            {recommendations.map((rec, index) => (
              <li key={index} className={`card ${styles.rec}`}>
                <span className={styles.recIndex}>{String(index + 1).padStart(2, "0")}</span>
                <div className={styles.recBody}>
                  <p className={styles.recText}>{rec.text}</p>
                  <div className={styles.recMeta}>
                    <span className={`badge ${PRIORITY_TONE[rec.priority] || ""}`}>{PRIORITY[rec.priority] || rec.priority}</span>
                    <span className="muted small">{CATEGORY[rec.category] || rec.category}</span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className={styles.block}>
        <div className={styles.blockHead}>
          <p className="eyebrow">Por área</p>
          <h2 className={styles.blockTitle}>Onde o vídeo ganha e onde perde</h2>
        </div>

        <div className={styles.sections}>
          <Section title="Hook" score={result.hook.score} lead="Os primeiros segundos.">
            <p className={styles.assessment}>{result.hook.assessment}</p>
            <div className={styles.pair}>
              <div>
                <p className={styles.pairLabel}>Problema</p>
                <p>{result.hook.problem}</p>
              </div>
              <div>
                <p className={styles.pairLabel}>O que fazer</p>
                <p>{result.hook.recommendation}</p>
              </div>
            </div>
          </Section>

          <Section title="Edição" score={result.editing.score} lead="Cortes, ritmo e pausas.">
            <p className={styles.assessment}>{result.editing.assessment}</p>
            <Findings items={result.editing.findings} onSeek={onSeek} />
          </Section>

          <Section title="Legendas" score={result.captions.score} lead="Texto na tela.">
            <span className={`badge ${result.captions.has_captions ? "badge-completed" : ""}`}>
              {result.captions.has_captions ? "Legendas detectadas" : "Sem legendas detectadas"}
            </span>
            <p className={styles.assessment}>{result.captions.assessment}</p>
            {result.captions.recommendations?.length > 0 && (
              <ul className={styles.bullets}>
                {result.captions.recommendations.map((text, index) => (
                  <li key={index}>{text}</li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Retenção" score={result.retention.score} lead="Onde o público tende a sair.">
            <p className={styles.assessment}>{result.retention.assessment}</p>
            <Findings items={result.retention.findings} onSeek={onSeek} />
          </Section>
        </div>
      </section>

      {(result.weak_points?.length > 0 || (result.funnel && result.funnel.stage !== "unknown")) && (
        <section className={styles.block}>
          <div className={styles.aux}>
            {result.weak_points?.length > 0 && (
              <div className={`card ${styles.section}`}>
                <h3 className={styles.sectionTitle}>Pontos fracos</h3>
                <ul className={styles.bullets}>
                  {result.weak_points.map((text, index) => (
                    <li key={index}>{text}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.funnel && result.funnel.stage !== "unknown" && (
              <div className={`card ${styles.section}`}>
                <h3 className={styles.sectionTitle}>Estágio no funil</h3>
                <p>
                  <span className="badge badge-accent">{FUNNEL[result.funnel.stage]}</span>
                  <span className={`muted small ${styles.funnelHint}`}>{FUNNEL_HINT[result.funnel.stage]}</span>
                </p>
                <p className={styles.assessment}>{result.funnel.reason}</p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

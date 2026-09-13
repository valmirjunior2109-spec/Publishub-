import Link from "next/link";
import ProductPreview from "@/components/ProductPreview";
import styles from "./page.module.css";

const AREAS = [
  {
    title: "Hook",
    text: "Os três primeiros segundos seguram quem chegou? Apontamos o que atrasa a abertura — silêncio, enquadramento parado, promessa que demora.",
  },
  {
    title: "Cortes e ritmo",
    text: "Pausas longas, trechos que se arrastam e momentos que pedem corte, cada um com o tempo exato onde acontece.",
  },
  {
    title: "Legendas",
    text: "Se há texto na tela e se ele funciona: clareza, contraste, posição e quantidade de palavras por vez.",
  },
  {
    title: "Retenção",
    text: "Os pontos em que o espectador tende a sair — repetição visual, áudio baixo, final que não termina.",
  },
];

const STEPS = [
  { title: "Envie o vídeo", text: "MP4, MOV ou WEBM, direto do celular ou do computador. Até 50 MB." },
  { title: "O Publishub analisa", text: "Medimos silêncios, volume e cortes de cena. A IA avalia os frames." },
  { title: "Aplique no seu editor", text: "Você recebe cada problema com o timestamp e o que mudar. Regrava ou corta só o que precisa." },
];

const FAQ = [
  {
    q: "O Publishub edita o vídeo para mim?",
    a: "Não. Ele analisa e recomenda — quem aplica é você, no CapCut, Premiere ou no editor que já usa. A ideia é encurtar a decisão do que mexer, não substituir a edição.",
  },
  {
    q: "Ele entende o que eu falo no vídeo?",
    a: "Ainda não. A análise usa os frames e os sinais medidos no áudio (silêncios, volume, cortes de cena). Por isso ele não comenta o conteúdo da fala — e não inventa o que você disse.",
  },
  {
    q: "Que formatos e tamanhos funcionam?",
    a: "MP4, MOV e WEBM, com até 50 MB e 10 minutos de duração. Vertical ou horizontal, tanto faz.",
  },
  {
    q: "Meus vídeos ficam visíveis para outras pessoas?",
    a: "Não. Cada vídeo fica numa pasta privada ligada à sua conta, e o banco tem regras que impedem qualquer usuário de ler dados de outro.",
  },
];

export default function Home() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <span className={styles.pill}>Copiloto de edição com IA</span>
          <h1 className={styles.title}>Edite vídeos melhores em menos tempo</h1>
          <p className={styles.lead}>
            O Publishub encontra cortes melhores, corrige o ritmo, fortalece o hook e mostra onde seu vídeo perde a
            atenção — antes de você publicar.
          </p>
          <div className={styles.actions}>
            <Link href="/signup" className="btn btn-primary btn-lg">
              Começar agora
            </Link>
            <Link href="/login" className="btn btn-secondary btn-lg">
              Já tenho conta
            </Link>
          </div>
          <p className={styles.note}>Grátis para usar · Não precisa de cartão</p>

          <div className={styles.preview}>
            <ProductPreview />
          </div>
        </div>
      </section>

      <section id="features" className={styles.section}>
        <div className="container">
          <header className={styles.sectionHead}>
            <p className="eyebrow">O que analisamos</p>
            <h2 className={styles.sectionTitle}>Quatro frentes, cada uma com nota e motivo</h2>
            <p className={styles.sectionLead}>Nada de relatório genérico: cada ponto vem com o momento exato e o que fazer.</p>
          </header>
          <div className={styles.areas}>
            {AREAS.map((area) => (
              <article key={area.title} className={styles.areaCard}>
                <h3 className={styles.areaTitle}>{area.title}</h3>
                <p className={styles.areaText}>{area.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className={styles.section}>
        <div className="container">
          <header className={styles.sectionHead}>
            <p className="eyebrow">Como funciona</p>
            <h2 className={styles.sectionTitle}>Do upload à recomendação, sem sair do navegador</h2>
          </header>
          <ol className={styles.steps}>
            {STEPS.map((step, index) => (
              <li key={step.title} className={styles.step}>
                <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.areaText}>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="faq" className={styles.section}>
        <div className="container">
          <header className={styles.sectionHead}>
            <p className="eyebrow">Dúvidas frequentes</p>
            <h2 className={styles.sectionTitle}>Antes de enviar o primeiro vídeo</h2>
          </header>
          <div className={styles.faq}>
            {FAQ.map((item) => (
              <details key={item.q} className={styles.faqItem}>
                <summary className={styles.faqQuestion}>{item.q}</summary>
                <p className={styles.faqAnswer}>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className="container">
          <div className={styles.cta}>
            <h2 className={styles.ctaTitle}>Veja o que dá para melhorar no seu próximo vídeo</h2>
            <p className={styles.sectionLead}>Crie a conta e envie um vídeo para receber a primeira análise.</p>
            <Link href="/signup" className="btn btn-primary btn-lg">
              Começar agora
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

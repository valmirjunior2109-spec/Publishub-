import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowUpRight } from "lucide-react";
import { Emphasis } from "@/components/landing/Emphasis";
import { Reveal } from "@/components/Reveal";
import { TrackedLink } from "@/components/TrackedLink";
import { buttonClasses } from "@/components/ui/Button";
import { FOUNDER, withFounderUtm } from "@/content/founder";
import { SUPPORT_EMAIL } from "@/lib/support";

/* o caminho da foto vem do build (next.config.ts): vazio quando o arquivo ainda não está em /public */
const PHOTO = process.env.FOUNDER_PHOTO || "";

/**
 * Quem está construindo: texto à esquerda, em primeira pessoa, com o perfil e o e-mail; a foto
 * grande à direita, com um arco caramelo atrás. Sem número de seguidores nem métrica nenhuma.
 */
export async function FounderBand() {
  const t = await getTranslations("Landing.founder");
  const links = [
    { key: "instagram", label: t("instagram"), url: FOUNDER.instagram.url, handle: FOUNDER.instagram.handle },
    ...(FOUNDER.x ? [{ key: "x", label: t("x"), url: FOUNDER.x.url, handle: FOUNDER.x.handle }] : []),
  ];

  return (
    <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-20">
      <Reveal>
        <h2 className="t-h2 text-balance">
          <Emphasis text={t("title")} />
        </h2>
        <p className="mt-4 font-mono text-[12px] uppercase tracking-[0.08em] text-ink-muted">
          {FOUNDER.name} · {FOUNDER.role} · {FOUNDER.location}
        </p>
        <p className="mt-5 max-w-[56ch] text-[17px] leading-relaxed text-ink-muted">{t("text")}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          {links.map((link) => (
            <TrackedLink
              key={link.key}
              where={`founder_${link.key}`}
              href={withFounderUtm(link.url)}
              target="_blank"
              rel="noopener noreferrer"
              title={link.handle}
              className={buttonClasses("primary", "lg")}
            >
              {link.label}
              <ArrowUpRight size={17} strokeWidth={2.25} aria-hidden="true" />
            </TrackedLink>
          ))}
        </div>
        <p className="mt-5 text-[14px] text-ink-muted">
          {t("email")}{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-ink underline-offset-2 hover:underline">
            {SUPPORT_EMAIL}
          </a>
        </p>
      </Reveal>
      {PHOTO && (
        <Reveal delay={80} className="relative mx-auto w-full max-w-[440px]">
          {/* o arco caramelo, como um traço de caneta em volta da foto */}
          <span aria-hidden="true" className="absolute -right-3 -top-6 h-[72%] w-[72%] rounded-full border-[14px] border-[var(--stage)] sm:-right-10 sm:-top-10" />
          <span aria-hidden="true" className="absolute -bottom-4 -left-4 h-24 w-24 rounded-bl-[44px] border-b-[14px] border-l-[14px] border-caramel sm:-bottom-6 sm:-left-6" />
          <Image src={PHOTO} alt={t("alt")} width={640} height={640} unoptimized className="relative aspect-square w-full rounded-[32px] border border-line object-cover sm:rounded-[40px]" />
        </Reveal>
      )}
    </div>
  );
}

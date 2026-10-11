import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { TrackedLink } from "@/components/TrackedLink";
import { buttonClasses } from "@/components/ui/Button";
import { FOUNDER, withFounderUtm } from "@/content/founder";
import { SUPPORT_EMAIL } from "@/lib/support";

/* o caminho da foto vem do build (next.config.ts): vazio quando o arquivo ainda não está em /public */
const PHOTO = process.env.FOUNDER_PHOTO || "";

/**
 * Quem está construindo: uma faixa curta, em primeira pessoa, com o perfil e o e-mail.
 * Sem número de seguidores nem métrica nenhuma: só quem é e onde encontrar.
 */
export async function FounderBand() {
  const t = await getTranslations("Landing.founder");
  const links = [
    { key: "instagram", label: t("instagram"), url: FOUNDER.instagram.url, handle: FOUNDER.instagram.handle },
    ...(FOUNDER.x ? [{ key: "x", label: t("x"), url: FOUNDER.x.url, handle: FOUNDER.x.handle }] : []),
  ];

  return (
    <Reveal className="grid gap-6 rounded-2xl border border-line bg-paper-raised p-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-8 sm:p-10">
      {PHOTO && (
        <Image src={PHOTO} alt={t("alt")} width={96} height={96} className="h-20 w-20 rounded-full border border-line object-cover sm:h-24 sm:w-24" />
      )}
      <div className="min-w-0">
        <h2 className="t-h3 text-balance">{t("title")}</h2>
        <p className="mt-2 font-mono text-[12px] uppercase tracking-[0.08em] text-ink-muted">
          {FOUNDER.name} · {FOUNDER.role} · {FOUNDER.location}
        </p>
        <p className="mt-4 max-w-[62ch] text-[16px] leading-relaxed">{t("text")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {links.map((link) => (
            <TrackedLink
              key={link.key}
              where={`founder_${link.key}`}
              href={withFounderUtm(link.url)}
              target="_blank"
              rel="noopener noreferrer"
              title={link.handle}
              className={buttonClasses("secondary", "md", "min-h-11")}
            >
              {link.label}
              <ArrowUpRight size={15} strokeWidth={2.25} aria-hidden="true" />
            </TrackedLink>
          ))}
        </div>
        <p className="mt-5 text-[14px] text-ink-muted">
          {t("email")}{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-ink underline-offset-2 hover:underline">
            {SUPPORT_EMAIL}
          </a>
        </p>
      </div>
    </Reveal>
  );
}
